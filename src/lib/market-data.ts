import type { MarketData, JapanMarketData } from "./types";
import { computeJapanFearGreed } from "./japan-fear-greed";
import rawJapanMarketData from "@/data/japan-market-data.json";
import { fetchFearGreedIndex } from "./fear-greed";
import { fetchChart } from "./yahoo";
import {
  fetchVolatilityData,
  fetchIndices,
  fetchBondYield,
  fetchForex,
  fetchCommodities,
} from "./indices";
import { buildMarketData } from "./market-data/compose";
import {
  getFullSnapshots,
  getSimpleHistory,
} from "./japan-temperature-history";

const japanMarketData = rawJapanMarketData as unknown as JapanMarketData;

/**
 * 直近観測の日本版温度スコアを返す。
 * 優先順位: full5 スナップショットの末尾 → simple2 履歴の末尾 → null。
 */
function pickPreviousJapanScore(): number | null {
  const snaps = getFullSnapshots();
  if (snaps.length > 0) return snaps[snaps.length - 1].score;
  const simple = getSimpleHistory();
  if (simple.length > 0) return simple[simple.length - 1].score;
  return null;
}

/**
 * 直近 7 営業日（カレンダーで N 日相当）の日本版温度スコアを返す。
 * simple2 履歴の末尾 7 件を採用。古い → 新しい順。
 */
function pickJapanSparkline(): number[] {
  const simple = getSimpleHistory();
  return simple.slice(-7).map((p) => p.score);
}

/**
 * 米国版 sparkline。CNN は週次粒度（previousClose / oneWeekAgo / oneMonthAgo）しか取れないため、
 * Phase 1 では oneWeekAgo → previousClose → 現在値 の 3 点を簡易表示する。
 */
function buildUsSparkline(
  current: number,
  previousClose: number,
  oneWeekAgo: number,
): number[] {
  return [oneWeekAgo, previousClose, current];
}

/**
 * 全市場データを取得する。
 * キャッシュは呼び出し元の `/api/market` Route Handler 側で ISR（`revalidate = 900`）により行う。
 * この関数自体は都度実 fetch を行うため、route 外（scripts 等）から直接呼ぶ場合は注意。
 */
export async function fetchAllMarketData(): Promise<MarketData> {
  // VIXを先に取得し、Fear & GreedのフォールバックにVIX値を渡す
  // ^N225と USDJPY=Xの長期chartも並行取得（日本版温度スコア用）
  const [
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    nikkei225Chart,
    usdJpyChart,
  ] = await Promise.all([
    fetchVolatilityData(),
    fetchIndices(),
    fetchBondYield(),
    fetchForex(),
    fetchCommodities(),
    fetchChart("^N225", 200),
    fetchChart("USDJPY=X", 80),
  ]);

  const vixPrice = volatility.find((v) => v.symbol === "^VIX")?.price;
  const fearGreed = await fetchFearGreedIndex(vixPrice);

  const nikkei225Price =
    indices.find((i) => i.symbol === "^N225")?.price ?? null;
  const japanFearGreed = computeJapanFearGreed({
    nikkei225Chart,
    nikkei225Price,
    usdJpyRate: forex.rate || null,
    usdJpyChart,
    investorTrading: japanMarketData.investorTrading ?? null,
    marginTrading: japanMarketData.marginTrading ?? null,
    arbitrageBalance: japanMarketData.arbitrageBalance ?? null,
  });

  return buildMarketData({
    fearGreed,
    japanFearGreed,
    previousJapanScore: pickPreviousJapanScore(),
    japanSparkline: pickJapanSparkline(),
    usSparkline: buildUsSparkline(
      fearGreed.score,
      fearGreed.previousClose,
      fearGreed.oneWeekAgo,
    ),
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    now: Date.now(),
  });
}
