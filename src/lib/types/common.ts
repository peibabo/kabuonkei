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
