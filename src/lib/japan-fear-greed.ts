import type {
  ChartPoint,
  InvestorTradingData,
  ArbitrageBalanceData,
  MarginTradingData,
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
  JapanFearGreedData,
} from "./types";
import { getSentimentLevel } from "./types";

/**
 * 日本版市場温度スコアの閾値定数。
 * 0=極寒, 50=中立, 100=沸騰 にマップするための境界値。
 * 実運用データの観察結果から調整。
 */
export const JAPAN_FG_THRESHOLDS = {
  // 日経225の125日MA乖離率: ±15% で極端
  nikkeiMaDeviationPct: { fear: -15, greed: 15 },
  // 海外投資家の直近4週累積売買差引（億円）: ±2兆円
  foreignFlow4wOkuYen: { fear: -20000, greed: 20000 },
  // 信用倍率: 1.0以下で総悲観、6.0以上で総楽観
  marginRatio: { fear: 1.0, greed: 6.0 },
  // 裁定残バランス比率 buy/(buy+sell): 買い残偏重の日本市場では 0.80-0.98 レンジ
  arbitrageRatio: { fear: 0.8, greed: 0.98 },
  // USDJPY 50日モメンタム（%）: ±5% で極端
  usdJpyMomentumPct: { fear: -5, greed: 5 },
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function mapToScore(value: number, fear: number, greed: number): number {
  const raw = ((value - fear) / (greed - fear)) * 100;
  return Math.round(clamp(raw, 0, 100));
}

/** C1: 日経225終値と125日移動平均の乖離率から0-100を算出 */
export function normalizeNikkeiMaDeviation(
  price: number,
  ma125: number
): number {
  if (!Number.isFinite(price) || !Number.isFinite(ma125) || ma125 === 0) {
    return 50;
  }
  const deviationPct = ((price - ma125) / ma125) * 100;
  const { fear, greed } = JAPAN_FG_THRESHOLDS.nikkeiMaDeviationPct;
  return mapToScore(deviationPct, fear, greed);
}

/** C2: 海外投資家の直近4週累積売買差引（億円）から0-100を算出 */
export function normalizeForeignFlow(sum4wOkuYen: number): number {
  if (!Number.isFinite(sum4wOkuYen)) return 50;
  const { fear, greed } = JAPAN_FG_THRESHOLDS.foreignFlow4wOkuYen;
  return mapToScore(sum4wOkuYen, fear, greed);
}

/** C3: 信用倍率から0-100を算出（高いほど個人過熱=greed側） */
export function normalizeMarginRatio(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio < 0) return 50;
  const { fear, greed } = JAPAN_FG_THRESHOLDS.marginRatio;
  return mapToScore(ratio, fear, greed);
}

/** C4: 裁定残の買い残・売り残比率から0-100を算出 */
export function normalizeArbitrageBalance(
  buyBalance: number,
  sellBalance: number
): number {
  const total = buyBalance + sellBalance;
  if (!Number.isFinite(total) || total <= 0) return 50;
  const ratio = buyBalance / total;
  const { fear, greed } = JAPAN_FG_THRESHOLDS.arbitrageRatio;
  return mapToScore(ratio, fear, greed);
}

/** C5: USDJPY 50日モメンタム（%）から0-100を算出（円安=greed） */
export function normalizeUsdJpyMomentum(
  currentRate: number,
  rate50dAgo: number
): number {
  if (
    !Number.isFinite(currentRate) ||
    !Number.isFinite(rate50dAgo) ||
    rate50dAgo === 0
  ) {
    return 50;
  }
  const momentumPct = ((currentRate - rate50dAgo) / rate50dAgo) * 100;
  const { fear, greed } = JAPAN_FG_THRESHOLDS.usdJpyMomentumPct;
  return mapToScore(momentumPct, fear, greed);
}

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

const COMPONENT_LABELS: Record<JapanFearGreedComponentId, string> = {
  nikkeiMa: "日経225モメンタム",
  foreignFlow: "海外投資家フロー",
  marginRatio: "信用倍率",
  arbitrage: "裁定残バランス",
  usdJpyMomentum: "ドル円モメンタム",
};

export interface JapanFearGreedInputs {
  nikkei225Chart: ChartPoint[] | null;
  nikkei225Price: number | null;
  usdJpyRate: number | null;
  usdJpyChart: ChartPoint[] | null;
  investorTrading: InvestorTradingData | null;
  marginTrading: MarginTradingData | null;
  arbitrageBalance: ArbitrageBalanceData | null;
}

/**
 * 日本版市場温度スコアを算出する。
 * 入手可能な要素のみで単純平均（等ウェイト）。2要素未満の場合はnullを返す。
 */
export function computeJapanFearGreed(
  inputs: JapanFearGreedInputs,
  weights?: Partial<Record<JapanFearGreedComponentId, number>>
): JapanFearGreedData | null {
  const components: JapanFearGreedComponent[] = [];

  // C1: 日経225 vs 125日MA
  const ma125 = inputs.nikkei225Chart ? calcMa125(inputs.nikkei225Chart) : null;
  if (inputs.nikkei225Price != null && ma125 != null) {
    components.push({
      id: "nikkeiMa",
      label: COMPONENT_LABELS.nikkeiMa,
      score: normalizeNikkeiMaDeviation(inputs.nikkei225Price, ma125),
      rawValue:
        Math.round(((inputs.nikkei225Price - ma125) / ma125) * 10000) / 100,
      available: true,
      note: "125日移動平均乖離率（%）",
    });
  } else {
    components.push({
      id: "nikkeiMa",
      label: COMPONENT_LABELS.nikkeiMa,
      score: 50,
      rawValue: null,
      available: false,
    });
  }

  // C2: 海外投資家4週累積
  const foreignFlow = calcForeignFlow4w(inputs.investorTrading);
  if (foreignFlow != null) {
    components.push({
      id: "foreignFlow",
      label: COMPONENT_LABELS.foreignFlow,
      score: normalizeForeignFlow(foreignFlow),
      rawValue: Math.round(foreignFlow),
      available: true,
      note: "直近4週累積売買差引（億円）",
    });
  } else {
    components.push({
      id: "foreignFlow",
      label: COMPONENT_LABELS.foreignFlow,
      score: 50,
      rawValue: null,
      available: false,
    });
  }

  // C3: 信用倍率
  const marginRatio = latestMarginRatio(inputs.marginTrading);
  if (marginRatio != null) {
    components.push({
      id: "marginRatio",
      label: COMPONENT_LABELS.marginRatio,
      score: normalizeMarginRatio(marginRatio),
      rawValue: Math.round(marginRatio * 100) / 100,
      available: true,
      note: "買残÷売残",
    });
  } else {
    components.push({
      id: "marginRatio",
      label: COMPONENT_LABELS.marginRatio,
      score: 50,
      rawValue: null,
      available: false,
    });
  }

  // C4: 裁定残バランス
  const arbitrage = latestArbitrageBalance(inputs.arbitrageBalance);
  if (arbitrage != null) {
    const total = arbitrage.buy + arbitrage.sell;
    const ratio = total > 0 ? arbitrage.buy / total : 0;
    components.push({
      id: "arbitrage",
      label: COMPONENT_LABELS.arbitrage,
      score: normalizeArbitrageBalance(arbitrage.buy, arbitrage.sell),
      rawValue: Math.round(ratio * 1000) / 1000,
      available: true,
      note: "買残÷(買残+売残)",
    });
  } else {
    components.push({
      id: "arbitrage",
      label: COMPONENT_LABELS.arbitrage,
      score: 50,
      rawValue: null,
      available: false,
    });
  }

  // C5: USDJPY 50日モメンタム
  let usdJpyScore: number | null = null;
  let usdJpyRaw: number | null = null;
  if (
    inputs.usdJpyRate != null &&
    inputs.usdJpyChart != null &&
    inputs.usdJpyChart.length >= 50
  ) {
    const rate50dAgo = inputs.usdJpyChart[inputs.usdJpyChart.length - 50].value;
    usdJpyScore = normalizeUsdJpyMomentum(inputs.usdJpyRate, rate50dAgo);
    usdJpyRaw =
      Math.round(((inputs.usdJpyRate - rate50dAgo) / rate50dAgo) * 10000) / 100;
  }
  if (usdJpyScore != null) {
    components.push({
      id: "usdJpyMomentum",
      label: COMPONENT_LABELS.usdJpyMomentum,
      score: usdJpyScore,
      rawValue: usdJpyRaw,
      available: true,
      note: "50営業日モメンタム（%）",
    });
  } else {
    components.push({
      id: "usdJpyMomentum",
      label: COMPONENT_LABELS.usdJpyMomentum,
      score: 50,
      rawValue: null,
      available: false,
    });
  }

  const availableComponents = components.filter((c) => c.available);
  const availableCount = availableComponents.length;

  if (availableCount < 2) return null;

  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of availableComponents) {
    const w = weights?.[c.id] ?? 1;
    weightedSum += c.score * w;
    totalWeight += w;
  }
  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;

  return {
    score,
    level: getSentimentLevel(score),
    components,
    availableCount,
    generatedAt: new Date().toISOString(),
  };
}
