import type {
  IndexData,
  VolatilityData,
  BondYieldData,
  ForexData,
  CommodityData,
} from "./types";
import { fetchQuote, fetchChart } from "./yahoo";

export async function fetchVolatilityData(): Promise<VolatilityData[]> {
  const symbols = [{ symbol: "^VIX", name: "VIX（恐怖指数）" }];

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
