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
  type DailyPoint,
  type PortfolioStats,
  type TradeLog,
} from "./_lib/portfolio-sim";
import { estimateFearGreedFromVix, fetchDailyCloses, sleep } from "./_lib/shared";
import { getSentimentLevel } from "../src/lib/sentiment";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 日本温度履歴の起点に合わせる（C1 に 125 日 MA が必要なため）
const START_DATE = "2016-04-22";

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
  };
  endState: {
    equityUnits: number;
    cash: number;
    benchmarkUnits: number;
    lastEquityRatio: number;
  };
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
    },
    endState: result.endState,
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
    `   totalReturn=${jpSection.stats.totalReturn}% / benchmark=${jpSection.stats.benchmarkReturn}% / alpha=${jpSection.stats.alpha}pp`
  );
  console.log(
    `   cagr=${jpSection.stats.cagr}% / maxDD=${jpSection.stats.maxDrawdown}% / sharpe=${jpSection.stats.sharpe}`
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
    `   totalReturn=${usSection.stats.totalReturn}% / benchmark=${usSection.stats.benchmarkReturn}% / alpha=${usSection.stats.alpha}pp`
  );
  console.log(
    `   cagr=${usSection.stats.cagr}% / maxDD=${usSection.stats.maxDrawdown}% / sharpe=${usSection.stats.sharpe}`
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
