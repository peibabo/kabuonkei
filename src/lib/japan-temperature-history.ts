import historyData from "@/data/japan-temperature-history.json";

/**
 * 日本版 市場温度の過去推移（日次）。
 *
 * score は C1（日経225 の 125 日移動平均乖離を 0〜100 にしたもの）で、ゲージ・アラート・
 * 過去統計・類似日と同じ定義。平日 17 時台に `scripts/generate-japan-temperature-history.ts` で
 * 全期間を再生成する（価格だけから計算できるので過去分も同じ式で揃う）。
 *
 * 2026-11 まで記録していた 5 要素版のスナップショット（`japan-fg-snapshots.json`）は
 * 記録として残しているが、画面では使わない。
 */
export interface JapanTempPoint {
  date: string; // "YYYY-MM-DD"
  score: number; // 0-100
  /** 日経225 終値 */
  nikkei?: number;
}

interface HistoryFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  method: string;
  note: string;
  daily: Array<{ date: string; score: number; nikkei?: number }>;
}

/** 静的 JSON から市場温度の日次推移を取得（日付昇順） */
export function getJapanHistory(): JapanTempPoint[] {
  const file = historyData as HistoryFile;
  return file.daily.map((d) => ({
    date: d.date,
    score: d.score,
    nikkei: d.nikkei,
  }));
}

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
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - days);
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
  start.setDate(center.getDate() - days);
  const end = new Date(center);
  end.setDate(center.getDate() + days);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  return points.filter((p) => p.date >= startStr && p.date <= endStr);
}

/**
 * sessionDate（現在値の立会日）より前で、最後に記録された温度。
 * 「昨日比」に使う。17 時以降は当日分も記録済みなので、当日を除いて前営業日と比べる。
 */
export function previousScoreBefore(
  history: readonly JapanTempPoint[],
  sessionDate: string
): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].date < sessionDate) return history[i].score;
  }
  return null;
}
