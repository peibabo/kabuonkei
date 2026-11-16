import type {
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
} from "../types";

/** 株価系: 日次で動く要素（C1・C5） */
const PRICE_IDS: readonly JapanFearGreedComponentId[] = [
  "nikkeiMa",
  "usdJpyMomentum",
];
/** 需給系: JPX の週次・遅行データに基づく要素（C2〜C4） */
const SUPPLY_IDS: readonly JapanFearGreedComponentId[] = [
  "foreignFlow",
  "marginRatio",
  "arbitrage",
];

/**
 * 株価系と需給系の差がこの値以上の日に、ゲージ下へ内訳の補足を出す。
 * 5要素が揃う 148 日（〜2026-11-13）のうち約 2 割が該当する水準。
 */
export const GROUP_SPLIT_THRESHOLD = 30;

export interface GroupSplit {
  /** 株価系（C1・C5）の平均 */
  price: number;
  /** 需給系（C2〜C4）の平均 */
  supply: number;
  /** 需給 − 株価（表示値どうしの差） */
  gap: number;
}

function average(
  components: readonly JapanFearGreedComponent[],
  ids: readonly JapanFearGreedComponentId[],
): number | null {
  const scores = components
    .filter((c) => c.available && ids.includes(c.id))
    .map((c) => c.score);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * 株価系・需給系それぞれの平均を返す。総合スコアの計算には使わない（表示専用）。
 * どちらかの系に利用可能な要素がなければ null。
 */
export function computeGroupSplit(
  components: readonly JapanFearGreedComponent[],
): GroupSplit | null {
  const price = average(components, PRICE_IDS);
  const supply = average(components, SUPPLY_IDS);
  if (price == null || supply == null) return null;
  return { price, supply, gap: supply - price };
}

/** 株価系と需給系が大きく離れているか（補足を出すか） */
export function isGroupSplitNotable(split: GroupSplit | null): boolean {
  return split != null && Math.abs(split.gap) >= GROUP_SPLIT_THRESHOLD;
}
