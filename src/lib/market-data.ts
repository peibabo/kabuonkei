import YahooFinance from "yahoo-finance2";
import type {
  FearGreedData,
  IndexData,
  VolatilityData,
  BondYieldData,
  ForexData,
  ChartPoint,
  MarketData,
} from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface CNNFearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    previous_close: number;
    one_week_ago: { score: number };
    one_month_ago: { score: number };
    one_year_ago: { score: number };
    timestamp: string;
  };
}

export async function fetchFearGreedIndex(): Promise<FearGreedData> {
  const res = await fetch(
    "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error(`CNN Fear & Greed API error: ${res.status}`);
  }

  const data: CNNFearGreedResponse = await res.json();
  const fg = data.fear_and_greed;

  return {
    score: Math.round(fg.score),
    rating: fg.rating,
    previousClose: Math.round(fg.previous_close),
    oneWeekAgo: Math.round(fg.one_week_ago.score),
    oneMonthAgo: Math.round(fg.one_month_ago.score),
    oneYearAgo: Math.round(fg.one_year_ago.score),
    timestamp: fg.timestamp,
  };
}

async function fetchQuote(
  symbol: string
): Promise<{ price: number; change: number; changePercent: number }> {
  const result = await yahooFinance.quote(symbol);
  return {
    price: result.regularMarketPrice ?? 0,
    change: result.regularMarketChange ?? 0,
    changePercent: result.regularMarketChangePercent ?? 0,
  };
}

async function fetchChart(
  symbol: string,
  days: number = 30
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

export async function fetchVolatilityData(): Promise<VolatilityData[]> {
  const symbols = [
    { symbol: "^VIX", name: "VIX（恐怖指数）" },
    { symbol: "^JNV", name: "日経VI" },
  ];

  return Promise.all(
    symbols.map(async ({ symbol, name }) => {
      const [quote, chart] = await Promise.all([
        fetchQuote(symbol),
        fetchChart(symbol),
      ]);
      return {
        symbol,
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(quote.change * 100) / 100,
        chart,
      };
    })
  );
}

export async function fetchIndices(): Promise<IndexData[]> {
  const symbols = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "ダウ平均" },
    { symbol: "^IXIC", name: "ナスダック" },
    { symbol: "^N225", name: "日経平均" },
    { symbol: "^TPX", name: "TOPIX" },
  ];

  return Promise.all(
    symbols.map(async ({ symbol, name }) => {
      const quote = await fetchQuote(symbol);
      return {
        symbol,
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(quote.change * 100) / 100,
        changePercent: Math.round(quote.changePercent * 100) / 100,
      };
    })
  );
}

export async function fetchBondYield(): Promise<BondYieldData> {
  const [quote, chart] = await Promise.all([
    fetchQuote("^TNX"),
    fetchChart("^TNX"),
  ]);

  return {
    name: "米国10年債利回り",
    yield: Math.round(quote.price * 1000) / 1000,
    change: Math.round(quote.change * 1000) / 1000,
    chart,
  };
}

export async function fetchForex(): Promise<ForexData> {
  const quote = await fetchQuote("USDJPY=X");

  return {
    pair: "USD/JPY",
    name: "ドル円",
    rate: Math.round(quote.price * 100) / 100,
    change: Math.round(quote.change * 100) / 100,
    changePercent: Math.round(quote.changePercent * 100) / 100,
  };
}

// メモリキャッシュ
let cachedData: MarketData | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15分

export async function fetchAllMarketData(): Promise<MarketData> {
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    return cachedData;
  }

  const [fearGreed, volatility, indices, bonds, forex] =
    await Promise.all([
      fetchFearGreedIndex(),
      fetchVolatilityData(),
      fetchIndices(),
      fetchBondYield(),
      fetchForex(),
    ]);

  const jstNow = new Date(
    now + 9 * 60 * 60 * 1000
  );
  const lastUpdated = jstNow.toISOString().replace("T", " ").slice(0, 19) + " JST";

  cachedData = {
    fearGreed,
    volatility,
    indices,
    bonds,
    forex,
    lastUpdated,
  };
  cacheTimestamp = now;

  return cachedData;
}
