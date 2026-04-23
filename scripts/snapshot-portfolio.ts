/**
 * 温度連動ポートフォリオの日次 append スクリプト。
 *
 * 既存の portfolio-history.json を読み、最終日の翌日から今日までの価格・スコアを
 * simulatePortfolio の差分モードで追記する。毎営業日 GH Action から実行する想定。
 *
 * 実行: npx tsx scripts/snapshot-portfolio.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";
import {
  DEFAULT_PORTFOLIO_RULE,
  simulatePortfolio,
  type DailyPoint,
  type PortfolioStats,
  type SimulatorStartState,
  type TradeLog,
} from "./_lib/portfolio-sim";
import {
  estimateFearGreedFromVix,
  fetchDailyCloses,
  sleep,
} from "./_lib/shared";
import { getSentimentLevel } from "../src/lib/sentiment";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface CashYieldScenarioJson {
  cashYield: number;
  label: string;
  stats: PortfolioStats;
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
  };
  endState: SimulatorStartState;
  /** 現金金利の感度分析。日次 append ではそのまま保持する（月次フル再生成で更新） */
  cashYieldSensitivity?: CashYieldScenarioJson[];
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

async function appendSection(
  section: PortfolioSectionJson,
  newPriceMap: Map<string, number>,
  scoreOf: (date: string) => number | null,
  initialNav: number
): Promise<PortfolioSectionJson> {
  const lastDate = section.daily[section.daily.length - 1].date;
  const newDates = [...newPriceMap.keys()]
    .sort()
    .filter((d) => d > lastDate);
  if (newDates.length === 0) {
    return section;
  }

  const result = simulatePortfolio({
    priceMap: newPriceMap,
    priceDates: newDates,
    scoreOf,
    rule: DEFAULT_PORTFOLIO_RULE,
    startState: section.endState,
  });

  const mergedDaily = [...section.daily, ...result.daily];
  const mergedTrades = [...section.trades, ...result.trades];

  // stats は先頭からの累積で再計算
  // daily[0].nav と initialNav は必ずしも一致しないが、バックフィルの初日から
  // 続いた結果なので、元の base = initialNav でそのまま計算する
  const { computeStats } = await import("./_lib/portfolio-sim");
  const stats = computeStats(mergedDaily, initialNav);

  const last = mergedDaily[mergedDaily.length - 1];
  const latestScore = last.score;
  const band =
    latestScore != null ? getSentimentLevel(latestScore) : section.current.band;

  return {
    ...section,
    daily: mergedDaily,
    trades: mergedTrades,
    stats,
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
  const jsonPath = resolve(__dirname, "../src/data/portfolio-history.json");
  if (!existsSync(jsonPath)) {
    console.log(
      "portfolio-history.json が存在しないため、generate-portfolio-history を代わりに実行します"
    );
    const res = spawnSync(
      "npx",
      ["tsx", "scripts/generate-portfolio-history.ts"],
      {
        stdio: "inherit",
        cwd: resolve(__dirname, ".."),
      }
    );
    process.exit(res.status ?? 0);
    return;
  }

  const existing = JSON.parse(
    readFileSync(jsonPath, "utf-8")
  ) as PortfolioHistoryJson;

  const lastJp = existing.portfolios.jp.daily.at(-1)!.date;
  const lastUs = existing.portfolios.us.daily.at(-1)!.date;
  // フェッチ期間: 既存最終日から 14 日戻し（週末・祝日の取りこぼし対策）
  const pastBuffer = (d: string) => {
    const t = new Date(d);
    t.setDate(t.getDate() - 14);
    return t.toISOString().split("T")[0];
  };
  const p1Jp = pastBuffer(lastJp);
  const p1Us = pastBuffer(lastUs);
  const p2 = new Date().toISOString().split("T")[0];

  console.log(`JP 既存最終日: ${lastJp} / US 既存最終日: ${lastUs}`);

  console.log("取得中: ^N225...");
  const n225 = await fetchDailyCloses(yahooFinance, "^N225", p1Jp, p2);
  await sleep(1500);
  console.log("取得中: ^GSPC...");
  const gspc = await fetchDailyCloses(yahooFinance, "^GSPC", p1Us, p2);
  await sleep(1500);
  console.log("取得中: ^VIX...");
  const vix = await fetchDailyCloses(yahooFinance, "^VIX", p1Us, p2);

  // 日本温度履歴から新しい日付のスコアを取得
  const jpHistoryPath = resolve(
    __dirname,
    "../src/data/japan-temperature-history.json"
  );
  const jpHistory = JSON.parse(readFileSync(jpHistoryPath, "utf-8")) as {
    daily: Array<{ date: string; score: number }>;
  };
  const jpScoreMap = new Map<string, number>();
  for (const p of jpHistory.daily) jpScoreMap.set(p.date, p.score);

  const initialNav = existing.rule.initialNav;

  const jpUpdated = await appendSection(
    existing.portfolios.jp,
    n225,
    (d) => jpScoreMap.get(d) ?? null,
    initialNav
  );
  const usUpdated = await appendSection(
    existing.portfolios.us,
    gspc,
    (d) => {
      const v = vix.get(d);
      return v != null ? estimateFearGreedFromVix(v) : null;
    },
    initialNav
  );

  const newLastJp = jpUpdated.daily.at(-1)!.date;
  const newLastUs = usUpdated.daily.at(-1)!.date;
  const changed = newLastJp !== lastJp || newLastUs !== lastUs;

  if (!changed) {
    console.log("変更なし。JSON は更新しません。");
    return;
  }

  const output: PortfolioHistoryJson = {
    ...existing,
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: existing.dataRange.from,
      to: p2,
    },
    portfolios: {
      jp: jpUpdated,
      us: usUpdated,
    },
  };

  writeFileSync(jsonPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `✅ 追記: JP ${lastJp} → ${newLastJp} / US ${lastUs} → ${newLastUs}`
  );
  console.log(
    `   JP stats totalReturn=${jpUpdated.stats.totalReturn}% / US totalReturn=${usUpdated.stats.totalReturn}%`
  );
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
