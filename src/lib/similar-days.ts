import japanData from "@/data/japan-similar-days.json";
import usData from "@/data/us-similar-days.json";
import eventData from "@/data/market-events.json";
import type {
  SimilarDayEntry,
  SimilarDayMatch,
  SimilarDaysFile,
} from "./types";

export function getJapanSimilarDays(): SimilarDayEntry[] {
  return (japanData as SimilarDaysFile).daily;
}

export function getUsSimilarDays(): SimilarDayEntry[] {
  return (usData as SimilarDaysFile).daily;
}

export function getJapanSimilarDaysFile(): SimilarDaysFile {
  return japanData as SimilarDaysFile;
}

export function getUsSimilarDaysFile(): SimilarDaysFile {
  return usData as SimilarDaysFile;
}

export function getMarketEvents(): Record<string, string> {
  return eventData as Record<string, string>;
}

/**
 * 現在の温度スコアに最も近い過去日を TOP N 件返す。
 *
 * - `return3m` が null のエントリ（最近すぎて 3ヶ月先が未到達）は除外する
 * - スコア差が同率の場合はイベントラベル付きを優先（話題性のあるナラティブ）
 * - さらに同率の場合は新しい日付を優先（直近の方が相場環境として近い）
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
