import YahooFinance from "yahoo-finance2";
import type { ChartPoint } from "./types";

export const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
});

export async function fetchQuote(
  symbol: string
): Promise<{
  price: number;
  change: number;
  changePercent: number;
  marketTime: number | null;
} | null> {
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result || result.regularMarketPrice == null) return null;
    const rawTime = result.regularMarketTime;
    const marketTime =
      rawTime instanceof Date
        ? rawTime.getTime()
        : typeof rawTime === "number"
          ? rawTime * 1000
          : null;
    return {
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      marketTime,
    };
  } catch {
    return null;
  }
}

export async function fetchChart(
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
