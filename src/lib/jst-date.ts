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

/**
 * Unix ミリ秒を JST に変換し、"M/D HH:MM JST" 形式のラベルを返す。
 * null / undefined / NaN のときは "—" を返す。
 * 例: 1713657300000 (2024-04-21 07:15 UTC) → "4/21 16:15 JST"
 */
export function formatJstDateTimeLabel(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const jst = new Date(ms + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hh}:${mm} JST`;
}
