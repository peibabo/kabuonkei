import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";
import type { IndexHistoricalStats, PeriodStats } from "./historical-stats";
import heatmapData from "@/data/japan-sector-heatmap.json";

export type SectorPeriodKey = "1m" | "3m" | "6m";

export interface SectorLevelStats {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  stats: IndexHistoricalStats;
}

export interface SectorEntry {
  code: string;
  symbol: string;
  name: string;
  levels: SectorLevelStats[];
}

export interface SectorHeatmap {
  generatedAt: string;
  dataRange: { from: string; to: string };
  note: string;
  sectors: SectorEntry[];
}

interface RawFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  note: string;
  sectors: SectorEntry[];
}

export function getJapanSectorHeatmap(): SectorHeatmap {
  const raw = heatmapData as unknown as RawFile;
  return {
    generatedAt: raw.generatedAt,
    dataRange: raw.dataRange,
    note: raw.note,
    sectors: raw.sectors,
  };
}

function findLevelStats(
  sector: SectorEntry,
  level: SentimentLevel
): SectorLevelStats | null {
  return sector.levels.find((l) => l.level === level) ?? null;
}

export function getSectorStatsForScore(
  score: number,
  sectorCode: string,
  period: SectorPeriodKey
): PeriodStats | null {
  const heatmap = getJapanSectorHeatmap();
  const sector = heatmap.sectors.find((s) => s.code === sectorCode);
  if (!sector) return null;
  const levelStats = findLevelStats(sector, getSentimentLevel(score));
  return levelStats ? levelStats.stats[period] : null;
}

export interface SectorRanking {
  sector: SectorEntry;
  levelStats: SectorLevelStats;
  stats: PeriodStats;
}

/**
 * 指定スコアの温度帯で該当期間の平均リターンが高かったセクター順のランキングを返す。
 * サンプル数 0 のセクターは除外する。
 */
export function getTopSectorsForScore(
  score: number,
  period: SectorPeriodKey,
  limit = 5
): SectorRanking[] {
  const heatmap = getJapanSectorHeatmap();
  const level = getSentimentLevel(score);
  const rankings: SectorRanking[] = [];
  for (const sector of heatmap.sectors) {
    const levelStats = findLevelStats(sector, level);
    if (!levelStats) continue;
    const stats = levelStats.stats[period];
    if (stats.sampleSize === 0) continue;
    rankings.push({ sector, levelStats, stats });
  }
  rankings.sort((a, b) => b.stats.avgReturn - a.stats.avgReturn);
  return rankings.slice(0, limit);
}
