import type { SentimentLevel } from "./sentiment";

/**
 * 日本版の構成要素。
 * - nikkeiMa: 日経225 の 125 日移動平均乖離（C1）。これ単独が「市場温度（日本）」
 * - foreignFlow / marginBuyChange: 需給の温度を作る週次の要素
 */
export type JapanFearGreedComponentId =
  | "nikkeiMa"
  | "foreignFlow"
  | "marginBuyChange";

/** price = 市場温度（日次）、supply = 需給の温度（週次・JPX 公表） */
export type JapanFearGreedGroup = "price" | "supply";

export interface JapanFearGreedComponent {
  id: JapanFearGreedComponentId;
  label: string;
  group: JapanFearGreedGroup;
  score: number;
  rawValue: number | null;
  available: boolean;
  note?: string;
}

/** 需給の温度（海外投資家フロー・信用買残の 4 週変化の平均）。市場温度とは混ぜない参考値 */
export interface JapanSupplyTemperature {
  score: number;
  level: SentimentLevel;
  /** 算出に使えた需給要素の数（1〜2） */
  availableCount: number;
}

export interface JapanFearGreedData {
  /** 市場温度（日本）= C1（日経225 の 125 日移動平均乖離を 0〜100 にしたもの） */
  score: number;
  level: SentimentLevel;
  components: JapanFearGreedComponent[];
  /** 需給の温度。需給要素が 1 つも取れなければ null */
  supply: JapanSupplyTemperature | null;
  generatedAt: string;
}
