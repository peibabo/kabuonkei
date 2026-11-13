/**
 * 日本版市場温度スコア（5要素フル版）の日次スナップショットを追記するスクリプト
 *
 * 平日 JST 17:00 にGitHub Actionsから実行され、
 * 現時点の5要素スコアを計算して `src/data/japan-fg-snapshots.json` に追記する。
 * 同一日付のエントリが既に存在する場合は上書き（手動再実行時に対応）。
 *
 * エントリの日付は実行日ではなく日経225 の最終取引日（JST）。Actions の遅延で
 * 翌日未明に走っても、引け値はその営業日の日付で記録される。
 * 休場日（祝日など）の実行で、前営業日のエントリが既にある場合は何も書かない。
 *
 * 実行: npx tsx scripts/snapshot-japan-fear-greed.ts
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { computeJapanFearGreed } from "../src/lib/japan-fear-greed";
import type { ChartPoint, JapanMarketData } from "../src/lib/types";
import {
  emptySnapshotFile,
  mergeSnapshotEntry,
  type SnapshotEntry,
  type SnapshotFile,
} from "./_lib/snapshot-merge";
import { resolveTradingDate } from "./_lib/trading-date";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const SNAPSHOT_PATH = resolve(__dirname, "../src/data/japan-fg-snapshots.json");
const MARKET_DATA_PATH = resolve(__dirname, "../src/data/japan-market-data.json");

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

interface QuoteSnapshot {
  price: number | null;
  /** 最終取引時刻（取得できなければ null） */
  marketTime: Date | null;
}

async function fetchQuote(symbol: string): Promise<QuoteSnapshot> {
  try {
    const result = await yahooFinance.quote(symbol);
    const time = result?.regularMarketTime;
    return {
      price: result?.regularMarketPrice ?? null,
      marketTime: time instanceof Date ? time : null,
    };
  } catch {
    return { price: null, marketTime: null };
  }
}

async function main() {
  console.log("日本版FGスナップショット生成中...");

  // --- 入力データを収集 ---
  const marketDataRaw = JSON.parse(
    readFileSync(MARKET_DATA_PATH, "utf-8")
  ) as JapanMarketData;

  const [nikkei225Chart, usdJpyChart, nikkeiQuote, usdJpyQuote] =
    await Promise.all([
      fetchChart("^N225", 200),
      fetchChart("USDJPY=X", 80),
      fetchQuote("^N225"),
      fetchQuote("USDJPY=X"),
    ]);
  const nikkei225Price = nikkeiQuote.price;
  const usdJpyRate = usdJpyQuote.price;

  // 日付は実行日ではなく日経225 の最終取引日から決める（Actions 遅延で日付をまたいでもずれない）
  const trading = resolveTradingDate(nikkeiQuote.marketTime);
  const date = trading.date;
  if (trading.fallback) {
    console.warn(
      `  最終取引時刻を取得できないため、実行時刻から営業日を推定: ${date}`
    );
  }

  let existing: SnapshotFile = emptySnapshotFile();
  if (existsSync(SNAPSHOT_PATH)) {
    try {
      existing = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as SnapshotFile;
    } catch {
      console.warn("既存スナップショットJSONが壊れているため空で初期化");
    }
  }
  const wasReplaced = existing.snapshots.some((s) => s.date === date);

  // 休場日の実行: 前営業日の分が既にあれば、その引け時点の値を為替だけ動いた値で上書きしない
  if (trading.marketClosed && wasReplaced) {
    console.log(
      `  休場日のためスキップ（直近営業日 ${date} のエントリは記録済み）`
    );
    return;
  }

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

  // --- 同日があれば置換、なければ追加 ---
  const file = mergeSnapshotEntry(existing, entry);

  if (wasReplaced) {
    console.log(`  ${date} のエントリを上書き`);
  } else {
    console.log(`  ${date} のエントリを新規追加（合計 ${file.snapshots.length} 件）`);
  }

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
