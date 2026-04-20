/**
 * 温度推移チャートの X 軸日付フォーマッタ。
 * longPeriod=true（5Y/10Y）なら年/月表示、false なら月/日表示。
 */
export function formatXAxisDate(dateStr: string, longPeriod = false): string {
  const [year, month, day] = dateStr.split("-");
  if (longPeriod) return `${year}/${Number(month)}`;
  return `${Number(month)}/${Number(day)}`;
}
