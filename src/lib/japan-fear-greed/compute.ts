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
import {
  buildAvailableComponent,
  buildUnavailableComponent,
  computeWeightedScore,
} from "./component-builder";

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
  weights?: Partial<Record<JapanFearGreedComponentId, number>>,
): JapanFearGreedData | null {
  const components: JapanFearGreedComponent[] = [
    buildNikkeiMa(inputs),
    buildForeignFlow(inputs),
    buildMarginRatio(inputs),
    buildArbitrage(inputs),
    buildUsdJpyMomentum(inputs),
  ];

  const availableCount = components.filter((c) => c.available).length;
  if (availableCount < 2) return null;

  const score = computeWeightedScore(components, weights);

  return {
    score,
    level: getSentimentLevel(score),
    components,
    availableCount,
    generatedAt: new Date().toISOString(),
  };
}

// --- 各コンポーネントの算出 ---------------------------------------------------

/** C1: 日経225 vs 125日移動平均乖離率 */
function buildNikkeiMa(inputs: JapanFearGreedInputs): JapanFearGreedComponent {
  const ma125 = inputs.nikkei225Chart ? calcMa125(inputs.nikkei225Chart) : null;
  if (inputs.nikkei225Price == null || ma125 == null) {
    return buildUnavailableComponent("nikkeiMa", COMPONENT_LABELS.nikkeiMa);
  }
  const rawValue =
    Math.round(((inputs.nikkei225Price - ma125) / ma125) * 10000) / 100;
  return buildAvailableComponent({
    id: "nikkeiMa",
    label: COMPONENT_LABELS.nikkeiMa,
    score: normalizeNikkeiMaDeviation(inputs.nikkei225Price, ma125),
    rawValue,
    note: "125日移動平均乖離率（%）",
  });
}

/** C2: 海外投資家4週累積売買差引 */
function buildForeignFlow(
  inputs: JapanFearGreedInputs,
): JapanFearGreedComponent {
  const foreignFlow = calcForeignFlow4w(inputs.investorTrading);
  if (foreignFlow == null) {
    return buildUnavailableComponent(
      "foreignFlow",
      COMPONENT_LABELS.foreignFlow,
    );
  }
  return buildAvailableComponent({
    id: "foreignFlow",
    label: COMPONENT_LABELS.foreignFlow,
    score: normalizeForeignFlow(foreignFlow),
    rawValue: Math.round(foreignFlow),
    note: "直近4週累積売買差引（億円）",
  });
}

/** C3: 信用倍率 */
function buildMarginRatio(
  inputs: JapanFearGreedInputs,
): JapanFearGreedComponent {
  const marginRatio = latestMarginRatio(inputs.marginTrading);
  if (marginRatio == null) {
    return buildUnavailableComponent(
      "marginRatio",
      COMPONENT_LABELS.marginRatio,
    );
  }
  return buildAvailableComponent({
    id: "marginRatio",
    label: COMPONENT_LABELS.marginRatio,
    score: normalizeMarginRatio(marginRatio),
    rawValue: Math.round(marginRatio * 100) / 100,
    note: "買残÷売残",
  });
}

/** C4: 裁定残バランス */
function buildArbitrage(inputs: JapanFearGreedInputs): JapanFearGreedComponent {
  const arbitrage = latestArbitrageBalance(inputs.arbitrageBalance);
  if (arbitrage == null) {
    return buildUnavailableComponent("arbitrage", COMPONENT_LABELS.arbitrage);
  }
  const total = arbitrage.buy + arbitrage.sell;
  const ratio = total > 0 ? arbitrage.buy / total : 0;
  return buildAvailableComponent({
    id: "arbitrage",
    label: COMPONENT_LABELS.arbitrage,
    score: normalizeArbitrageBalance(arbitrage.buy, arbitrage.sell),
    rawValue: Math.round(ratio * 1000) / 1000,
    note: "買残÷(買残+売残)",
  });
}

/** C5: USDJPY 50日モメンタム */
function buildUsdJpyMomentum(
  inputs: JapanFearGreedInputs,
): JapanFearGreedComponent {
  if (
    inputs.usdJpyRate == null ||
    inputs.usdJpyChart == null ||
    inputs.usdJpyChart.length < 50
  ) {
    return buildUnavailableComponent(
      "usdJpyMomentum",
      COMPONENT_LABELS.usdJpyMomentum,
    );
  }
  const rate50dAgo = inputs.usdJpyChart[inputs.usdJpyChart.length - 50].value;
  const rawValue =
    Math.round(((inputs.usdJpyRate - rate50dAgo) / rate50dAgo) * 10000) / 100;
  return buildAvailableComponent({
    id: "usdJpyMomentum",
    label: COMPONENT_LABELS.usdJpyMomentum,
    score: normalizeUsdJpyMomentum(inputs.usdJpyRate, rate50dAgo),
    rawValue,
    note: "50営業日モメンタム（%）",
  });
}
