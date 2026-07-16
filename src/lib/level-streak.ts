/**
 * 日本の温度レベル（極寒〜沸騰）が何営業日続いているかを計算する。
 *
 * データ源は japan-fg-snapshots.json（full5 法、平日 17:00 JST に毎営業日追記）。
 * ライブスコアと同一手法なのでレベル判定が一致する。
 * 米国側は日次履歴を保存していないため、streak は日本片側のみ。
 */

import { getSentimentLevel } from "./sentiment";

export interface JapanLevelStreakParams {
  /** ライブの日本温度スコア（full5 法）。null = データ欠損 */
  currentScore: number | null;
  /** getFullSnapshots() の時系列（日付昇順） */
  snapshots: ReadonlyArray<{ date: string; score: number }>;
  /** getJstDateKey() の "YYYY-MM-DD"。当日スナップショットの二重カウント防止と鮮度判定に使う */
  todayJstKey: string;
  /** 直近スナップショットとの許容ギャップ（暦日）。週末 + 祝日連休を許容する既定 4 */
  maxGapDays?: number;
}

/** "YYYY-MM-DD" 同士の暦日差（a - b） */
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86_400_000);
}

/**
 * 現在の日本レベルの連続営業日数（当日含む）を返す。
 *
 * - currentScore が null → null（不明）
 * - スナップショットが無い / 直近が maxGapDays より古い → 1（当日のみ。欠落時に「N日目」と誇張しない）
 * - それ以外 → 末尾から当日と同レベルが続く本数 + 当日分 1
 */
export function computeJapanLevelStreak({
  currentScore,
  snapshots,
  todayJstKey,
  maxGapDays = 4,
}: JapanLevelStreakParams): number | null {
  if (currentScore == null) return null;

  const currentLevel = getSentimentLevel(currentScore);

  // 17:00 JST 以降は当日分が既に追記されているため、過去日分のみ数える
  const past = snapshots.filter((s) => s.date < todayJstKey);
  if (past.length === 0) return 1;

  const latest = past[past.length - 1];
  if (diffDays(todayJstKey, latest.date) > maxGapDays) return 1;

  let streak = 1; // 当日分
  for (let i = past.length - 1; i >= 0; i--) {
    if (getSentimentLevel(past[i].score) !== currentLevel) break;
    streak++;
  }
  return streak;
}
