import type { TemperaturePoint } from "./score";

export interface StockTemperatureEntry {
  name: string;
  /** 東証33業種 */
  sector: string;
  /** 直近1年の [日付, 温度]（日付昇順） */
  history: TemperaturePoint[];
}

export interface StockTemperatureFile {
  generatedAt: string;
  /** 全銘柄の中で最も新しい営業日 */
  asOf: string;
  universe: "nikkei225";
  stocks: Record<string, StockTemperatureEntry>;
}
