/**
 * 型定義の公開エントリポイント（barrel）。
 *
 * 実体はドメインごとに `src/lib/types/` 配下へ分割。import パスは `@/lib/types` のまま維持する。
 * 依存方向: sentiment → japan-fear-greed, common → market（集約層）。
 */
export type {
  ChartPoint,
  IndexData,
  VolatilityData,
  BondYieldData,
  ForexData,
  CommodityData,
} from "./types/common";
export type { SentimentLevel, SentimentDescription } from "./types/sentiment";
export type { FearGreedData } from "./types/us-fear-greed";
export type {
  JapanFearGreedComponentId,
  JapanFearGreedComponent,
  JapanFearGreedData,
} from "./types/japan-fear-greed";
export type {
  InvestorTradingEntity,
  InvestorTradingWeek,
  InvestorTradingData,
  ArbitrageBalanceDay,
  ArbitrageBalanceData,
  MarginTradingWeek,
  MarginTradingData,
  JapanMarketData,
} from "./types/japan-market";
export type {
  SimilarDayEntry,
  SimilarDayMatch,
  SimilarDaysFile,
} from "./types/similar-days";
export type { MarketData } from "./types/market";
