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
import { createMemoCache } from "./market-data/cache";
import { buildMarketData } from "./market-data/compose";

const japanMarketData = rawJapanMarketData as unknown as JapanMarketData;

const CACHE_DURATION = 15 * 60 * 1000; // 15分
const cache = createMemoCache<MarketData>(CACHE_DURATION);

export async function fetchAllMarketData(): Promise<MarketData> {
  const cached = cache.get();
  if (cached) return cached;

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

  const data = buildMarketData({
    fearGreed,
    japanFearGreed,
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    now: Date.now(),
  });

  cache.set(data);
  return data;
}
