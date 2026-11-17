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

/**
 * 信用買い残の直近4週変化率（%）。最新週と 4 週前の買残を比べる。
 * 5 週分そろわなければ null。
 */
export function calcMarginBuyChange4w(
  margin: MarginTradingData | null
): number | null {
  const weekly = margin?.weekly ?? [];
  if (weekly.length < 5) return null;
  const latest = weekly[weekly.length - 1].buyBalance;
  const before = weekly[weekly.length - 5].buyBalance;
  if (!(before > 0) || !Number.isFinite(latest)) return null;
  return (latest / before - 1) * 100;
}

/**
 * JPX の直近数週分（`japan-market-data.json`）に、長期履歴（`margin-ratio-history.json`）を
 * 足して週次の信用残を作る。同じ週は直近側を優先。4 週変化を出すのに 5 週必要だが、
 * JPX のページは直近約 5 週しか載らず 1 週欠けると計算できなくなるため。
 */
export function mergeMarginWeeks(
  history: readonly MarginTradingData["weekly"][number][],
  current: MarginTradingData | null
): MarginTradingData | null {
  if (!current && history.length === 0) return null;
  const byDate = new Map(history.map((w) => [w.date, w]));
  for (const w of current?.weekly ?? []) byDate.set(w.date, w);
  return {
    generatedAt: current?.generatedAt ?? "",
    weekly: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** 最新の信用倍率を抽出（旧 5 要素版で使用） */
export function latestMarginRatio(
  margin: MarginTradingData | null
): number | null {
  if (!margin || margin.weekly.length === 0) return null;
  return margin.weekly[margin.weekly.length - 1].ratio;
}

/** 最新の裁定残買い残・売り残を抽出（旧 5 要素版で使用） */
export function latestArbitrageBalance(
  arbitrage: ArbitrageBalanceData | null
): { buy: number; sell: number } | null {
  if (!arbitrage || arbitrage.daily.length === 0) return null;
  const latest = arbitrage.daily[arbitrage.daily.length - 1];
  return { buy: latest.buyBalance, sell: latest.sellBalance };
}
