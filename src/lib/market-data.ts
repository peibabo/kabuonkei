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

const japanMarketData = rawJapanMarketData as unknown as JapanMarketData;

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
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    now: Date.now(),
  });
}
