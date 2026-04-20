/** OG 画像ルート（/api/og/daily）のクエリパラメータ整形用の純粋関数群 */

export { formatJstDateLabel } from "@/lib/jst-date";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "2026-04-20" → "4/20(月)" / パース不能なら null */
export function labelFromIsoDate(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (Number.isNaN(date.getTime())) return null;
  const weekday = WEEKDAYS[date.getUTCDay()];
  return `${Number(mo)}/${Number(d)}(${weekday})`;
}

/** 0-100 の整数に丸めて範囲外なら null */
export function parseScore(raw: string | null): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return Math.round(n);
}
