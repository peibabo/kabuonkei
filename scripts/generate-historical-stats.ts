/**
 * 過去統計データ生成スクリプト
 *
 * VIXの過去10年分データから温度帯を算出し、
 * 各温度帯での日経225・S&P500の将来リターンを集計する。
 *
 * 実行: npx tsx scripts/generate-historical-stats.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const YEARS_BACK = 10;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
const SENTIMENT_RANGES: Array<{
  level: string;
  scoreRange: [number, number];
}> = [
  { level: "極寒", scoreRange: [0, 20] },
  { level: "冷え込み", scoreRange: [21, 40] },
  { level: "平温", scoreRange: [41, 60] },
  { level: "加熱", scoreRange: [61, 80] },
  { level: "沸騰", scoreRange: [81, 100] },
];

// --- ユーティリティ ---
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** VIXからFear & Greedスコアを推定（market-data.tsと同じロジック） */
function estimateFearGreedFromVix(vix: number): number {
  const score = Math.round(100 - ((vix - 10) / 30) * 100);
  return Math.max(0, Math.min(100, score));
}

function getSentimentLevel(
  score: number
): "極寒" | "冷え込み" | "平温" | "加熱" | "沸騰" {
  if (score <= 20) return "極寒";
  if (score <= 40) return "冷え込み";
  if (score <= 60) return "平温";
  if (score <= 80) return "加熱";
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

// --- メイン ---
async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  // 3シンボルの日足データを取得
  const symbols = [
    { symbol: "^VIX", key: "vix" },
    { symbol: "^N225", key: "nikkei" },
    { symbol: "^GSPC", key: "sp500" },
  ];

  const rawData: Record<string, Map<string, number>> = {};

  for (const { symbol, key } of symbols) {
    console.log(`取得中: ${symbol}...`);
    try {
      const result = await yahooFinance.chart(symbol, {
        period1,
        period2,
        interval: "1d",
      });

      const dateMap = new Map<string, number>();
      for (const q of result.quotes) {
        if (q.close != null) {
          const dateStr = new Date(q.date).toISOString().split("T")[0];
          dateMap.set(dateStr, q.close);
        }
      }
      rawData[key] = dateMap;
      console.log(`  → ${dateMap.size} 日分取得`);
    } catch (err) {
      console.error(`  → エラー: ${err}`);
      process.exit(1);
    }
    await sleep(2000);
  }

  // 日付で内部結合（3つ全てデータがある日のみ）
  const vixMap = rawData["vix"];
  const nikkeiMap = rawData["nikkei"];
  const sp500Map = rawData["sp500"];

  const allDates = [...vixMap.keys()]
    .filter((d) => nikkeiMap.has(d) && sp500Map.has(d))
    .sort();

  console.log(`\n内部結合後: ${allDates.length} 取引日`);

  // 日付インデックスを作成（将来リターン計算用）
  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const sp500Dates = [...sp500Map.keys()].sort();

  /** 指定日からN日後の最も近い取引日の値を返す */
  function findForwardPrice(
    dateMap: Map<string, number>,
    sortedDates: string[],
    fromDate: string,
    calendarDays: number
  ): number | null {
    const from = new Date(fromDate);
    const target = new Date(from);
    target.setDate(target.getDate() + calendarDays);
    const targetStr = target.toISOString().split("T")[0];

    // targetStr以降で最も近い取引日を探す
    // 5営業日以内に見つからなければnull
    for (let i = 0; i < sortedDates.length; i++) {
      if (sortedDates[i] >= targetStr) {
        // 7日以内の取引日のみ許容
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

  // 各温度帯のリターンを集計
  type PeriodKey = "1m" | "3m" | "6m";
  const levelReturns: Record<
    string,
    {
      occurrences: number;
      nikkei: Record<PeriodKey, number[]>;
      sp500: Record<PeriodKey, number[]>;
    }
  > = {};

  for (const { level } of SENTIMENT_RANGES) {
    levelReturns[level] = {
      occurrences: 0,
      nikkei: { "1m": [], "3m": [], "6m": [] },
      sp500: { "1m": [], "3m": [], "6m": [] },
    };
  }

  for (const date of allDates) {
    const vix = vixMap.get(date)!;
    const score = estimateFearGreedFromVix(vix);
    const level = getSentimentLevel(score);
    const entry = levelReturns[level];
    entry.occurrences++;

    const nikkeiPrice = nikkeiMap.get(date)!;
    const sp500Price = sp500Map.get(date)!;

    for (const [period, days] of Object.entries(FORWARD_DAYS) as [
      PeriodKey,
      number,
    ][]) {
      const futureNikkei = findForwardPrice(
        nikkeiMap,
        nikkeiDates,
        date,
        days
      );
      if (futureNikkei != null) {
        const ret = ((futureNikkei - nikkeiPrice) / nikkeiPrice) * 100;
        entry.nikkei[period].push(ret);
      }

      const futureSp500 = findForwardPrice(sp500Map, sp500Dates, date, days);
      if (futureSp500 != null) {
        const ret = ((futureSp500 - sp500Price) / sp500Price) * 100;
        entry.sp500[period].push(ret);
      }
    }
  }

  // 集計結果をJSON構造に変換
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
      sp500: {
        "1m": buildPeriodStats(entry.sp500["1m"]),
        "3m": buildPeriodStats(entry.sp500["3m"]),
        "6m": buildPeriodStats(entry.sp500["6m"]),
      },
    };
  });

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    levels,
  };

  // 出力
  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "historical-stats.json");
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
    console.log(
      `  S&P500 3ヶ月後: 平均${l.sp500["3m"].avgReturn > 0 ? "+" : ""}${l.sp500["3m"].avgReturn}%, 勝率${l.sp500["3m"].winRate}% (n=${l.sp500["3m"].sampleSize})`
    );
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
