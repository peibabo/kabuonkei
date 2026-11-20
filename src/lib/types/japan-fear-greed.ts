import type { SentimentLevel } from "./sentiment";

/**
 * 日本版の構成要素。
 * - nikkeiMa: 日経225 の 125 日移動平均乖離（C1）。これ単独が「市場温度（日本）」
 * - foreignFlow / marginBuyChange: 需給の週次データ（JPX 公表）。画面では実数（rawValue）だけを出し、score は使わない
 */
export type JapanFearGreedComponentId =
  | "nikkeiMa"
  | "foreignFlow"
  | "marginBuyChange";

/** price = 市場温度（日次）、supply = 需給（週次・JPX 公表） */
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

export interface JapanFearGreedData {
  /** 市場温度（日本）= C1（日経225 の 125 日移動平均乖離を 0〜100 にしたもの） */
  score: number;
  level: SentimentLevel;
  components: JapanFearGreedComponent[];
  generatedAt: string;
}
