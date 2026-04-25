import type {
  BondYieldData,
  CommodityData,
  FearGreedData,
  ForexData,
  IndexData,
  JapanFearGreedData,
  MarketData,
  VolatilityData,
} from "../types";

export interface BuildMarketDataInputs {
  fearGreed: FearGreedData;
  japanFearGreed: JapanFearGreedData | null;
  /** 直近スナップショットの日本版温度スコア。null なら直近観測なし。 */
  previousJapanScore?: number | null;
  /** 直近 7 日の日本版温度スコア（古い→新しい順）。 */
  japanSparkline?: number[];
  /** 直近 7 日の米国版温度スコア（古い→新しい順）。 */
  usSparkline?: number[];
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
  /** 現在時刻（Unix ms）。テスト時は固定値を注入する */
  now: number;
}

/** JST 基準の "YYYY-MM-DD HH:MM:SS JST" 文字列 */
export function formatJstTimestamp(now: number): string {
  const jst = new Date(now + 9 * 60 * 60 * 1000);
  return jst.toISOString().replace("T", " ").slice(0, 19) + " JST";
}

/** 取得済みの各セクションデータから MarketData を組み立てる純粋関数 */
export function buildMarketData(inputs: BuildMarketDataInputs): MarketData {
  return {
    fearGreed: inputs.fearGreed,
    japanFearGreed: inputs.japanFearGreed,
    previousJapanScore: inputs.previousJapanScore ?? null,
    japanSparkline: inputs.japanSparkline ?? [],
    usSparkline: inputs.usSparkline ?? [],
    volatility: inputs.volatility,
    indices: inputs.indices,
    bonds: inputs.bonds,
    forex: inputs.forex,
    commodities: inputs.commodities,
    lastUpdated: formatJstTimestamp(inputs.now),
  };
}
