import rawData from "@/data/stock-temperatures.json";
import { UNIVERSES, type StockTemperatureEntry, type StockTemperatureFile } from "./types";
import { summarize, sortByScoreDesc, type StockSummary } from "./stats";

export * from "./stats";
export * from "./format";
export type { StockTemperatureEntry, StockTemperatureFile } from "./types";

const data = rawData as unknown as StockTemperatureFile;

export function getStockTemperatureFile(): StockTemperatureFile {
  return data;
}

/** 対象範囲の表示名（例: "日経225採用"） */
export function getUniverseLabel(): string {
  return UNIVERSES[data.universe].label;
}

export function getStockCodes(): string[] {
  return Object.keys(data.stocks).sort();
}

export function getStockEntry(code: string): StockTemperatureEntry | null {
  return data.stocks[code] ?? null;
}

let summaries: StockSummary[] | undefined;

/** 全銘柄の最新サマリ（温度の高い順）。ビルド中は全ページで同じ結果を使い回す */
export function getAllStockSummaries(): StockSummary[] {
  summaries ??= sortByScoreDesc(
    Object.entries(data.stocks)
      .map(([code, entry]) => summarize(code, entry))
      .filter((s): s is StockSummary => s != null)
  );
  return summaries;
}
