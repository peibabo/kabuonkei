/**
 * 数値・パーセンテージ・日付の共通フォーマッタ。
 * UI 層（HistoricalStatsCard / SimilarDaysCard など）から呼び出される。
 */

/** リターン率を "+1.2%" / "-3.4%" / "—"（null時）形式で整形 */
export function formatReturn(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

/** リターン率の符号に応じた Tailwind カラークラスを返す（日本式: 正=赤/負=緑） */
export function returnColorClass(value: number | null | undefined): string {
  if (value == null) return "text-gray-400";
  return value > 0 ? "text-red-500" : "text-green-500";
}

/**
 * 最大DD の差分（自ポートフォリオDD − 比較対象DD、いずれも負値）を
 * 「X.Xpp 浅い / 深い」形式で整形する。
 * DD は負値なので、差分が正 = 自分のほうが浅い（改善）、負 = 深い（悪化）。
 */
export function formatDrawdownGap(diffPp: number): string {
  const abs = Math.abs(diffPp).toFixed(1);
  return diffPp >= 0 ? `${abs}pp 浅い` : `${abs}pp 深い`;
}

/** formatDrawdownGap と対になる色クラス（浅い=emerald / 深い=amber） */
export function drawdownGapColorClass(diffPp: number): string {
  return diffPp >= 0 ? "text-emerald-700" : "text-amber-700";
}
