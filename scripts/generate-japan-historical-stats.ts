/**
 * 日本版市場温度の過去統計データ生成スクリプト
 *
 * ^N225 と USDJPY=X の過去10年分データから C1（日経225 vs 125日MA）と
 * C5（USDJPY 50日モメンタム）の2要素簡易版スコアを算出し、
 * 各温度帯での日経225の将来リターンを集計する。
 *
 * （C2/C3/C4 の過去データが存在しないため、簡易版で計算）
 *
 * 実行: npx tsx scripts/generate-japan-historical-stats.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  normalizeNikkeiMaDeviation,
  normalizeUsdJpyMomentum,
} from "../src/lib/japan-fear-greed";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  fetchDailyCloses,
  sleep,
} from "./_lib/shared";
import { aggregateLevelReturns } from "./_lib/stats-aggregator";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const YEARS_BACK = 10;
const MA_WINDOW = 125;
const MOMENTUM_WINDOW = 50;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  console.log("取得中: ^N225...");
  const nikkeiMap = await fetchDailyCloses(
    yahooFinance,
    "^N225",
    period1,
    period2
  );
  console.log(`  → ${nikkeiMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: USDJPY=X...");
  const usdJpyMap = await fetchDailyCloses(
    yahooFinance,
    "USDJPY=X",
    period1,
    period2
  );
  console.log(`  → ${usdJpyMap.size} 日分取得`);

  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const usdJpyDates = [...usdJpyMap.keys()].sort();

  // 各対象日のスコアを事前計算（MA・モメンタム算出可能な範囲）
  const scoreMap = new Map<string, number>();
  for (let i = MA_WINDOW; i < nikkeiDates.length; i++) {
    const date = nikkeiDates[i];
    const nikkeiPrice = nikkeiMap.get(date);
    if (nikkeiPrice == null) continue;

    // 125日MA
    const maWindow = nikkeiDates
      .slice(i - MA_WINDOW, i)
      .map((d) => nikkeiMap.get(d))
      .filter((v): v is number => v != null);
    if (maWindow.length < MA_WINDOW) continue;
    const ma125 = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;
    const c1 = normalizeNikkeiMaDeviation(nikkeiPrice, ma125);

    // USDJPY 50日モメンタム（同日のUSDJPYと50営業日前のUSDJPY）
    const usdJpyIdx = usdJpyDates.indexOf(date);
    let c5: number | null = null;
    if (usdJpyIdx >= MOMENTUM_WINDOW) {
      const currentUsdJpy = usdJpyMap.get(date);
      const pastDate = usdJpyDates[usdJpyIdx - MOMENTUM_WINDOW];
      const pastUsdJpy = usdJpyMap.get(pastDate);
      if (currentUsdJpy != null && pastUsdJpy != null) {
        c5 = normalizeUsdJpyMomentum(currentUsdJpy, pastUsdJpy);
      }
    }

    const scores = [c1];
    if (c5 != null) scores.push(c5);
    const score = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    scoreMap.set(date, score);
  }

  type PeriodKey = "1m" | "3m" | "6m";
  const aggregated = aggregateLevelReturns<PeriodKey>({
    dates: nikkeiDates.slice(MA_WINDOW),
    scoreOf: (date) => scoreMap.get(date) ?? null,
    priceMap: nikkeiMap,
    priceDates: nikkeiDates,
    forwardDays: FORWARD_DAYS,
  });

  const levels = SENTIMENT_RANGES.map(({ level, scoreRange }) => {
    const entry = aggregated[level];
    return {
      level,
      scoreRange,
      occurrences: entry.occurrences,
      nikkei225: {
        "1m": buildPeriodStats(entry.returns["1m"]),
        "3m": buildPeriodStats(entry.returns["3m"]),
        "6m": buildPeriodStats(entry.returns["6m"]),
      },
    };
  });

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    note:
      "C1(日経225 vs 125日MA)とC5(USDJPY 50日モメンタム)の2要素簡易版スコアによる過去統計。" +
      "本体スコア(5要素)の過去データはC2/C3/C4が未整備のため再現不可。",
    levels,
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "japan-historical-stats.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log("\n--- 集計結果サマリー ---");
  for (const l of levels) {
    console.log(
      `${l.level}（${l.scoreRange[0]}-${l.scoreRange[1]}）: ${l.occurrences}日`
    );
    console.log(
      `  日経225 3ヶ月後: 平均${l.nikkei225["3m"].avgReturn > 0 ? "+" : ""}${l.nikkei225["3m"].avgReturn}%, 勝率${l.nikkei225["3m"].winRate}% (n=${l.nikkei225["3m"].sampleSize})`
    );
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
