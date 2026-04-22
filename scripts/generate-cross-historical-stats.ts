/**
 * クロス分析用の過去統計データ生成スクリプト（参考値）
 *
 * 「温度計 × 同じ市場」の純粋分離（米国温度→S&P500 / 日本温度→日経225）とは別に、
 * 温度と対象市場を入れ替えた組み合わせで温度帯別リターンを集計する。
 *
 * - usTempJpIdx: 米国温度（VIX 推定スコア）× 日経225（^N225）
 * - jpTempUsIdx: 日本温度（C1+C5 簡易スコア / 10年 JSON を再利用）× S&P500（^GSPC）
 *
 * 温度と対象市場が異なるため同市場統計より相関が弱い可能性あり（UI 側で明示する）。
 *
 * 実行: npx tsx scripts/generate-cross-historical-stats.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  SENTIMENT_RANGES,
  buildPeriodStats,
  estimateFearGreedFromVix,
  fetchDailyCloses,
  sleep,
} from "./_lib/shared";
import { aggregateLevelReturns } from "./_lib/stats-aggregator";
import type { IndexHistoricalStats } from "../src/lib/historical-stats";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 10;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;
type PeriodKey = keyof typeof FORWARD_DAYS;

interface JapanTempDaily {
  date: string;
  score: number;
}
interface JapanTempHistory {
  daily: JapanTempDaily[];
}

interface DirectionLevelOutput {
  level: (typeof SENTIMENT_RANGES)[number]["level"];
  scoreRange: (typeof SENTIMENT_RANGES)[number]["scoreRange"];
  occurrences: number;
  stats: IndexHistoricalStats;
}

function aggregateDirection(params: {
  label: string;
  scoreMap: Map<string, number>;
  priceMap: Map<string, number>;
}): DirectionLevelOutput[] {
  const { label, scoreMap, priceMap } = params;
  const priceDates = [...priceMap.keys()].sort();
  const commonDates = [...scoreMap.keys()]
    .filter((d) => priceMap.has(d))
    .sort();
  console.log(`  [${label}] 共通日数: ${commonDates.length}`);

  const aggregated = aggregateLevelReturns<PeriodKey>({
    dates: commonDates,
    scoreOf: (date) => scoreMap.get(date) ?? null,
    priceMap,
    priceDates,
    forwardDays: FORWARD_DAYS,
  });

  return SENTIMENT_RANGES.map(({ level, scoreRange }) => {
    const entry = aggregated[level];
    return {
      level,
      scoreRange,
      occurrences: entry.occurrences,
      stats: {
        "1m": buildPeriodStats(entry.returns["1m"]),
        "3m": buildPeriodStats(entry.returns["3m"]),
        "6m": buildPeriodStats(entry.returns["6m"]),
      },
    };
  });
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  // --- usTempJpIdx: 米国温度（VIX推定） × 日経225 ---
  console.log("\n=== usTempJpIdx（米国温度 × 日経225）===");
  console.log("取得中: ^VIX...");
  const vixMap = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);
  console.log(`  → ${vixMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: ^N225...");
  const nikkeiMap = await fetchDailyCloses(
    yahooFinance,
    "^N225",
    period1,
    period2
  );
  console.log(`  → ${nikkeiMap.size} 日分取得`);
  await sleep(2000);

  const usScoreMap = new Map<string, number>();
  for (const [date, vix] of vixMap.entries()) {
    usScoreMap.set(date, estimateFearGreedFromVix(vix));
  }

  const usTempJpIdxLevels = aggregateDirection({
    label: "usTempJpIdx",
    scoreMap: usScoreMap,
    priceMap: nikkeiMap,
  });

  // --- jpTempUsIdx: 日本温度（C1+C5 簡易 10年） × S&P500 ---
  console.log("\n=== jpTempUsIdx（日本温度 × S&P500）===");
  const jpHistPath = resolve(
    __dirname,
    "../src/data/japan-temperature-history.json"
  );
  const jpHistRaw = JSON.parse(
    readFileSync(jpHistPath, "utf-8")
  ) as JapanTempHistory;
  console.log(`日本温度履歴: ${jpHistRaw.daily.length} 日分`);

  const jpScoreMap = new Map<string, number>();
  for (const row of jpHistRaw.daily) {
    jpScoreMap.set(row.date, row.score);
  }

  console.log("取得中: ^GSPC...");
  const sp500Map = await fetchDailyCloses(
    yahooFinance,
    "^GSPC",
    period1,
    period2
  );
  console.log(`  → ${sp500Map.size} 日分取得`);

  const jpTempUsIdxLevels = aggregateDirection({
    label: "jpTempUsIdx",
    scoreMap: jpScoreMap,
    priceMap: sp500Map,
  });

  // --- 出力 ---
  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    note:
      "参考値。温度と対象市場が異なるため、同一市場の統計より相関が弱い可能性があります。" +
      "日付の結合は UTC 日付ベースの簡易結合で、厳密なイベントスタディではありません。",
    directions: {
      usTempJpIdx: { levels: usTempJpIdxLevels },
      jpTempUsIdx: { levels: jpTempUsIdxLevels },
    },
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "cross-historical-stats.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);

  console.log("\n--- usTempJpIdx（米国温度 × 日経225）3ヶ月後サマリー ---");
  for (const l of usTempJpIdxLevels) {
    console.log(
      `  ${l.level}（${l.scoreRange[0]}-${l.scoreRange[1]}）: n=${l.stats["3m"].sampleSize} 平均${l.stats["3m"].avgReturn > 0 ? "+" : ""}${l.stats["3m"].avgReturn}% 勝率${l.stats["3m"].winRate}%`
    );
  }

  console.log("\n--- jpTempUsIdx（日本温度 × S&P500）3ヶ月後サマリー ---");
  for (const l of jpTempUsIdxLevels) {
    console.log(
      `  ${l.level}（${l.scoreRange[0]}-${l.scoreRange[1]}）: n=${l.stats["3m"].sampleSize} 平均${l.stats["3m"].avgReturn > 0 ? "+" : ""}${l.stats["3m"].avgReturn}% 勝率${l.stats["3m"].winRate}%`
    );
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
