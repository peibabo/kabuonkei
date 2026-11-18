import type { SimilarDayEntry, SimilarDayMatch } from "../types";

/** 同じ局面とみなす日数（これより近い日は上位に 1 件だけ残す） */
export const SAME_EPISODE_DAYS = 30;

/**
 * 同じ局面の中にイベント名つきの日があれば、温度差がこの幅以内なら代表をそちらにする
 * （/events への導線を残すため。似ている度合いは大きく崩さない）
 */
export const LABEL_SCORE_TOLERANCE = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / DAY_MS;
}

/**
 * 現在の温度スコアに最も近い過去日を TOP N 件返す。
 *
 * - `return3m` が null のエントリ（最近すぎて 3ヶ月先が未到達）は除外する
 * - スコア差が同率の場合はイベントラベル付きを優先（話題性のあるナラティブ）
 * - さらに同率の場合は新しい日付を優先（直近の方が相場環境として近い）
 * - 選んだ日から 30 暦日以内の日は同じ局面とみなして除外する（上位が 1 局面に偏らないように）
 * - 代表の日にラベルがなく、同じ局面にラベルつきの日（温度差 +2 以内）があればそちらを代表にする
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
  const sorted = history
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
    });

  // 同じ局面の日（例: 2025-04-17 / 04-21 / 04-22）で上位が埋まらないよう、
  // すでに選んだ日から SAME_EPISODE_DAYS 日以内の日は飛ばす
  const anchors: SimilarDayMatch[] = [];
  for (const m of sorted) {
    if (anchors.length >= topN) break;
    if (anchors.some((p) => daysBetween(p.date, m.date) <= SAME_EPISODE_DAYS)) continue;
    anchors.push(m);
  }

  // 代表の日にラベルがなく、同じ局面（30 日以内）にラベルつきの近い日があれば差し替える。
  // sorted はスコア差の小さい順なので、最初に見つかったものが最も近い
  const swapped = anchors.map((anchor) => {
    if (anchor.eventLabel) return anchor;
    const labeled = sorted.find(
      (m) =>
        m.eventLabel &&
        m.scoreDiff <= anchor.scoreDiff + LABEL_SCORE_TOLERANCE &&
        daysBetween(m.date, anchor.date) <= SAME_EPISODE_DAYS,
    );
    return labeled ?? anchor;
  });
  // 差し替えで同じ日が重なったら 1 件にし、表示順（スコア差の小さい順）を保つ
  const unique = swapped.filter(
    (m, i) => swapped.findIndex((x) => x.date === m.date) === i,
  );
  return unique.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
}
