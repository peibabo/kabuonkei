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
    volatility: inputs.volatility,
    indices: inputs.indices,
    bonds: inputs.bonds,
    forex: inputs.forex,
    commodities: inputs.commodities,
    lastUpdated: formatJstTimestamp(inputs.now),
  };
}
