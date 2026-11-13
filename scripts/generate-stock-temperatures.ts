/**
 * 銘柄別温度データ生成スクリプト
 *
 * 対象（UNIVERSE の構成銘柄一覧）の各銘柄について Yahoo Finance から
 * 約3年分の終値を取得し、銘柄別温度（src/lib/stock-temperature/score.ts）の
 * 直近1年分を src/data/stock-temperatures.json に書き出す。
 * 公開方針（独自指標特化）に従い、終値などの生の価格は保存しない。
 *
 * 実行: npm run generate:stock-temperatures
 *       対象を絞る場合: npm run generate:stock-temperatures -- --codes=7203,9984
 */

import YahooFinance from "yahoo-finance2";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses, sleep } from "./_lib/shared";
import { fetchBuffer, fetchText } from "./_lib/jpx-common";
import {
  JPX_LISTED_URL,
  extractListedFileUrl,
  parseListedXlsx,
} from "./_lib/jpx-listed";
import { computeStockTemperatureSeries } from "../src/lib/stock-temperature/score";
import { isoDaysAgo } from "../src/lib/stock-temperature/stats";
import {
  UNIVERSES,
  type StockTemperatureEntry,
  type StockTemperatureFile,
  type UniverseKey,
} from "../src/lib/stock-temperature/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const UNIVERSE: UniverseKey = "nikkei225";
const FETCH_YEARS = 3.3; // 125日MA + 250日σ + 1年分の出力に必要な期間
const OUTPUT_DAYS = 366;
/** これを下回る成功率なら書き出さずに失敗させる（取得元の仕様変更検知） */
const MIN_SUCCESS_RATE = 0.9;
const DATA_DIR = resolve(__dirname, "../src/data");
const OUT_PATH = resolve(DATA_DIR, "stock-temperatures.json");

function parseCodesArg(): string[] | null {
  const arg = process.argv.find((a) => a.startsWith("--codes="));
  return arg ? arg.slice("--codes=".length).split(",").filter(Boolean) : null;
}

/** 前回の出力。取得に失敗した銘柄の値を引き継ぐために読む */
function readPreviousStocks(): Record<string, StockTemperatureEntry> {
  if (!existsSync(OUT_PATH)) return {};
  return (JSON.parse(readFileSync(OUT_PATH, "utf-8")) as StockTemperatureFile).stocks;
}

async function main() {
  console.log("=== 銘柄別温度データ生成 ===\n");

  const constituents = JSON.parse(
    readFileSync(resolve(DATA_DIR, UNIVERSES[UNIVERSE].constituentsFile), "utf-8")
  ) as { codes: string[] };
  const codes = parseCodesArg() ?? constituents.codes;

  console.log("■ JPX 上場銘柄一覧の取得...");
  const listedUrl = extractListedFileUrl(await fetchText(JPX_LISTED_URL));
  if (!listedUrl) throw new Error(`上場銘柄一覧の URL を抽出できません: ${JPX_LISTED_URL}`);
  const listed = parseListedXlsx(await fetchBuffer(listedUrl));
  if (listed.size === 0) throw new Error("上場銘柄一覧のパース結果が空です（列構成の変更?）");
  console.log(`  ${listed.size} 銘柄\n`);

  const now = new Date();
  const period2 = now.toISOString().slice(0, 10);
  const period1 = isoDaysAgo(period2, Math.round(FETCH_YEARS * 365));

  console.log(`■ ${codes.length} 銘柄の温度を計算...`);
  const stocks: Record<string, StockTemperatureEntry> = {};
  const failed: string[] = [];
  for (const code of codes) {
    const issue = listed.get(code);
    if (!issue) {
      console.warn(`  ${code}: 上場銘柄一覧にありません`);
      failed.push(code);
      continue;
    }
    try {
      const closes = await fetchDailyCloses(yahooFinance, `${code}.T`, period1, period2);
      const series = computeStockTemperatureSeries(
        [...closes]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, close]) => ({ date, close }))
      );
      if (series.length === 0) throw new Error("履歴が不足しています");
      const asOf = series[series.length - 1][0];
      const since = isoDaysAgo(asOf, OUTPUT_DAYS);
      stocks[code] = {
        name: issue.name,
        sector: issue.sector33,
        history: series.filter(([date]) => date > since),
      };
      console.log(`  ${code} ${issue.name}: ${series[series.length - 1][1]}`);
    } catch (err) {
      console.warn(`  ${code}: スキップ (${err})`);
      failed.push(code);
    }
    await sleep(300);
  }

  const successRate = Object.keys(stocks).length / codes.length;
  if (successRate < MIN_SUCCESS_RATE) {
    throw new Error(
      `取得成功率が ${Math.round(successRate * 100)}% です（失敗: ${failed.join(", ")}）`
    );
  }

  // 一時的な取得失敗でページが消えない（404 にならない）よう、前回の値を引き継ぐ。
  // 引き継いだ銘柄はページ上の「終値時点」の日付が古いままになる
  const previous = readPreviousStocks();
  for (const code of failed) {
    if (previous[code]) {
      stocks[code] = previous[code];
      console.warn(`  ${code}: 前回の値を引き継ぎました`);
    }
  }

  const asOf = Object.values(stocks)
    .map((s) => s.history[s.history.length - 1][0])
    .sort()
    .at(-1)!;
  const output: StockTemperatureFile = {
    generatedAt: now.toISOString(),
    asOf,
    universe: UNIVERSE,
    stocks,
  };
  writeFileSync(OUT_PATH, JSON.stringify(output) + "\n", "utf-8");
  console.log(
    `\n✅ ${Object.keys(stocks).length} 銘柄（取得失敗 ${failed.length}）を書き出しました: ${OUT_PATH}`
  );
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
