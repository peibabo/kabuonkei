export interface IndexData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketTime: number | null;
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
  marketTime: number | null;
}

export interface BondYieldData {
  name: string;
  yield: number;
  change: number;
  chart: ChartPoint[];
  marketTime: number | null;
}

export interface ForexData {
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
  marketTime: number | null;
}

export interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  chart: ChartPoint[];
  marketTime: number | null;
}
