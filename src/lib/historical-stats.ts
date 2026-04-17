import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import statsData from "@/data/historical-stats.json";

/** 期間ごとの統計 */
export interface PeriodStats {
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  sampleSize: number;
}

/** 1指数の全期間統計 */
export interface IndexHistoricalStats {
  "1m": PeriodStats;
  "3m": PeriodStats;
  "6m": PeriodStats;
}

/** 1温度帯の統計 */
export interface SentimentLevelStats {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  sp500: IndexHistoricalStats;
}

/** 過去統計データ全体 */
export interface HistoricalStats {
  generatedAt: string;
  dataRange: { from: string; to: string };
  levels: SentimentLevelStats[];
}

export function getHistoricalStats(): HistoricalStats {
  return statsData as unknown as HistoricalStats;
}

export function getStatsForLevel(
  level: SentimentLevel
): SentimentLevelStats | undefined {
  return (statsData as unknown as HistoricalStats).levels.find(
    (l) => l.level === level
  );
}

export function getStatsForScore(
  score: number
): SentimentLevelStats | undefined {
  return getStatsForLevel(getSentimentLevel(score));
}
