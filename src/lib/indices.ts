import type {
  IndexData,
  VolatilityData,
  BondYieldData,
  ForexData,
  CommodityData,
} from "./types";
import { fetchQuote, fetchChart } from "./yahoo";
import {
  BOND_YIELD_SYMBOL,
  COMMODITY_SYMBOLS,
  FOREX_SYMBOL,
  INDEX_SYMBOLS,
  VOLATILITY_SYMBOLS,
} from "./indices/symbols";

export async function fetchVolatilityData(): Promise<VolatilityData[]> {
  const results = await Promise.all(
    VOLATILITY_SYMBOLS.map(async ({ symbol, name }) => {
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
  const results = await Promise.all(
    INDEX_SYMBOLS.map(async ({ symbol, name }) => {
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
    fetchQuote(BOND_YIELD_SYMBOL.symbol),
    fetchChart(BOND_YIELD_SYMBOL.symbol),
  ]);

  return {
    name: BOND_YIELD_SYMBOL.name,
    yield: quote ? Math.round(quote.price * 1000) / 1000 : 0,
    change: quote ? Math.round(quote.change * 1000) / 1000 : 0,
    chart,
  };
}

export async function fetchForex(): Promise<ForexData> {
  const quote = await fetchQuote(FOREX_SYMBOL.symbol);

  return {
    pair: FOREX_SYMBOL.pair,
    name: FOREX_SYMBOL.name,
    rate: quote ? Math.round(quote.price * 100) / 100 : 0,
    change: quote ? Math.round(quote.change * 100) / 100 : 0,
    changePercent: quote ? Math.round(quote.changePercent * 100) / 100 : 0,
  };
}

export async function fetchCommodities(): Promise<CommodityData[]> {
  const results = await Promise.all(
    COMMODITY_SYMBOLS.map(async ({ symbol, name }) => {
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
