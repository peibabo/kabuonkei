import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import usStatsData from "@/data/historical-stats.json";
import jpStatsData from "@/data/japan-historical-stats.json";

export type Market = "us" | "jp";

/** 日本版で選択可能な指数キー */
export type JpIndexKey = "nikkei225" | "topix";

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
  topix?: IndexHistoricalStats;
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

/** JSON に指定指数が出力されているかの判定（未生成の旧ビルド対策） */
export function hasJpIndex(indexKey: JpIndexKey): boolean {
  if (indexKey === "nikkei225") return true;
  const raw = jpStatsData as unknown as RawJpFile;
  return raw.levels.every((l) => l.topix !== undefined);
}

/**
 * 過去統計を正規化形状で取得する。
 *
 * - `market="us"` : S&P500 固定（indexKey は無視）
 * - `market="jp"` : `indexKey` が `"topix"` かつ JSON に存在するとき TOPIX、それ以外は日経225
 *   `indexKey` 省略時のデフォルトは `"nikkei225"`
 */
export function getHistoricalStats(
  market: Market,
  indexKey?: JpIndexKey
): HistoricalStats {
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
  const wantsTopix = indexKey === "topix";
  const resolvedIndex: JpIndexKey =
    wantsTopix && hasJpIndex("topix") ? "topix" : "nikkei225";
  if (wantsTopix && resolvedIndex !== "topix") {
    console.warn(
      "[historical-stats] TOPIX データが JSON に存在しないため日経225 にフォールバックしました"
    );
  }
  return {
    market: "jp",
    generatedAt: raw.generatedAt,
    dataRange: raw.dataRange,
    note: raw.note,
    levels: raw.levels.map((l) => ({
      level: l.level,
      scoreRange: l.scoreRange,
      occurrences: l.occurrences,
      stats: resolvedIndex === "topix" && l.topix ? l.topix : l.nikkei225,
    })),
  };
}

export function getStatsForLevel(
  level: SentimentLevel,
  market: Market,
  indexKey?: JpIndexKey
): SentimentLevelStats | undefined {
  return getHistoricalStats(market, indexKey).levels.find(
    (l) => l.level === level
  );
}

export function getStatsForScore(
  score: number,
  market: Market,
  indexKey?: JpIndexKey
): SentimentLevelStats | undefined {
  return getStatsForLevel(getSentimentLevel(score), market, indexKey);
}
