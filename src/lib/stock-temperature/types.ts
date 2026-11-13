import type { TemperaturePoint } from "./score";

/**
 * 対象銘柄の範囲。広げるとき（TOPIX500 など）はここに追加し、
 * 生成スクリプトの UNIVERSE を切り替える。ページの文言は label を参照する。
 */
export const UNIVERSES = {
  nikkei225: {
    /** 「{label}銘柄」「{label} 225 銘柄中」の形で使う */
    label: "日経225採用",
    /** src/data 配下の構成銘柄コード一覧 */
    constituentsFile: "nikkei225-constituents.json",
  },
} as const;

export type UniverseKey = keyof typeof UNIVERSES;

export interface StockTemperatureEntry {
  name: string;
  /** 東証33業種 */
  sector: string;
  /** 直近1年の [日付, 温度]（日付昇順）。上場から日が浅い銘柄は1年に満たない */
  history: TemperaturePoint[];
}

export interface StockTemperatureFile {
  generatedAt: string;
  /** 全銘柄の中で最も新しい営業日 */
  asOf: string;
  universe: UniverseKey;
  stocks: Record<string, StockTemperatureEntry>;
}
