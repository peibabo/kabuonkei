import type {
  ChartPoint,
  InvestorTradingData,
  ArbitrageBalanceData,
  MarginTradingData,
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
  JapanFearGreedData,
} from "../types";
import { getSentimentLevel } from "../sentiment";
import {
  calcMa125,
  calcForeignFlow4w,
  latestMarginRatio,
  latestArbitrageBalance,
} from "./aggregate";
import {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginRatio,
  normalizeArbitrageBalance,
  normalizeUsdJpyMomentum,
} from "./normalize";

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
