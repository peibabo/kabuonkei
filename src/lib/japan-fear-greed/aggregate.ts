import type {
  ChartPoint,
  InvestorTradingData,
  MarginTradingData,
  ArbitrageBalanceData,
} from "../types";

/** 125日移動平均を計算（ChartPoint配列の末尾から125個の平均） */
export function calcMa125(chart: ChartPoint[]): number | null {
  if (chart.length < 125) return null;
  const tail = chart.slice(-125);
  const sum = tail.reduce((acc, p) => acc + p.value, 0);
  return sum / tail.length;
}

/** 海外投資家の直近4週累積売買差引（億円）を抽出 */
export function calcForeignFlow4w(
  investorTrading: InvestorTradingData | null
): number | null {
  if (!investorTrading || investorTrading.weeks.length === 0) return null;
  const recent = investorTrading.weeks.slice(-4);
  let sum = 0;
  for (const week of recent) {
    const foreign = week.entities.find((e) => e.name === "海外投資家");
    if (!foreign) return null;
    sum += foreign.netAmount;
  }
  return sum;
}

/** 最新の信用倍率を抽出 */
export function latestMarginRatio(
  margin: MarginTradingData | null
): number | null {
  if (!margin || margin.weekly.length === 0) return null;
  return margin.weekly[margin.weekly.length - 1].ratio;
}

/** 最新の裁定残買い残・売り残を抽出 */
export function latestArbitrageBalance(
  arbitrage: ArbitrageBalanceData | null
): { buy: number; sell: number } | null {
  if (!arbitrage || arbitrage.daily.length === 0) return null;
  const latest = arbitrage.daily[arbitrage.daily.length - 1];
  return { buy: latest.buyBalance, sell: latest.sellBalance };
}
