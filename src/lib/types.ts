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

export type SentimentLevel = "極寒" | "冷え込み" | "平温" | "加熱" | "沸騰";

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
  if (score <= 80) return "加熱";
  return "沸騰";
}

export function getSentimentDescription(score: number): SentimentDescription {
  if (score <= 20) return "総悲観";
  if (score <= 40) return "弱気";
  if (score <= 60) return "中立";
  if (score <= 80) return "強気";
  return "総楽観";
}

export function getSentimentColor(score: number): string {
  if (score <= 20) return "#dc2626"; // red-600
  if (score <= 40) return "#ea580c"; // orange-600
  if (score <= 60) return "#ca8a04"; // yellow-600
  if (score <= 80) return "#65a30d"; // lime-600
  return "#16a34a"; // green-600
}
