import { JAPAN_FG_THRESHOLDS } from "./thresholds";
import { mapToScore } from "./utils";

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
