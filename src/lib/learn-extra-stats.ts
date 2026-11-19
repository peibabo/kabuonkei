import data from "@/data/learn-extra-stats.json";
import type { PeriodStats } from "@/lib/historical-stats";

/**
 * 解説記事（/learn）に載せる補足の集計（scripts/generate-learn-extra-stats.ts が月次で作る）。
 * - realizedVol: 日経225 の値動きの大きさ（直近 20 営業日・年率）の水準別・その後の日経225（日経VI の記事）
 * - usdJpyMomentum: ドル円の 50 営業日変化率の帯別・その後の日経225（ドル円の記事）
 * - sqWeeks: SQ のある週とない週の日経225 の値動き（裁定残の記事）
 */

export type LearnPeriodKey = "1m" | "3m" | "6m";

export interface LearnReturnBand {
  band: string;
  /** 条件に当てはまった営業日数 */
  occurrences: number;
  returns: Record<LearnPeriodKey, PeriodStats>;
}

export interface SqWeekGroup {
  label: string;
  weeks: number;
  /** 1 週間の騰落率の絶対値の平均（%） */
  avgAbsMove: number;
  /** 1 週間の騰落率の平均（%） */
  avgReturn: number;
  /** 絶対値で bigMoveThreshold% 以上動いた週の割合（%） */
  bigMoveShare: number;
}

export interface LearnExtraStats {
  generatedAt: string;
  dataRange: { from: string; to: string };
  /** 全営業日に買った場合（比較用） */
  baseline: { occurrences: number; returns: Record<LearnPeriodKey, PeriodStats> };
  realizedVol: { window: number; bands: LearnReturnBand[]; latest: number | null };
  usdJpyMomentum: { window: number; bands: LearnReturnBand[]; latest: number | null };
  sqWeeks: { bigMoveThreshold: number; groups: SqWeekGroup[] };
}

export function getLearnExtraStats(): LearnExtraStats {
  return data as LearnExtraStats;
}
