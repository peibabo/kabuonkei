import type { JapanFearGreedComponent } from "@/lib/types";

/**
 * 日本版アラートの判定に使うスコア = C1（日経225 の 125 日移動平均乖離）単独。
 *
 * 5要素の総合スコアでも、C1・C5 の平均でもなく、C1 だけで判定する。理由:
 *   - 需給 3 要素（C2〜C4）は週次公表で遅れ、かつ高止まりしやすい。総合スコアは
 *     C1・C5 が 0 でも 50 前後までしか下がらず、極寒（≤20）に事実上届かない
 *   - C5（ドル円モメンタム）を足すと、2007-07 以降の過去データで通知が増え
 *     （極寒 41 → 72 回）、通知後のリターンと急落日の捕捉がどちらも悪くなる
 *     （`npm run analyze:jp-composition`）
 */
export function computeJpAlertScore(components: { nikkeiMa: number }): number {
  return Math.round(components.nikkeiMa);
}

/**
 * 画面側（`JapanFearGreedData.components`）から判定スコアを求める。
 * C1 が欠損なら null。
 */
export function jpAlertScoreFromComponents(
  components: readonly JapanFearGreedComponent[] | null | undefined,
): number | null {
  const nikkeiMa = components?.find((c) => c.id === "nikkeiMa" && c.available);
  if (!nikkeiMa) return null;
  return computeJpAlertScore({ nikkeiMa: nikkeiMa.score });
}
