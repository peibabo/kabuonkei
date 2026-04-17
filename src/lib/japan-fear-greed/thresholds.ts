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
