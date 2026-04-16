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

export interface MarketData {
  fearGreed: FearGreedData;
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  lastUpdated: string;
}

export type SentimentLevel =
  | "極度の恐怖"
  | "恐怖"
  | "中立"
  | "欲望"
  | "極度の欲望";

export function getSentimentLevel(score: number): SentimentLevel {
  if (score <= 20) return "極度の恐怖";
  if (score <= 40) return "恐怖";
  if (score <= 60) return "中立";
  if (score <= 80) return "欲望";
  return "極度の欲望";
}

export function getSentimentColor(score: number): string {
  if (score <= 20) return "#dc2626"; // red-600
  if (score <= 40) return "#ea580c"; // orange-600
  if (score <= 60) return "#ca8a04"; // yellow-600
  if (score <= 80) return "#65a30d"; // lime-600
  return "#16a34a"; // green-600
}
