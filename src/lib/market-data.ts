import YahooFinance from "yahoo-finance2";
import type {
  FearGreedData,
  IndexData,
  VolatilityData,
  BondYieldData,
  ForexData,
  CommodityData,
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

/**
 * VIXの値からFear & Greedスコアを簡易推定する。
 * VIX 10以下 → 95（極度の欲望）、VIX 40以上 → 5（極度の恐怖）の線形マッピング。
 */
function estimateFearGreedFromVix(vix: number): number {
  const score = Math.round(100 - ((vix - 10) / 30) * 100);
  return Math.max(0, Math.min(100, score));
}

export async function fetchFearGreedIndex(
  vixFallback?: number
): Promise<FearGreedData> {
  // まずCNN APIを試す
  try {
    const res = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://edition.cnn.com/",
          Origin: "https://edition.cnn.com",
        },
        next: { revalidate: 3600 },
      }
    );

    if (res.ok) {
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
  } catch {
    // CNN API失敗時はフォールバックへ
  }

  // フォールバック: VIXベースの簡易推定
  const vix = vixFallback ?? 20;
  const score = estimateFearGreedFromVix(vix);

  return {
    score,
    rating: "estimated",
    previousClose: score,
    oneWeekAgo: score,
    oneMonthAgo: score,
    oneYearAgo: score,
    timestamp: new Date().toISOString(),
  };
}

async function fetchQuote(
  symbol: string
): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result || result.regularMarketPrice == null) return null;
    return {
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
    };
  } catch {
    return null;
  }
}

async function fetchChart(
  symbol: string,
  days: number = 30
): Promise<ChartPoint[]> {
  try {
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
  } catch {
    return [];
  }
}

export async function fetchVolatilityData(): Promise<VolatilityData[]> {
  const symbols = [
    { symbol: "^VIX", name: "VIX（恐怖指数）" },
  ];

  const results = await Promise.all(
    symbols.map(async ({ symbol, name }) => {
      const [quote, chart] = await Promise.all([
        fetchQuote(symbol),
        fetchChart(symbol),
      ]);
      if (!quote) return null;
      return {
        symbol,
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(quote.change * 100) / 100,
        chart,
      };
    })
  );

  return results.filter((r): r is VolatilityData => r !== null);
}

export async function fetchIndices(): Promise<IndexData[]> {
  const symbols = [
    { symbol: "^GSPC", name: "S&P 500" },
    { symbol: "^DJI", name: "ダウ平均" },
    { symbol: "^IXIC", name: "ナスダック" },
    { symbol: "^N225", name: "日経平均" },
    { symbol: "^TPX", name: "TOPIX" },
  ];

  const results = await Promise.all(
    symbols.map(async ({ symbol, name }) => {
      const quote = await fetchQuote(symbol);
      if (!quote) return null;
      return {
        symbol,
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(quote.change * 100) / 100,
        changePercent: Math.round(quote.changePercent * 100) / 100,
      };
    })
  );

  return results.filter((r): r is IndexData => r !== null);
}

export async function fetchBondYield(): Promise<BondYieldData> {
  const [quote, chart] = await Promise.all([
    fetchQuote("^TNX"),
    fetchChart("^TNX"),
  ]);

  return {
    name: "米国10年債利回り",
    yield: quote ? Math.round(quote.price * 1000) / 1000 : 0,
    change: quote ? Math.round(quote.change * 1000) / 1000 : 0,
    chart,
  };
}

export async function fetchForex(): Promise<ForexData> {
  const quote = await fetchQuote("USDJPY=X");

  return {
    pair: "USD/JPY",
    name: "ドル円",
    rate: quote ? Math.round(quote.price * 100) / 100 : 0,
    change: quote ? Math.round(quote.change * 100) / 100 : 0,
    changePercent: quote ? Math.round(quote.changePercent * 100) / 100 : 0,
  };
}

export async function fetchCommodities(): Promise<CommodityData[]> {
  const symbols = [
    { symbol: "GC=F", name: "金（ゴールド）" },
    { symbol: "CL=F", name: "原油（WTI）" },
    { symbol: "BTC-USD", name: "ビットコイン" },
  ];

  const results = await Promise.all(
    symbols.map(async ({ symbol, name }) => {
      const [quote, chart] = await Promise.all([
        fetchQuote(symbol),
        fetchChart(symbol),
      ]);
      if (!quote) return null;
      return {
        symbol,
        name,
        price: Math.round(quote.price * 100) / 100,
        change: Math.round(quote.change * 100) / 100,
        changePercent: Math.round(quote.changePercent * 100) / 100,
        chart,
      };
    })
  );

  return results.filter((r): r is CommodityData => r !== null);
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

  // VIXを先に取得し、Fear & GreedのフォールバックにVIX値を渡す
  const [volatility, indices, bonds, forex, commodities] = await Promise.all([
    fetchVolatilityData(),
    fetchIndices(),
    fetchBondYield(),
    fetchForex(),
    fetchCommodities(),
  ]);

  const vixPrice = volatility.find((v) => v.symbol === "^VIX")?.price;
  const fearGreed = await fetchFearGreedIndex(vixPrice);

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
    commodities,
    lastUpdated,
  };
  cacheTimestamp = now;

  return cachedData;
}
