import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import usStatsData from "@/data/historical-stats.json";
import jpStatsData from "@/data/japan-historical-stats.json";

export type Market = "us" | "jp";

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

/** 1温度帯の統計（市場共通の正規化形状） */
export interface SentimentLevelStats {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  stats: IndexHistoricalStats;
}

/** 過去統計データ全体（市場共通の正規化形状） */
export interface HistoricalStats {
  market: Market;
  generatedAt: string;
  dataRange: { from: string; to: string };
  note?: string;
  levels: SentimentLevelStats[];
}

interface RawUsLevel {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  sp500: IndexHistoricalStats;
}

interface RawJpLevel {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  nikkei225: IndexHistoricalStats;
}

interface RawUsFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  levels: RawUsLevel[];
}

interface RawJpFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  note: string;
  levels: RawJpLevel[];
}

export function getHistoricalStats(market: Market): HistoricalStats {
  if (market === "us") {
    const raw = usStatsData as unknown as RawUsFile;
    return {
      market: "us",
      generatedAt: raw.generatedAt,
      dataRange: raw.dataRange,
      levels: raw.levels.map((l) => ({
        level: l.level,
        scoreRange: l.scoreRange,
        occurrences: l.occurrences,
        stats: l.sp500,
      })),
    };
  }
  const raw = jpStatsData as unknown as RawJpFile;
  return {
    market: "jp",
    generatedAt: raw.generatedAt,
    dataRange: raw.dataRange,
    note: raw.note,
    levels: raw.levels.map((l) => ({
      level: l.level,
      scoreRange: l.scoreRange,
      occurrences: l.occurrences,
      stats: l.nikkei225,
    })),
  };
}

export function getStatsForLevel(
  level: SentimentLevel,
  market: Market
): SentimentLevelStats | undefined {
  return getHistoricalStats(market).levels.find((l) => l.level === level);
}

export function getStatsForScore(
  score: number,
  market: Market
): SentimentLevelStats | undefined {
  return getStatsForLevel(getSentimentLevel(score), market);
}
