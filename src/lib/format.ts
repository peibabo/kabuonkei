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
