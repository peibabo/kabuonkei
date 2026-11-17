/**
 * 日本版温度 × 東証セクター（TOPIX-17）ヒートマップデータ生成スクリプト
 *
 * ^N225 の過去10年分データから市場温度（日経225 vs 125日移動平均乖離）を算出し、
 * TOPIX-17 連動 ETF 17本それぞれについて温度帯別の将来リターンを集計する。
 *
 * TOPIX-17 指数本体は Yahoo Finance で取得できないため、NEXT FUNDS TOPIX-17
 * シリーズの業種別 ETF（1617.T〜1633.T）の日次終値を proxy として使用する。
 *
 * 実行: npx tsx scripts/generate-japan-sector-heatmap.ts
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

const YEARS_BACK = 10;
const FORWARD_DAYS = { "1m": 30, "3m": 90, "6m": 180 } as const;

type PeriodKey = keyof typeof FORWARD_DAYS;

/**
 * TOPIX-17 連動 ETF（NEXT FUNDS シリーズ）。TSE に 2008-03-25 上場で 10 年分の
 * 日次データを確保できる。東証 33 業種より粒度は粗いが、UI で一覧でき
 * サンプル数も温度帯別に十分確保できる。
 */
const SECTORS = [
  { code: "1617", symbol: "1617.T", name: "食品" },
  { code: "1618", symbol: "1618.T", name: "エネルギー資源" },
  { code: "1619", symbol: "1619.T", name: "建設・資材" },
  { code: "1620", symbol: "1620.T", name: "素材・化学" },
  { code: "1621", symbol: "1621.T", name: "医薬品" },
  { code: "1622", symbol: "1622.T", name: "自動車・輸送機" },
  { code: "1623", symbol: "1623.T", name: "鉄鋼・非鉄" },
  { code: "1624", symbol: "1624.T", name: "機械" },
  { code: "1625", symbol: "1625.T", name: "電機・精密" },
  { code: "1626", symbol: "1626.T", name: "情報通信・サービスその他" },
  { code: "1627", symbol: "1627.T", name: "電力・ガス" },
  { code: "1628", symbol: "1628.T", name: "運輸・物流" },
  { code: "1629", symbol: "1629.T", name: "商社・卸売" },
  { code: "1630", symbol: "1630.T", name: "小売" },
  { code: "1631", symbol: "1631.T", name: "銀行" },
  { code: "1632", symbol: "1632.T", name: "金融(除く銀行)" },
  { code: "1633", symbol: "1633.T", name: "不動産" },
] as const;

function buildIndexStats(
  returnsMap: Record<PeriodKey, number[]>
): IndexHistoricalStats {
  return {
    "1m": buildPeriodStats(returnsMap["1m"]),
    "3m": buildPeriodStats(returnsMap["3m"]),
    "6m": buildPeriodStats(returnsMap["6m"]),
  };
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

  const nikkeiDates = [...nikkeiMap.keys()].sort();

  // 市場温度の事前計算（generate-japan-historical-stats.ts と同じ共通関数）
  const scoreMap = new Map(
    computeJapanTemperatureSeries(nikkeiMap).map((p) => [p.date, p.score])
  );

  const scoreOf = (date: string) => scoreMap.get(date) ?? null;
  const baseDates = nikkeiDates.slice(MA_WINDOW);

  const sectorOutputs: Array<{
    code: string;
    symbol: string;
    name: string;
    levels: Array<{
      level: (typeof SENTIMENT_RANGES)[number]["level"];
      scoreRange: [number, number];
      occurrences: number;
      stats: IndexHistoricalStats;
    }>;
  }> = [];

  for (const sector of SECTORS) {
    console.log(`取得中: ${sector.symbol} (${sector.name})...`);
    let priceMap: Map<string, number>;
    try {
      priceMap = await fetchDailyCloses(
        yahooFinance,
        sector.symbol,
        period1,
        period2
      );
    } catch (err) {
      console.warn(
        `⚠️  ${sector.symbol} (${sector.name}) の取得に失敗しました。このセクターはスキップします。`,
        err
      );
      await sleep(2000);
      continue;
    }
    console.log(`  → ${priceMap.size} 日分取得`);

    if (priceMap.size === 0) {
      console.warn(
        `⚠️  ${sector.symbol} (${sector.name}) の価格データが空でした。スキップします。`
      );
      await sleep(2000);
      continue;
    }

    const priceDates = [...priceMap.keys()].sort();

    const aggregated = aggregateLevelReturns<PeriodKey>({
      dates: baseDates,
      scoreOf,
      priceMap,
      priceDates,
      forwardDays: FORWARD_DAYS,
    });

    const levels = SENTIMENT_RANGES.map(({ level, scoreRange }) => {
      const entry = aggregated[level];
      return {
        level,
        scoreRange,
        occurrences: entry.occurrences,
        stats: buildIndexStats(entry.returns),
      };
    });

    sectorOutputs.push({
      code: sector.code,
      symbol: sector.symbol,
      name: sector.name,
      levels,
    });

    await sleep(2000);
  }

  if (sectorOutputs.length === 0) {
    console.error(
      "❌ 全セクターの取得に失敗しました。出力ファイルは更新しません。"
    );
    process.exit(1);
  }

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    note:
      "市場温度（日経225 vs 125日移動平均乖離）による過去統計。サイトのゲージ・アラートと同じ定義。" +
      "TOPIX-17 連動 ETF（NEXT FUNDS シリーズ 1617〜1633）の日次終値を各業種の proxy として使用。" +
      "業種区分は東証 33 業種ではなく TOPIX-17 ベース。サンプル数が少ない温度帯は参考値として扱うこと。",
    sectors: sectorOutputs,
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "japan-sector-heatmap.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(
    `\n--- 集計結果サマリー（${sectorOutputs.length}/${SECTORS.length} セクター成功）---`
  );
  for (const s of sectorOutputs) {
    const line = s.levels
      .map(
        (l) =>
          `${l.level}:${l.occurrences}日(3m平均${l.stats["3m"].avgReturn > 0 ? "+" : ""}${l.stats["3m"].avgReturn}%)`
      )
      .join(" / ");
    console.log(`${s.code} ${s.name}: ${line}`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
