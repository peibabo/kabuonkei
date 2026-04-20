/** JST（日本標準時）を扱う共通ユーティリティ */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/**
 * 指定日（省略時は現在時刻）を JST に変換し、"M/D(曜)" 形式のラベルを返す。
 * 例: 2026-04-20T10:00+09:00 → "4/20(月)"
 */
export function formatJstDateLabel(date: Date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const weekday = WEEKDAYS[jst.getUTCDay()];
  return `${month}/${day}(${weekday})`;
}
