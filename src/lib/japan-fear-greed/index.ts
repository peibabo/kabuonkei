export { JAPAN_FG_THRESHOLDS } from "./thresholds";
export {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginRatio,
  normalizeArbitrageBalance,
  normalizeUsdJpyMomentum,
} from "./normalize";
export {
  calcMa125,
  calcForeignFlow4w,
  latestMarginRatio,
  latestArbitrageBalance,
} from "./aggregate";
export { computeJapanFearGreed } from "./compute";
export type { JapanFearGreedInputs } from "./compute";
