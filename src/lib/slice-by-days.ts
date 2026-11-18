/** 日付つきの系列を暦日で切り出す汎用関数（日米の温度推移チャートで共有）。データ JSON に依存しない */

/**
 * 指定日数分だけ末尾を切り出す。
 * 日付ベース（カレンダー日数）で絞り込む。
 */
export function sliceByDays<T extends { date: string }>(
  points: readonly T[],
  days: number
): T[] {
  if (points.length === 0) return [];
  const lastDate = points[points.length - 1].date;
  // "YYYY-MM-DD" は UTC 0 時として解釈されるので、日付の加減算も UTC で行う
  // （ローカルの setDate だとサマータイムのある地域で 1 日ずれることがある）
  const cutoff = new Date(lastDate);
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return points.filter((p) => p.date >= cutoffStr);
}

/**
 * 中心日 centerDate の前後 days 日（カレンダー日）に入るポイントを切り出す。
 * イベント詳細ページで「イベント前後 ±90日」の温度推移を描画するのに使う。
 * 中心日が履歴の先頭より前 / 末尾より後でも、重なる範囲があればその部分だけ返す。
 * `date: string` プロパティさえ持てば型は自由（日米両方の温度履歴で共有できるよう汎用化）。
 */
export function sliceByDaysAround<T extends { date: string }>(
  points: readonly T[],
  centerDate: string,
  days: number
): T[] {
  if (points.length === 0) return [];
  const center = new Date(centerDate);
  const start = new Date(center);
  start.setUTCDate(center.getUTCDate() - days);
  const end = new Date(center);
  end.setUTCDate(center.getUTCDate() + days);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  return points.filter((p) => p.date >= startStr && p.date <= endStr);
}
