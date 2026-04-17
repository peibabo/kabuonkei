import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import statsData from "@/data/japan-historical-stats.json";

export interface PeriodStats {
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  sampleSize: number;
}

export interface IndexHistoricalStats {
  "1m": PeriodStats;
  "3m": PeriodStats;
  "6m": PeriodStats;
}

export interface JapanSentimentLevelStats {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  nikkei225: IndexHistoricalStats;
}

export interface JapanHistoricalStats {
  generatedAt: string;
  dataRange: { from: string; to: string };
  note: string;
  levels: JapanSentimentLevelStats[];
}

export function getJapanHistoricalStats(): JapanHistoricalStats {
  return statsData as unknown as JapanHistoricalStats;
}

export function getJapanStatsForLevel(
  level: SentimentLevel
): JapanSentimentLevelStats | undefined {
  return (statsData as unknown as JapanHistoricalStats).levels.find(
    (l) => l.level === level
  );
}

export function getJapanStatsForScore(
  score: number
): JapanSentimentLevelStats | undefined {
  return getJapanStatsForLevel(getSentimentLevel(score));
}
