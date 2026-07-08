/**
 * 分析記事「温度帯×業種」(/analysis/sector-rotation-temperature) 用の集計ヘルパ。
 * `japan-sector-heatmap.json` を温度帯起点で読み直す純粋関数群
 * （既存の `japan-sector-heatmap.ts` はスコア起点のアクセサなので棲み分け）。
 */

import type { SentimentLevel } from "./types";
import {
  getJapanSectorHeatmap,
  type SectorPeriodKey,
  type SectorRanking,
} from "./japan-sector-heatmap";

export const SENTIMENT_LEVELS: readonly SentimentLevel[] = [
  "極寒",
  "冷え込み",
  "平温",
  "過熱",
  "沸騰",
];

/**
 * 記事内の「守りの業種 vs 攻めの業種」比較グループ。
 * ディフェンシブ = 景気変動の影響を受けにくいとされる内需・生活必需系、
 * 景気敏感（シクリカル製造業）= 世界景気・設備投資サイクルに連動する輸出製造系。
 * TOPIX-17 のコードで指定する。
 */
export const DEFENSIVE_SECTOR_CODES: readonly string[] = [
  "1617", // 食品
  "1621", // 医薬品
  "1627", // 電力・ガス
];
export const CYCLICAL_SECTOR_CODES: readonly string[] = [
  "1623", // 鉄鋼・非鉄
  "1624", // 機械
  "1625", // 電機・精密
];

/**
 * 指定温度帯の全業種ランキング（avgReturn 降順、サンプル 0 は除外）。
 * `getTopSectorsForScore` のレベル直指定・全件版。
 */
export function getSectorRankingForLevel(
  level: SentimentLevel,
  period: SectorPeriodKey
): SectorRanking[] {
  const heatmap = getJapanSectorHeatmap();
  const rankings: SectorRanking[] = [];
  for (const sector of heatmap.sectors) {
    const levelStats = sector.levels.find((l) => l.level === level) ?? null;
    if (!levelStats) continue;
    const stats = levelStats.stats[period];
    if (stats.sampleSize === 0) continue;
    rankings.push({ sector, levelStats, stats });
  }
  rankings.sort((a, b) => b.stats.avgReturn - a.stats.avgReturn);
  return rankings;
}

export interface LevelAverage {
  level: SentimentLevel;
  scoreRange: [number, number];
  occurrences: number;
  /** 17 業種の avgReturn の単純平均（等ウェイト） */
  avgAcrossSectors: number;
  /** 17 業種の winRate の単純平均 */
  winRateAcrossSectors: number;
}

/** 温度帯ごとの「全業種平均リターン」（記事の U 字カーブの元データ） */
export function computeLevelAverages(period: SectorPeriodKey): LevelAverage[] {
  return SENTIMENT_LEVELS.map((level) => {
    const rankings = getSectorRankingForLevel(level, period);
    const n = rankings.length;
    const sumReturn = rankings.reduce((s, r) => s + r.stats.avgReturn, 0);
    const sumWin = rankings.reduce((s, r) => s + r.stats.winRate, 0);
    const first = rankings[0]?.levelStats;
    return {
      level,
      scoreRange: first?.scoreRange ?? [0, 0],
      occurrences: first?.occurrences ?? 0,
      avgAcrossSectors: n > 0 ? sumReturn / n : 0,
      winRateAcrossSectors: n > 0 ? sumWin / n : 0,
    };
  });
}

/** 指定グループ（業種コード配列）の温度帯別 平均リターン */
export function computeGroupAverage(
  codes: readonly string[],
  level: SentimentLevel,
  period: SectorPeriodKey
): number {
  const rankings = getSectorRankingForLevel(level, period).filter((r) =>
    codes.includes(r.sector.code)
  );
  if (rankings.length === 0) return 0;
  return (
    rankings.reduce((s, r) => s + r.stats.avgReturn, 0) / rankings.length
  );
}
