import type {
  BondYieldData,
  CommodityData,
  ForexData,
  IndexData,
  VolatilityData,
} from "./common";
import type { FearGreedData } from "./us-fear-greed";
import type { JapanFearGreedData } from "./japan-fear-greed";

export interface MarketData {
  fearGreed: FearGreedData;
  japanFearGreed: JapanFearGreedData | null;
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
  lastUpdated: string;
}
