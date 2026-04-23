/**
 * ヒートマップセルの塗り分け（日本式: 正=赤 / 負=緑）を返す純粋関数。
 * 強度は maxAbs に対する相対値で alpha を計算し、サンプル数が少ないセルは更に薄くする。
 */
export function heatmapCellStyle(
  avgReturn: number,
  maxAbs: number,
  isLowSample: boolean
): React.CSSProperties {
  if (maxAbs === 0) return {};
  const intensity = Math.min(Math.abs(avgReturn) / maxAbs, 1);
  // 0.06 〜 0.55 の alpha にマップ。サンプル薄のセルは更に半減。
  const alpha = (0.06 + intensity * 0.49) * (isLowSample ? 0.4 : 1);
  const rgb = avgReturn >= 0 ? "220, 38, 38" : "34, 197, 94";
  return { backgroundColor: `rgba(${rgb}, ${alpha})` };
}
