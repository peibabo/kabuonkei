/**
 * 温度連動バーチャルポートフォリオの過去10年バックテストを生成するスクリプト。
 *
 * - 日本: ^N225 + 現金（日本版温度スコア = C1+C5 で駆動）
 * - 米国: ^GSPC + 現金（VIX → estimateFearGreedFromVix で駆動）
 * - 月次リバランス（各月の第一営業日）
 * - 現金金利 / 手数料 / 税金は 0（記事で明記）
 *
 * 出力: src/data/portfolio-history.json
 * 実行: npx tsx scripts/generate-portfolio-history.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  DEFAULT_PORTFOLIO_RULE,
  simulatePortfolio,
  type BandRule,
  type DailyPoint,
  type PortfolioRule,
  type PortfolioStats,
  type TradeLog,
} from "./_lib/portfolio-sim";
import type { SentimentLevel } from "../src/lib/types";
import { estimateFearGreedFromVix, fetchDailyCloses, sleep } from "./_lib/shared";
import { getSentimentLevel } from "../src/lib/sentiment";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 日本温度履歴の起点に合わせる（C1 に 125 日 MA が必要なため）
const START_DATE = "2016-04-22";

interface CashYieldScenarioJson {
  /** 年率現金金利（%） */
  cashYield: number;
  /** ラベル（"現金 0%" / "MMF 1%" / "短期金利 3%" 等） */
  label: string;
  stats: PortfolioStats;
}

interface TemperatureContributionJson {
  avgEquityRatio: number;
  constantStats: PortfolioStats;
  alphaVsConstant: number;
  ddVsConstant: number;
  sharpeVsConstant: number;
}

interface PortfolioSectionJson {
  equitySymbol: string;
  displayName: string;
  daily: DailyPoint[];
  trades: TradeLog[];
  stats: PortfolioStats;
  current: {
    date: string;
    score: number | null;
    band: string;
    equityRatio: number;
    cashRatio: number;
    nav: number;
    benchmark: number;
    benchmarkDca: number;
  };
  endState: {
    equityUnits: number;
    cash: number;
    benchmarkUnits: number;
    lastEquityRatio: number;
    dcaUnits?: number;
    dcaCash?: number;
    dcaMonthlyContribution?: number;
    dcaRemainingContributions?: number;
  };
  /**
   * 現金金利の感度分析（0% / 1% / 3% の 3 シナリオ）。
   * モデルは本体 stats と同じ現金金利 = 0 前提で動くが、感度表で
   * 「MMF / 短期金利を仮定するとどれくらい改善するか」を併記する。
   */
  cashYieldSensitivity: CashYieldScenarioJson[];
  /**
   * 温度信号の純寄与度: 同じ平均株比率の定数配分と比較することで、
   * α vs DCA のうち「温度 timing に依る部分」と「単に高配分な部分」を分離する。
   */
  temperatureContribution: TemperatureContributionJson;
}

interface PortfolioHistoryJson {
  generatedAt: string;
  dataRange: { from: string; to: string };
  rule: {
    bands: Array<{
      level: string;
      scoreRange: [number, number];
      equityRatio: number;
    }>;
    rebalance: string;
    cashYield: number;
    fees: number;
    initialNav: number;
  };
  portfolios: {
    jp: PortfolioSectionJson;
    us: PortfolioSectionJson;
  };
}

const CASH_YIELD_SCENARIOS: Array<{ yield: number; label: string }> = [
  { yield: 0, label: "現金 0%（本体モデル）" },
  { yield: 0.01, label: "MMF 相当 1%" },
  { yield: 0.03, label: "短期金利 3%" },
];

/** 全バンドを同じ株比率にした「定数配分」ルール */
function makeConstantRule(ratio: number): PortfolioRule {
  const levels: SentimentLevel[] = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
  const bands: BandRule[] = levels.map((level, i) => ({
    level,
    scoreRange: [
      i === 0 ? 0 : i * 20 + 1,
      i === 4 ? 100 : (i + 1) * 20,
    ] as [number, number],
    equityRatio: ratio,
  }));
  return { ...DEFAULT_PORTFOLIO_RULE, bands };
}

function buildSection(
  equitySymbol: string,
  displayName: string,
  priceMap: Map<string, number>,
  scoreOf: (date: string) => number | null
): PortfolioSectionJson {
  const priceDates = [...priceMap.keys()].sort();
  const filteredDates = priceDates.filter((d) => d >= START_DATE);
  if (filteredDates.length === 0) {
    throw new Error(`${equitySymbol}: START_DATE 以降の価格データがありません`);
  }

  const result = simulatePortfolio({
    priceMap,
    priceDates: filteredDates,
    scoreOf,
    rule: DEFAULT_PORTFOLIO_RULE,
    startDate: filteredDates[0],
  });

  // 感度分析: 同じルールで現金金利だけを差し替えて 3 シナリオを計算
  const cashYieldSensitivity: CashYieldScenarioJson[] = CASH_YIELD_SCENARIOS.map(
    (s) => {
      const scenarioResult = simulatePortfolio({
        priceMap,
        priceDates: filteredDates,
        scoreOf,
        rule: { ...DEFAULT_PORTFOLIO_RULE, cashYield: s.yield },
        startDate: filteredDates[0],
      });
      return {
        cashYield: s.yield,
        label: s.label,
        stats: scenarioResult.stats,
      };
    }
  );

  // 温度信号の純寄与度: 温度ルールの実現平均株比率を定数として持ち続けた場合と比較する
  const avgEquityRatio =
    result.daily.reduce((s, d) => s + d.equityRatio, 0) / result.daily.length;
  const constantResult = simulatePortfolio({
    priceMap,
    priceDates: filteredDates,
    scoreOf,
    rule: makeConstantRule(avgEquityRatio),
    startDate: filteredDates[0],
  });
  const temperatureContribution: TemperatureContributionJson = {
    avgEquityRatio: Math.round(avgEquityRatio * 10000) / 10000,
    constantStats: constantResult.stats,
    alphaVsConstant:
      Math.round((result.stats.totalReturn - constantResult.stats.totalReturn) * 100) / 100,
    ddVsConstant:
      Math.round((result.stats.maxDrawdown - constantResult.stats.maxDrawdown) * 100) / 100,
    sharpeVsConstant:
      Math.round((result.stats.sharpe - constantResult.stats.sharpe) * 100) / 100,
  };

  const last = result.daily[result.daily.length - 1];
  const latestScore = last.score;
  const band = latestScore != null ? getSentimentLevel(latestScore) : "—";
  return {
    equitySymbol,
    displayName,
    daily: result.daily,
    trades: result.trades,
    stats: result.stats,
    current: {
      date: last.date,
      score: latestScore,
      band,
      equityRatio: last.equityRatio,
      cashRatio: Math.round((1 - last.equityRatio) * 10000) / 10000,
      nav: last.nav,
      benchmark: last.benchmark,
      benchmarkDca: last.benchmarkDca,
    },
    endState: result.endState,
    cashYieldSensitivity,
    temperatureContribution,
  };
}

async function main() {
  const endDate = new Date();
  const period1 = "2015-10-01"; // C1/MA 計算用に少し前から取る（履歴 JSON 側で補完）
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得: ${period1} 〜 ${period2}`);

  console.log("取得中: ^N225...");
  const n225 = await fetchDailyCloses(yahooFinance, "^N225", period1, period2);
  console.log(`  → ${n225.size} 日分`);
  await sleep(1500);

  console.log("取得中: ^GSPC...");
  const gspc = await fetchDailyCloses(yahooFinance, "^GSPC", period1, period2);
  console.log(`  → ${gspc.size} 日分`);
  await sleep(1500);

  console.log("取得中: ^VIX...");
  const vix = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);
  console.log(`  → ${vix.size} 日分`);

  // 日本温度履歴 JSON（既存、10 年分 C1+C5 スコア）
  const jpHistoryPath = resolve(
    __dirname,
    "../src/data/japan-temperature-history.json"
  );
  const jpHistoryRaw = JSON.parse(readFileSync(jpHistoryPath, "utf-8")) as {
    daily: Array<{ date: string; score: number }>;
  };
  const jpScoreMap = new Map<string, number>();
  for (const p of jpHistoryRaw.daily) jpScoreMap.set(p.date, p.score);

  // 日本版ポートフォリオ: ^N225 + 日本温度
  const jpSection = buildSection(
    "^N225",
    "日経225 + 現金（日本温度ルール）",
    n225,
    (d) => jpScoreMap.get(d) ?? null
  );
  console.log(`✓ JP: ${jpSection.daily.length} 日, trades=${jpSection.trades.length}`);
  console.log(
    `   totalReturn=${jpSection.stats.totalReturn}% / bench(lump)=${jpSection.stats.benchmarkReturn}% / bench(DCA)=${jpSection.stats.dcaReturn}% / α vs lump=${jpSection.stats.alpha}pp / α vs DCA=${jpSection.stats.alphaVsDca}pp`
  );
  console.log(
    `   cagr=${jpSection.stats.cagr}% / maxDD=${jpSection.stats.maxDrawdown}% (lump ${jpSection.stats.benchmarkMaxDrawdown}% / DCA ${jpSection.stats.dcaMaxDrawdown}%) / sharpe=${jpSection.stats.sharpe}`
  );

  // 米国版ポートフォリオ: ^GSPC + VIX推定スコア
  const usSection = buildSection(
    "^GSPC",
    "S&P500 + 現金（米国温度ルール）",
    gspc,
    (d) => {
      const v = vix.get(d);
      return v != null ? estimateFearGreedFromVix(v) : null;
    }
  );
  console.log(`✓ US: ${usSection.daily.length} 日, trades=${usSection.trades.length}`);
  console.log(
    `   totalReturn=${usSection.stats.totalReturn}% / bench(lump)=${usSection.stats.benchmarkReturn}% / bench(DCA)=${usSection.stats.dcaReturn}% / α vs lump=${usSection.stats.alpha}pp / α vs DCA=${usSection.stats.alphaVsDca}pp`
  );
  console.log(
    `   cagr=${usSection.stats.cagr}% / maxDD=${usSection.stats.maxDrawdown}% (lump ${usSection.stats.benchmarkMaxDrawdown}% / DCA ${usSection.stats.dcaMaxDrawdown}%) / sharpe=${usSection.stats.sharpe}`
  );

  const output: PortfolioHistoryJson = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: START_DATE,
      to: period2,
    },
    rule: {
      bands: DEFAULT_PORTFOLIO_RULE.bands.map((b) => ({
        level: b.level,
        scoreRange: b.scoreRange,
        equityRatio: b.equityRatio,
      })),
      rebalance: DEFAULT_PORTFOLIO_RULE.rebalance,
      cashYield: DEFAULT_PORTFOLIO_RULE.cashYield,
      fees: DEFAULT_PORTFOLIO_RULE.fees,
      initialNav: DEFAULT_PORTFOLIO_RULE.initialNav,
    },
    portfolios: {
      jp: jpSection,
      us: usSection,
    },
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "portfolio-history.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`\n✅ 生成完了: ${outPath}`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
