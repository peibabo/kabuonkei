/**
 * 日本版市場温度の過去統計データ生成スクリプト
 *
 * ^N225 の過去10年分データから市場温度（日経225 vs 125日移動平均乖離）を算出し、
 * 各温度帯での日経225および TOPIX の将来リターンを集計する。
 *
 * 実行: npx tsx scripts/generate-japan-historical-stats.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  fetchDailyCloses,
  sleep,
} from "./_lib/shared";
import { aggregateLevelReturns } from "./_lib/stats-aggregator";
import { MA_WINDOW, computeJapanTemperatureSeries } from "./_lib/japan-temperature";
import type { IndexHistoricalStats } from "../src/lib/historical-stats";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const YEARS_BACK = 10;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;

type PeriodKey = keyof typeof FORWARD_DAYS;

function buildIndexStats(
  returnsMap: Record<PeriodKey, number[]>
): IndexHistoricalStats {
  return {
    "1m": buildPeriodStats(returnsMap["1m"]),
    "3m": buildPeriodStats(returnsMap["3m"]),
    "6m": buildPeriodStats(returnsMap["6m"]),
  };
}

// TOPIX 指数本体（^TPX / ^TOPX）は Yahoo Finance v2 API で取得不可のため、
// 代替として TOPIX 連動 ETF（野村 NEXT FUNDS「1306.T」）を使用。
// 日次リターン・勝率ベースの集計ではトラッキングエラーは無視できる水準。
const TOPIX_PROXY_SYMBOL = "1306.T";

async function fetchTopixOrNull(
  period1: string,
  period2: string
): Promise<Map<string, number> | null> {
  try {
    console.log(`取得中: ${TOPIX_PROXY_SYMBOL} (TOPIX 連動 ETF)...`);
    const map = await fetchDailyCloses(
      yahooFinance,
      TOPIX_PROXY_SYMBOL,
      period1,
      period2
    );
    console.log(`  → ${map.size} 日分取得`);
    if (map.size === 0) {
      console.warn(
        `⚠️  ${TOPIX_PROXY_SYMBOL} から価格データを取得できませんでした。TOPIX キーはスキップします。`
      );
      return null;
    }
    return map;
  } catch (err) {
    console.warn(
      `⚠️  ${TOPIX_PROXY_SYMBOL} の取得に失敗しました。TOPIX キーはスキップして日経225のみで出力します。`,
      err
    );
    return null;
  }
}

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


  const topixMap = await fetchTopixOrNull(period1, period2);

  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const topixDates = topixMap ? [...topixMap.keys()].sort() : null;

  // 各対象日の市場温度を事前計算（MA 算出可能な範囲）
  const scoreMap = new Map(
    computeJapanTemperatureSeries(nikkeiMap).map((p) => [p.date, p.score])
  );

  const scoreOf = (date: string) => scoreMap.get(date) ?? null;
  const baseDates = nikkeiDates.slice(MA_WINDOW);

  const nikkeiAggregated = aggregateLevelReturns<PeriodKey>({
    dates: baseDates,
    scoreOf,
    priceMap: nikkeiMap,
    priceDates: nikkeiDates,
    forwardDays: FORWARD_DAYS,
  });

  const topixAggregated =
    topixMap && topixDates
      ? aggregateLevelReturns<PeriodKey>({
          dates: baseDates,
          scoreOf,
          priceMap: topixMap,
          priceDates: topixDates,
          forwardDays: FORWARD_DAYS,
        })
      : null;

  const levels = SENTIMENT_RANGES.map(({ level, scoreRange }) => {
    const nikkeiEntry = nikkeiAggregated[level];
    const topixEntry = topixAggregated ? topixAggregated[level] : null;
    const levelOutput: {
      level: typeof level;
      scoreRange: typeof scoreRange;
      occurrences: number;
      nikkei225: IndexHistoricalStats;
      topix?: IndexHistoricalStats;
    } = {
      level,
      scoreRange,
      occurrences: nikkeiEntry.occurrences,
      nikkei225: buildIndexStats(nikkeiEntry.returns),
    };
    if (topixEntry) {
      levelOutput.topix = buildIndexStats(topixEntry.returns);
    }
    return levelOutput;
  });

  const noteBase =
    "市場温度（日経225 vs 125日移動平均乖離）による過去統計。サイトのゲージ・アラートと同じ定義。";
  const note = topixAggregated
    ? `${noteBase} TOPIX は連動ETF(${TOPIX_PROXY_SYMBOL})の日次終値を proxy として同スコアで集計（指数特性の違いによる感度差の比較用）。`
    : `${noteBase} 今回の生成では TOPIX 連動ETF(${TOPIX_PROXY_SYMBOL}) の取得に失敗したため、TOPIX キーはこの実行では含まれていません。`;

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    note,
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
    if (l.topix) {
      console.log(
        `  TOPIX   3ヶ月後: 平均${l.topix["3m"].avgReturn > 0 ? "+" : ""}${l.topix["3m"].avgReturn}%, 勝率${l.topix["3m"].winRate}% (n=${l.topix["3m"].sampleSize})`
      );
    }
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
