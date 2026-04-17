/**
 * 日本版市場温度スコア（5要素フル版）の日次スナップショットを追記するスクリプト
 *
 * 平日 JST 17:00 にGitHub Actionsから実行され、
 * 現時点の5要素スコアを計算して `src/data/japan-fg-snapshots.json` に追記する。
 * 同一日付のエントリが既に存在する場合は上書き（手動再実行時に対応）。
 *
 * 実行: npx tsx scripts/snapshot-japan-fear-greed.ts
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { computeJapanFearGreed } from "../src/lib/japan-fear-greed";
import type { ChartPoint, JapanMarketData } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SNAPSHOT_PATH = resolve(__dirname, "../src/data/japan-fg-snapshots.json");
const MARKET_DATA_PATH = resolve(__dirname, "../src/data/japan-market-data.json");

interface SnapshotEntry {
  date: string;
  score: number;
  level: string;
  availableCount: number;
  components: {
    nikkeiMa: number;
    foreignFlow: number;
    marginRatio: number;
    arbitrage: number;
    usdJpyMomentum: number;
  };
}

interface SnapshotFile {
  generatedAt: string;
  method: "full5";
  snapshots: SnapshotEntry[];
}

async function fetchChart(
  symbol: string,
  days: number
): Promise<ChartPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await yahooFinance.chart(symbol, {
    period1: startDate.toISOString().split("T")[0],
    period2: endDate.toISOString().split("T")[0],
    interval: "1d",
  });

  return result.quotes
    .filter((q) => q.close != null)
    .map((q) => ({
      date: new Date(q.date).toISOString().split("T")[0],
      value: Math.round((q.close as number) * 100) / 100,
    }));
}

async function fetchQuotePrice(symbol: string): Promise<number | null> {
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result || result.regularMarketPrice == null) return null;
    return result.regularMarketPrice;
  } catch {
    return null;
  }
}

/** 今日のJST日付（YYYY-MM-DD）を取得 */
function todayJst(): string {
  // "sv-SE" ロケールは ISO 準拠の YYYY-MM-DD を返す
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

async function main() {
  console.log("日本版FGスナップショット生成中...");

  // --- 入力データを収集 ---
  const marketDataRaw = JSON.parse(
    readFileSync(MARKET_DATA_PATH, "utf-8")
  ) as JapanMarketData;

  const [nikkei225Chart, usdJpyChart, nikkei225Price, usdJpyRate] =
    await Promise.all([
      fetchChart("^N225", 200),
      fetchChart("USDJPY=X", 80),
      fetchQuotePrice("^N225"),
      fetchQuotePrice("USDJPY=X"),
    ]);

  const fg = computeJapanFearGreed({
    nikkei225Chart,
    nikkei225Price,
    usdJpyRate,
    usdJpyChart,
    investorTrading: marketDataRaw.investorTrading ?? null,
    marginTrading: marketDataRaw.marginTrading ?? null,
    arbitrageBalance: marketDataRaw.arbitrageBalance ?? null,
  });

  if (fg == null) {
    console.error("スコア算出失敗: 2要素未満の可用データ");
    process.exit(1);
  }

  // コンポーネントスコアを id ごとに取り出す
  const componentMap: Record<string, number> = {};
  for (const c of fg.components) {
    componentMap[c.id] = c.score;
  }

  const date = todayJst();
  const entry: SnapshotEntry = {
    date,
    score: fg.score,
    level: fg.level,
    availableCount: fg.availableCount,
    components: {
      nikkeiMa: componentMap.nikkeiMa ?? 50,
      foreignFlow: componentMap.foreignFlow ?? 50,
      marginRatio: componentMap.marginRatio ?? 50,
      arbitrage: componentMap.arbitrage ?? 50,
      usdJpyMomentum: componentMap.usdJpyMomentum ?? 50,
    },
  };

  // --- 既存JSONを読み込み、同日があれば置換、なければ追加 ---
  let file: SnapshotFile = {
    generatedAt: new Date().toISOString(),
    method: "full5",
    snapshots: [],
  };

  if (existsSync(SNAPSHOT_PATH)) {
    try {
      file = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as SnapshotFile;
    } catch {
      console.warn("既存スナップショットJSONが壊れているため空で初期化");
    }
  }

  const existingIdx = file.snapshots.findIndex((s) => s.date === date);
  if (existingIdx >= 0) {
    file.snapshots[existingIdx] = entry;
    console.log(`  ${date} のエントリを上書き`);
  } else {
    file.snapshots.push(entry);
    console.log(`  ${date} のエントリを新規追加（合計 ${file.snapshots.length} 件）`);
  }

  file.snapshots.sort((a, b) => a.date.localeCompare(b.date));
  file.generatedAt = new Date().toISOString();
  file.method = "full5";

  mkdirSync(resolve(SNAPSHOT_PATH, ".."), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(file, null, 2) + "\n", "utf-8");

  console.log(
    `\n✅ 保存完了: score=${fg.score} level=${fg.level} available=${fg.availableCount}/5`
  );
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
