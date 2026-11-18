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

// 日米共通の期間切り出しは中立なモジュールへ移した（既存の import 先を壊さないよう再エクスポート）
export { sliceByDays, sliceByDaysAround } from "./slice-by-days";

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
