import type {
  ChartPoint,
  InvestorTradingData,
  MarginTradingData,
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
  JapanFearGreedData,
} from "../types";
import { getSentimentLevel } from "../sentiment";
import { calcMa125, calcForeignFlow4w, calcMarginBuyChange4w } from "./aggregate";
import {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginBuyChange,
} from "./normalize";
import {
  averageGroupScore,
  buildAvailableComponent,
  buildUnavailableComponent,
} from "./component-builder";

export const COMPONENT_LABELS: Record<JapanFearGreedComponentId, string> = {
  nikkeiMa: "日経225モメンタム",
  foreignFlow: "海外投資家フロー",
  marginBuyChange: "信用買い残の増減",
};

export interface JapanFearGreedInputs {
  nikkei225Chart: ChartPoint[] | null;
  nikkei225Price: number | null;
  investorTrading: InvestorTradingData | null;
  /** 4 週変化を出すため 5 週以上あるとよい（`mergeMarginWeeks` で長期履歴を足せる） */
  marginTrading: MarginTradingData | null;
}

/**
 * 日本版の市場温度を算出する。
 *
 * - 市場温度（score）= C1（日経225 の 125 日移動平均乖離）単独。C1 が取れなければ null
 * - 需給の温度（supply）= 海外投資家フロー・信用買い残の 4 週変化の平均。市場温度には混ぜない
 *
 * 2026-11 まで使っていた 5 要素の等ウェイト平均をやめた理由は docs/features/temperature-score.md。
 */
export function computeJapanFearGreed(
  inputs: JapanFearGreedInputs,
): JapanFearGreedData | null {
  const nikkeiMa = buildNikkeiMa(inputs);
  if (!nikkeiMa.available) return null;

  const components: JapanFearGreedComponent[] = [
    nikkeiMa,
    buildForeignFlow(inputs),
    buildMarginBuyChange(inputs),
  ];
  const supply = averageGroupScore(components, "supply");

  return {
    score: nikkeiMa.score,
    level: getSentimentLevel(nikkeiMa.score),
    components,
    supply: supply
      ? {
          score: supply.score,
          level: getSentimentLevel(supply.score),
          availableCount: supply.count,
        }
      : null,
    generatedAt: new Date().toISOString(),
  };
}

// --- 各コンポーネントの算出 ---------------------------------------------------

/**
 * C1: 日経225 vs 125日移動平均乖離率。
 * 移動平均はチャート末尾（= 現在値と同じ立会日）を除いた直前 125 本で取る。
 * 過去推移（scripts/generate-japan-temperature-history.ts）と同じ定義にして、
 * ゲージ・推移チャート・アラートの値を一致させるため。
 */
function buildNikkeiMa(inputs: JapanFearGreedInputs): JapanFearGreedComponent {
  const chart = inputs.nikkei225Chart;
  const ma125 = chart ? calcMa125(chart.slice(0, -1)) : null;
  // 現在値（quote）が取れないときは、チャート末尾の終値で代わりに計算する
  const price = inputs.nikkei225Price ?? chart?.at(-1)?.value ?? null;
  if (price == null || ma125 == null) {
    return buildUnavailableComponent("nikkeiMa", COMPONENT_LABELS.nikkeiMa, "price");
  }
  const rawValue = Math.round(((price - ma125) / ma125) * 10000) / 100;
  return buildAvailableComponent({
    id: "nikkeiMa",
    label: COMPONENT_LABELS.nikkeiMa,
    group: "price",
    score: normalizeNikkeiMaDeviation(price, ma125),
    rawValue,
    note: "125日移動平均乖離率（%）",
  });
}

/** 需給: 海外投資家4週累積売買差引 */
function buildForeignFlow(
  inputs: JapanFearGreedInputs,
): JapanFearGreedComponent {
  const foreignFlow = calcForeignFlow4w(inputs.investorTrading);
  if (foreignFlow == null) {
    return buildUnavailableComponent(
      "foreignFlow",
      COMPONENT_LABELS.foreignFlow,
      "supply",
    );
  }
  return buildAvailableComponent({
    id: "foreignFlow",
    label: COMPONENT_LABELS.foreignFlow,
    group: "supply",
    score: normalizeForeignFlow(foreignFlow),
    rawValue: Math.round(foreignFlow),
    note: "直近4週累積売買差引（億円）",
  });
}

/** 需給: 信用買い残の4週変化率 */
function buildMarginBuyChange(
  inputs: JapanFearGreedInputs,
): JapanFearGreedComponent {
  const change = calcMarginBuyChange4w(inputs.marginTrading);
  if (change == null) {
    return buildUnavailableComponent(
      "marginBuyChange",
      COMPONENT_LABELS.marginBuyChange,
      "supply",
    );
  }
  return buildAvailableComponent({
    id: "marginBuyChange",
    label: COMPONENT_LABELS.marginBuyChange,
    group: "supply",
    score: normalizeMarginBuyChange(change),
    rawValue: Math.round(change * 10) / 10,
    note: "信用買い残の4週変化率（%）",
  });
}
