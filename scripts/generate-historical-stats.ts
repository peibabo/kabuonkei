/**
 * 過去統計データ生成スクリプト
 *
 * VIXの過去10年分データから温度帯を算出し、
 * 各温度帯での S&P500 の将来リターンを集計する。
 *
 * 実行: npx tsx scripts/generate-historical-stats.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  estimateFearGreedFromVix,
  sleep,
} from "./_lib/shared";
import { aggregateLevelReturns } from "./_lib/stats-aggregator";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const YEARS_BACK = 10;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;

// --- メイン ---
async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  // 2シンボルの日足データを取得（VIX + S&P500）
  const symbols = [
    { symbol: "^VIX", key: "vix" },
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

  // 日付で内部結合（VIX と S&P500 の両方にデータがある日のみ）
  const vixMap = rawData["vix"];
  const sp500Map = rawData["sp500"];

  const allDates = [...vixMap.keys()].filter((d) => sp500Map.has(d)).sort();

  console.log(`\n内部結合後: ${allDates.length} 取引日`);

  // 日付インデックスを作成（将来リターン計算用）
  const sp500Dates = [...sp500Map.keys()].sort();

  type PeriodKey = "1m" | "3m" | "6m";
  const aggregated = aggregateLevelReturns<PeriodKey>({
    dates: allDates,
    scoreOf: (date) => {
      const vix = vixMap.get(date);
      return vix != null ? estimateFearGreedFromVix(vix) : null;
    },
    priceMap: sp500Map,
    priceDates: sp500Dates,
    forwardDays: FORWARD_DAYS,
  });

  // 集計結果をJSON構造に変換
  const levels = SENTIMENT_RANGES.map(({ level, scoreRange }) => {
    const entry = aggregated[level];
    return {
      level,
      scoreRange,
      occurrences: entry.occurrences,
      sp500: {
        "1m": buildPeriodStats(entry.returns["1m"]),
        "3m": buildPeriodStats(entry.returns["3m"]),
        "6m": buildPeriodStats(entry.returns["6m"]),
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
      `  S&P500 3ヶ月後: 平均${l.sp500["3m"].avgReturn > 0 ? "+" : ""}${l.sp500["3m"].avgReturn}%, 勝率${l.sp500["3m"].winRate}% (n=${l.sp500["3m"].sampleSize})`
    );
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
