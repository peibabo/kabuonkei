import type { SentimentLevel } from "./sentiment";

export type JapanFearGreedComponentId =
  | "nikkeiMa"
  | "foreignFlow"
  | "marginRatio"
  | "arbitrage"
  | "usdJpyMomentum";

export interface JapanFearGreedComponent {
  id: JapanFearGreedComponentId;
  label: string;
  score: number;
  rawValue: number | null;
  available: boolean;
  note?: string;
}

export interface JapanFearGreedData {
  score: number;
  level: SentimentLevel;
  components: JapanFearGreedComponent[];
  availableCount: number;
  generatedAt: string;
}
