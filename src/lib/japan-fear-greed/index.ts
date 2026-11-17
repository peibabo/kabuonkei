export { JAPAN_FG_THRESHOLDS } from "./thresholds";
export {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginBuyChange,
  normalizeMarginRatio,
  normalizeArbitrageBalance,
  normalizeUsdJpyMomentum,
} from "./normalize";
export {
  calcMa125,
  calcForeignFlow4w,
  calcMarginBuyChange4w,
  mergeMarginWeeks,
  latestMarginRatio,
  latestArbitrageBalance,
} from "./aggregate";
export { computeJapanFearGreed, COMPONENT_LABELS } from "./compute";
export type { JapanFearGreedInputs } from "./compute";
