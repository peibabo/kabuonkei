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

const japanMarketData = rawJapanMarketData as unknown as JapanMarketData;

// メモリキャッシュ
let cachedData: MarketData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分

export async function fetchAllMarketData(): Promise<MarketData> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

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

  const jstNow = new Date(now + 9 * 60 * 60 * 1000);
  const lastUpdated =
    jstNow.toISOString().replace("T", " ").slice(0, 19) + " JST";

  cachedData = {
    fearGreed,
    japanFearGreed,
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    lastUpdated,
  };
  cacheTimestamp = now;

  return cachedData;
}
