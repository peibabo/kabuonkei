import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import {
  type HistoricalStats,
  type IndexHistoricalStats,
  type SentimentLevelStats,
} from "./historical-stats";
import crossStatsData from "@/data/cross-historical-stats.json";

/**
 * クロス分析の方向
 * - `usTempJpIdx`: 米国温度（VIX 推定）× 日経225
 * - `jpTempUsIdx`: 日本温度（C1+C5 簡易）× S&P500
 */
export type CrossDirection = "usTempJpIdx" | "jpTempUsIdx";

interface RawDirectionLevel {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  stats: IndexHistoricalStats;
}

interface RawCrossFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  note?: string;
  directions: Record<CrossDirection, { levels: RawDirectionLevel[] }>;
}

export const CROSS_DIRECTION_META: Record<
  CrossDirection,
  {
    label: string; // タブ表示ラベル（🇺🇸×🇯🇵 等）
    title: string; // カード小見出し
    temperatureLabel: string; // 「米国版温度」「日本版温度」
    indexLabel: string; // 「日経225」「S&P500」
    indexPhrase: string; // ハイライト文での「〜が上昇」表現
  }
> = {
  usTempJpIdx: {
    label: "🇺🇸 × 🇯🇵",
    title: "米国温度 × 日経225",
    temperatureLabel: "米国版温度",
    indexLabel: "日経225",
    indexPhrase: "日経225が上昇",
  },
  jpTempUsIdx: {
    label: "🇯🇵 × 🇺🇸",
    title: "日本温度 × S&P500",
    temperatureLabel: "日本版温度",
    indexLabel: "S&P500",
    indexPhrase: "S&P500が上昇",
  },
};

export function getCrossHistoricalStats(
  direction: CrossDirection
): HistoricalStats {
  const raw = crossStatsData as unknown as RawCrossFile;
  const bundle = raw.directions[direction];
  return {
    market: direction === "usTempJpIdx" ? "us" : "jp",
    generatedAt: raw.generatedAt,
    dataRange: raw.dataRange,
    note: raw.note,
    levels: bundle.levels.map((l) => ({
      level: l.level,
      scoreRange: l.scoreRange,
      occurrences: l.occurrences,
      stats: l.stats,
    })),
  };
}

export function getCrossStatsForLevel(
  level: SentimentLevel,
  direction: CrossDirection
): SentimentLevelStats | undefined {
  return getCrossHistoricalStats(direction).levels.find(
    (l) => l.level === level
  );
}

export function getCrossStatsForScore(
  score: number,
  direction: CrossDirection
): SentimentLevelStats | undefined {
  return getCrossStatsForLevel(getSentimentLevel(score), direction);
}
