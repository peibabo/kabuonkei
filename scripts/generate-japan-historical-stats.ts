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

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const YEARS_BACK = 10;
const MA_WINDOW = 125;
const MOMENTUM_WINDOW = 50;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
const SENTIMENT_RANGES: Array<{
  level: string;
  scoreRange: [number, number];
}> = [
  { level: "極寒", scoreRange: [0, 20] },
  { level: "冷え込み", scoreRange: [21, 40] },
  { level: "平温", scoreRange: [41, 60] },
  { level: "過熱", scoreRange: [61, 80] },
  { level: "沸騰", scoreRange: [81, 100] },
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function getSentimentLevel(
  score: number
): "極寒" | "冷え込み" | "平温" | "過熱" | "沸騰" {
  if (score <= 20) return "極寒";
  if (score <= 40) return "冷え込み";
  if (score <= 60) return "平温";
  if (score <= 80) return "過熱";
  return "沸騰";
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

async function fetchDailyCloses(
  symbol: string,
  period1: string,
  period2: string
): Promise<Map<string, number>> {
  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  });
  const map = new Map<string, number>();
  for (const q of result.quotes) {
    if (q.close != null) {
      const dateStr = new Date(q.date).toISOString().split("T")[0];
      map.set(dateStr, q.close);
    }
  }
  return map;
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  console.log("取得中: ^N225...");
  const nikkeiMap = await fetchDailyCloses("^N225", period1, period2);
  console.log(`  → ${nikkeiMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: USDJPY=X...");
  const usdJpyMap = await fetchDailyCloses("USDJPY=X", period1, period2);
  console.log(`  → ${usdJpyMap.size} 日分取得`);

  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const usdJpyDates = [...usdJpyMap.keys()].sort();

  function findForwardPrice(
    dateMap: Map<string, number>,
    sortedDates: string[],
    fromDate: string,
    calendarDays: number
  ): number | null {
    const target = new Date(fromDate);
    target.setDate(target.getDate() + calendarDays);
    const targetStr = target.toISOString().split("T")[0];
    for (let i = 0; i < sortedDates.length; i++) {
      if (sortedDates[i] >= targetStr) {
        const diff =
          (new Date(sortedDates[i]).getTime() - target.getTime()) /
          (1000 * 60 * 60 * 24);
        if (diff <= 7) {
          return dateMap.get(sortedDates[i]) ?? null;
        }
        return null;
      }
    }
    return null;
  }

  type PeriodKey = "1m" | "3m" | "6m";
  const levelReturns: Record<
    string,
    {
      occurrences: number;
      nikkei: Record<PeriodKey, number[]>;
    }
  > = {};

  for (const { level } of SENTIMENT_RANGES) {
    levelReturns[level] = {
      occurrences: 0,
      nikkei: { "1m": [], "3m": [], "6m": [] },
    };
  }

  // 各日について、MA・モメンタム算出可能な範囲でスコア計算
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

    // 利用可能な要素で平均
    const scores = [c1];
    if (c5 != null) scores.push(c5);
    if (scores.length === 0) continue;
    const score = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    const level = getSentimentLevel(score);
    const entry = levelReturns[level];
    entry.occurrences++;

    for (const [period, days] of Object.entries(FORWARD_DAYS) as [
      PeriodKey,
      number,
    ][]) {
      const futurePrice = findForwardPrice(
        nikkeiMap,
        nikkeiDates,
        date,
        days
      );
      if (futurePrice != null) {
        const ret = ((futurePrice - nikkeiPrice) / nikkeiPrice) * 100;
        entry.nikkei[period].push(ret);
      }
    }
  }

  function buildPeriodStats(returns: number[]) {
    if (returns.length === 0) {
      return { avgReturn: 0, medianReturn: 0, winRate: 0, sampleSize: 0 };
    }
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const wins = returns.filter((r) => r > 0).length;
    return {
      avgReturn: round1(avg),
      medianReturn: round1(median(returns)),
      winRate: round1((wins / returns.length) * 100),
      sampleSize: returns.length,
    };
  }

  const levels = SENTIMENT_RANGES.map(({ level, scoreRange }) => {
    const entry = levelReturns[level];
    return {
      level,
      scoreRange,
      occurrences: entry.occurrences,
      nikkei225: {
        "1m": buildPeriodStats(entry.nikkei["1m"]),
        "3m": buildPeriodStats(entry.nikkei["3m"]),
        "6m": buildPeriodStats(entry.nikkei["6m"]),
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
