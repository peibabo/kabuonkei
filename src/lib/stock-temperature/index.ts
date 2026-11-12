import rawData from "@/data/stock-temperatures.json";
import type { StockTemperatureEntry, StockTemperatureFile } from "./types";
import { summarize, sortByScoreDesc, type StockSummary } from "./stats";

export * from "./stats";
export type { StockTemperatureEntry, StockTemperatureFile } from "./types";

const data = rawData as unknown as StockTemperatureFile;

export function getStockTemperatureFile(): StockTemperatureFile {
  return data;
}

export function getStockCodes(): string[] {
  return Object.keys(data.stocks).sort();
}

export function getStockEntry(code: string): StockTemperatureEntry | null {
  return data.stocks[code] ?? null;
}

/** 全銘柄の最新サマリ（温度の高い順） */
export function getAllStockSummaries(): StockSummary[] {
  return sortByScoreDesc(
    Object.entries(data.stocks)
      .map(([code, entry]) => summarize(code, entry))
      .filter((s): s is StockSummary => s != null)
  );
}
