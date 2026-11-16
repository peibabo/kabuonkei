import type { JapanFearGreedComponent } from "@/lib/types";

/**
 * 日本版アラートの判定に使う「株価ベース」スコア。
 *
 * 5要素の総合スコアではなく、日次で動く C1（日経225 の 125 日移動平均乖離）と
 * C5（ドル円 50 日モメンタム）の平均で判定する。理由:
 *   - 需給 3 要素（C2〜C4）は週次公表で遅れ、かつ高止まりしやすい。総合スコアは
 *     C1・C5 が 0 でも 50 前後までしか下がらず、極寒（≤20）に事実上届かない
 *   - 過去統計・類似日は C1+C5 の 2 要素版で計算しており、通知の根拠と基準が揃う
 */
export function computeJpAlertScore(components: {
  nikkeiMa: number;
  usdJpyMomentum: number;
}): number {
  return Math.round((components.nikkeiMa + components.usdJpyMomentum) / 2);
}

/**
 * 画面側（`JapanFearGreedData.components`）から株価ベーススコアを求める。
 * C1・C5 のどちらかが欠損なら null（片方だけでは判定しない）。
 */
export function jpAlertScoreFromComponents(
  components: readonly JapanFearGreedComponent[] | null | undefined,
): number | null {
  const find = (id: JapanFearGreedComponent["id"]) =>
    components?.find((c) => c.id === id && c.available);
  const nikkeiMa = find("nikkeiMa");
  const usdJpyMomentum = find("usdJpyMomentum");
  if (!nikkeiMa || !usdJpyMomentum) return null;
  return computeJpAlertScore({
    nikkeiMa: nikkeiMa.score,
    usdJpyMomentum: usdJpyMomentum.score,
  });
}
