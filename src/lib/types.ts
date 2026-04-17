export interface FearGreedData {
  score: number;
  rating: string;
  previousClose: number;
  oneWeekAgo: number;
  oneMonthAgo: number;
  oneYearAgo: number;
  timestamp: string;
}

export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ChartPoint {
  date: string;
  value: number;
}

export interface VolatilityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  chart: ChartPoint[];
}

export interface BondYieldData {
  name: string;
  yield: number;
  change: number;
  chart: ChartPoint[];
}

export interface ForexData {
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
}

export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chart: ChartPoint[];
}

export interface MarketData {
  fearGreed: FearGreedData;
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
  lastUpdated: string;
}

export type SentimentLevel = "極寒" | "冷え込み" | "平温" | "過熱" | "沸騰";

export type SentimentDescription =
  | "総悲観"
  | "弱気"
  | "中立"
  | "強気"
  | "総楽観";

export function getSentimentLevel(score: number): SentimentLevel {
  if (score <= 20) return "極寒";
  if (score <= 40) return "冷え込み";
  if (score <= 60) return "平温";
  if (score <= 80) return "過熱";
  return "沸騰";
}

export function getSentimentDescription(score: number): SentimentDescription {
  if (score <= 20) return "総悲観";
  if (score <= 40) return "弱気";
  if (score <= 60) return "中立";
  if (score <= 80) return "強気";
  return "総楽観";
}

// --- 日本市場固有データ ---

/** 投資主体別売買動向: 各主体の売買差引 */
export interface InvestorTradingEntity {
  name: string; // "海外投資家" | "個人" | "信託銀行" | "投資信託" | "事業法人"
  netAmount: number; // 差引き（買越=正、売越=負）（億円）
}

/** 投資主体別売買動向: 週次データ */
export interface InvestorTradingWeek {
  weekLabel: string; // "2026年4月第2週"
  startDate: string; // "2026-04-06"
  endDate: string; // "2026-04-10"
  entities: InvestorTradingEntity[];
}

/** 投資主体別売買動向: 全体 */
export interface InvestorTradingData {
  generatedAt: string;
  weeks: InvestorTradingWeek[];
}

/** 裁定残: 日次データ */
export interface ArbitrageBalanceDay {
  date: string; // 報告日 "2026-04-14"
  buyBalance: number; // 裁定買い残（百万株）
  sellBalance: number; // 裁定売り残（百万株）
}

/** 裁定残: 全体 */
export interface ArbitrageBalanceData {
  generatedAt: string;
  daily: ArbitrageBalanceDay[];
}

/** 信用取引残高: 週次データ */
export interface MarginTradingWeek {
  date: string; // 申込日 "2026-04-10"
  buyBalance: number; // 信用買い残（億円）
  sellBalance: number; // 信用売り残（億円）
  ratio: number; // 信用倍率 = buyBalance / sellBalance
}

/** 信用取引残高: 全体 */
export interface MarginTradingData {
  generatedAt: string;
  weekly: MarginTradingWeek[];
}

/** 日本市場データ: 投資主体別 + 裁定残 + 信用倍率をまとめた型 */
export interface JapanMarketData {
  investorTrading: InvestorTradingData;
  arbitrageBalance: ArbitrageBalanceData;
  marginTrading: MarginTradingData;
}

export function getSentimentColor(score: number): string {
  if (score <= 20) return "#2563eb"; // blue-600（極寒）
  if (score <= 40) return "#0ea5e9"; // sky-500（冷え込み）
  if (score <= 60) return "#ca8a04"; // yellow-600（平温）
  if (score <= 80) return "#ea580c"; // orange-600（過熱）
  return "#dc2626"; // red-600（沸騰）
}
