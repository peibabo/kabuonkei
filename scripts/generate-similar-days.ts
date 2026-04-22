/**
 * 「今日の類似日」機能用のデータ生成スクリプト + イベント詳細ページ用リターン事前計算
 *
 * 日本版（日経225 + USDJPY）と米国版（VIX + S&P500）について、
 * 過去11年の各営業日ごとに
 *  - その日の温度スコア
 *  - その日からの 1ヶ月後 / 3ヶ月後 / 6ヶ月後の指数リターン
 * を算出し、src/data/japan-similar-days.json / us-similar-days.json に保存する。
 *
 * 加えて、`src/data/events-meta.json` に登録された主要イベント各日について、
 * 日経225 と S&P500 それぞれの 1M/3M/6M/1Y リターンを事前計算し、
 * src/data/events-enriched.json に保存する（/events/[slug] ページで使用）。
 *
 * 実行: npx tsx scripts/generate-similar-days.ts
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  normalizeNikkeiMaDeviation,
  normalizeUsdJpyMomentum,
} from "../src/lib/japan-fear-greed";
import type {
  SimilarDayEntry,
  SimilarDaysFile,
  EventMeta,
  EnrichedReturns,
  EventEnrichedEntry,
  EventEnrichedFile,
} from "../src/lib/types";
import {
  estimateFearGreedFromVix,
  fetchDailyCloses,
  findForwardPrice,
  round1,
  sleep,
} from "./_lib/shared";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// 最古イベント (2015-08-24) をカバーするため 11 年遡る
const YEARS_BACK = 11;
const MA_WINDOW = 125;
const MOMENTUM_WINDOW = 50;

function computeReturn(from: number, to: number | null): number | null {
  if (to == null) return null;
  return round1(((to - from) / from) * 100);
}

interface JapanResult {
  file: SimilarDaysFile;
  nikkeiMap: Map<string, number>;
  nikkeiDates: string[];
}

interface UsResult {
  file: SimilarDaysFile;
  sp500Map: Map<string, number>;
  sp500Dates: string[];
}

async function generateJapan(period1: string, period2: string): Promise<JapanResult> {
  console.log("\n=== 日本版 ===");
  console.log("取得中: ^N225...");
  const nikkeiMap = await fetchDailyCloses(
    yahooFinance,
    "^N225",
    period1,
    period2,
  );
  console.log(`  → ${nikkeiMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: USDJPY=X...");
  const usdJpyMap = await fetchDailyCloses(
    yahooFinance,
    "USDJPY=X",
    period1,
    period2,
  );
  console.log(`  → ${usdJpyMap.size} 日分取得`);

  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const usdJpyDates = [...usdJpyMap.keys()].sort();

  const daily: SimilarDayEntry[] = [];

  for (let i = MA_WINDOW; i < nikkeiDates.length; i++) {
    const date = nikkeiDates[i];
    const nikkeiPrice = nikkeiMap.get(date);
    if (nikkeiPrice == null) continue;

    const maWindow = nikkeiDates
      .slice(i - MA_WINDOW, i)
      .map((d) => nikkeiMap.get(d))
      .filter((v): v is number => v != null);
    if (maWindow.length < MA_WINDOW) continue;
    const ma125 = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;
    const c1 = normalizeNikkeiMaDeviation(nikkeiPrice, ma125);

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
    const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    const price1m = findForwardPrice(nikkeiMap, nikkeiDates, date, 30);
    const price3m = findForwardPrice(nikkeiMap, nikkeiDates, date, 90);
    const price6m = findForwardPrice(nikkeiMap, nikkeiDates, date, 180);

    daily.push({
      date,
      score,
      return1m: computeReturn(nikkeiPrice, price1m),
      return3m: computeReturn(nikkeiPrice, price3m),
      return6m: computeReturn(nikkeiPrice, price6m),
    });
  }

  console.log(`  → ${daily.length} 件生成`);
  return {
    file: {
      generatedAt: new Date().toISOString().split("T")[0],
      dataRange: { from: period1, to: period2 },
      market: "japan",
      note:
        "C1(日経225 vs 125日MA)とC5(USDJPY 50日モメンタム)の2要素簡易版スコア。" +
        "日経225終値をベースに将来リターンを算出。",
      daily,
    },
    nikkeiMap,
    nikkeiDates,
  };
}

async function generateUs(period1: string, period2: string): Promise<UsResult> {
  console.log("\n=== 米国版 ===");
  console.log("取得中: ^VIX...");
  const vixMap = await fetchDailyCloses(
    yahooFinance,
    "^VIX",
    period1,
    period2,
  );
  console.log(`  → ${vixMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: ^GSPC...");
  const sp500Map = await fetchDailyCloses(
    yahooFinance,
    "^GSPC",
    period1,
    period2,
  );
  console.log(`  → ${sp500Map.size} 日分取得`);

  const sp500Dates = [...sp500Map.keys()].sort();
  const allDates = [...vixMap.keys()].filter((d) => sp500Map.has(d)).sort();

  const daily: SimilarDayEntry[] = [];

  for (const date of allDates) {
    const vix = vixMap.get(date);
    const sp500Price = sp500Map.get(date);
    if (vix == null || sp500Price == null) continue;

    const score = estimateFearGreedFromVix(vix);

    const price1m = findForwardPrice(sp500Map, sp500Dates, date, 30);
    const price3m = findForwardPrice(sp500Map, sp500Dates, date, 90);
    const price6m = findForwardPrice(sp500Map, sp500Dates, date, 180);

    daily.push({
      date,
      score,
      return1m: computeReturn(sp500Price, price1m),
      return3m: computeReturn(sp500Price, price3m),
      return6m: computeReturn(sp500Price, price6m),
    });
  }

  console.log(`  → ${daily.length} 件生成`);
  return {
    file: {
      generatedAt: new Date().toISOString().split("T")[0],
      dataRange: { from: period1, to: period2 },
      market: "us",
      note:
        "VIXから推定した温度スコア（estimateFearGreedFromVix）。" +
        "S&P500終値をベースに将来リターンを算出。",
      daily,
    },
    sp500Map,
    sp500Dates,
  };
}

/**
 * 指定日（またはその日以降で最初にヒットする営業日）の終値を取得。
 * イベント日が休場（土日・祝日）でも最寄営業日で補完する。
 */
export function findPriceOnOrAfter(
  priceMap: Map<string, number>,
  sortedDates: string[],
  targetDate: string,
): { date: string; price: number } | null {
  for (const d of sortedDates) {
    if (d >= targetDate) {
      const p = priceMap.get(d);
      if (p != null) return { date: d, price: p };
    }
  }
  return null;
}

export function computeEventReturns(
  priceMap: Map<string, number>,
  sortedDates: string[],
  eventDate: string,
): EnrichedReturns {
  const anchor = findPriceOnOrAfter(priceMap, sortedDates, eventDate);
  if (anchor == null) {
    return { return1m: null, return3m: null, return6m: null, return1y: null };
  }
  const r1m = findForwardPrice(priceMap, sortedDates, anchor.date, 30);
  const r3m = findForwardPrice(priceMap, sortedDates, anchor.date, 90);
  const r6m = findForwardPrice(priceMap, sortedDates, anchor.date, 180);
  const r1y = findForwardPrice(priceMap, sortedDates, anchor.date, 365);
  return {
    return1m: computeReturn(anchor.price, r1m),
    return3m: computeReturn(anchor.price, r3m),
    return6m: computeReturn(anchor.price, r6m),
    return1y: computeReturn(anchor.price, r1y),
  };
}

/** events-meta.json の各イベントについて、日経225 と S&P500 のリターンを事前計算 */
function generateEventsEnriched(
  jp: JapanResult,
  us: UsResult,
): EventEnrichedFile {
  const metaPath = resolve(__dirname, "../src/data/events-meta.json");
  const events = JSON.parse(readFileSync(metaPath, "utf-8")) as EventMeta[];

  const entries: EventEnrichedEntry[] = events.map((e) => ({
    slug: e.slug,
    date: e.date,
    jp: computeEventReturns(jp.nikkeiMap, jp.nikkeiDates, e.date),
    us: computeEventReturns(us.sp500Map, us.sp500Dates, e.date),
  }));

  return {
    generatedAt: new Date().toISOString().split("T")[0],
    entries,
  };
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);
  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];
  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  const japan = await generateJapan(period1, period2);
  await sleep(2000);
  const us = await generateUs(period1, period2);

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });

  const japanPath = resolve(outDir, "japan-similar-days.json");
  writeFileSync(japanPath, JSON.stringify(japan.file, null, 2), "utf-8");
  console.log(`\n✅ ${japanPath}`);

  const usPath = resolve(outDir, "us-similar-days.json");
  writeFileSync(usPath, JSON.stringify(us.file, null, 2), "utf-8");
  console.log(`✅ ${usPath}`);

  console.log("\n=== イベント 1M/3M/6M/1Y リターン事前計算 ===");
  const enriched = generateEventsEnriched(japan, us);
  const enrichedPath = resolve(outDir, "events-enriched.json");
  writeFileSync(enrichedPath, JSON.stringify(enriched, null, 2), "utf-8");
  console.log(`✅ ${enrichedPath}（${enriched.entries.length} 件）`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
