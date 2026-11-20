/**
 * 日本版の閾値定数。fear → 0 / greed → 100 に線形マップして clamp する。
 *
 * 現行で使うのは nikkeiMaDeviationPct（市場温度）と、需給の要素の
 * foreignFlow4wOkuYen / marginBuyChange4wPct の 3 つ（需給の score は画面では使わず、実数だけを出す）。
 * marginRatio / arbitrageRatio / usdJpyMomentumPct は 2026-11 まで使っていた旧 5 要素版のもので、
 * 過去スナップショットの再計算（scripts/_lib/snapshot-backfill.ts）と試算スクリプトのために残している。
 */
export const JAPAN_FG_THRESHOLDS = {
  // 日経225の125日MA乖離率: ±15% で極端
  nikkeiMaDeviationPct: { fear: -15, greed: 15 },
  // 海外投資家の直近4週累積売買差引（億円）: ±2兆円
  foreignFlow4wOkuYen: { fear: -20000, greed: 20000 },
  // 信用買い残の4週変化率（%）: ±15%（2003〜2026 の全期間で p5 -12.8% / p95 +15.3%）。
  // 投げ売りで買残が減る局面を拾う。倍率の水準は時代で基準がずれ、急落初週は売残の買い戻しで
  // むしろ上がるため使わない（npm run analyze:margin-score）
  marginBuyChange4wPct: { fear: -15, greed: 15 },
  // --- 以下は旧 5 要素版（現行のスコアには使わない） ---
  // 信用倍率: 日本市場は構造的に倍率が高く、近年は 6-8 倍が常態。極度の悲観でも ~2、
  // euphoria で ~10+ を想定。greed=6.0 では実データ（6.6-7.5）が全件上限張り付きになるため拡大。
  // ※ JPX 信用倍率ページは直近約5週分しか取得できず長期履歴がないため、構造特性ベースの推定値。
  marginRatio: { fear: 2.0, greed: 10.0 },
  // 裁定残バランス比率 buy/(buy+sell): 日本の裁定売り残は構造的に極小で、比率は 0.93〜1.00 程度の狭い範囲でしか動かない。
  // greed=0.98 では実データ（0.97-1.00）がほぼ全件上限張り付きになるため上限まで拡大。
  // ※ 指標自体のダイナミックレンジが構造的に狭く、拡大しても上限寄りは残る（将来の指標見直し候補）。
  arbitrageRatio: { fear: 0.9, greed: 1.0 },
  // USDJPY 50日モメンタム（%）: ±5% で極端
  usdJpyMomentumPct: { fear: -5, greed: 5 },
} as const;
