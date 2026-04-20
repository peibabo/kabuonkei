import type { SimilarDayEntry, SimilarDayMatch } from "../types";

/**
 * 現在の温度スコアに最も近い過去日を TOP N 件返す。
 *
 * - `return3m` が null のエントリ（最近すぎて 3ヶ月先が未到達）は除外する
 * - スコア差が同率の場合はイベントラベル付きを優先（話題性のあるナラティブ）
 * - さらに同率の場合は新しい日付を優先（直近の方が相場環境として近い）
 *
 * JSON 依存を持たない純粋関数。`src/lib/similar-days.ts`（barrel 兼 JSON アクセサ）からも、
 * `scripts/` の tsx スクリプトからも共有できるよう独立ファイルに分離している。
 */
export function findSimilarDays(
  currentScore: number,
  history: SimilarDayEntry[],
  events: Record<string, string>,
  topN: number = 5,
): SimilarDayMatch[] {
  return history
    .filter((h) => h.return3m !== null)
    .map<SimilarDayMatch>((h) => ({
      ...h,
      scoreDiff: Math.abs(h.score - currentScore),
      eventLabel: events[h.date],
    }))
    .sort((a, b) => {
      if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
      const aHasLabel = Boolean(a.eventLabel);
      const bHasLabel = Boolean(b.eventLabel);
      if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1;
      return b.date.localeCompare(a.date);
    })
    .slice(0, topN);
}
