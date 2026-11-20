import data from "@/data/learn-extra-stats.json";
import type { PeriodStats } from "@/lib/historical-stats";

/**
 * 解説記事（/learn）に載せる補足の集計（scripts/generate-learn-extra-stats.ts が月次で作る）。
 * - realizedVol: 日経225 の値動きの大きさ（直近 20 営業日・年率）の水準別・その後の日経225（日経VI の記事）
 * - usdJpyMomentum: ドル円の 50 営業日変化率の帯別・その後の日経225（ドル円の記事）
 * - sqWeeks: SQ のある週とない週の日経225 の値動き（裁定残の記事）
 * - investorFlow: 海外投資家の売買（4 週累計）の帯別・その後の日経225 など（投資部門別の記事）
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

export interface InvestorFlowBand extends LearnReturnBand {
  /** 帯に入った週が続いたひとかたまりを 1 回と数えた回数（同じ局面の週を重ねて数えないため） */
  episodes: number;
  /** 各回の最初の週の最終日（季節の偏りを見るため） */
  episodeStarts: string[];
}

/** 売買の向き（買い越し / 売り越し）と日経225 の騰落の向きが一致した割合 */
export interface DirectionMatch {
  weeks: number;
  /** 一致した割合（%） */
  matchRate: number;
}

export interface InvestorFlowStats {
  dataRange: { from: string; to: string };
  /** 海外投資家の 4 週累計の帯（億円）。その後の日経225 は公表翌日の終値から数える */
  bands: InvestorFlowBand[];
  /** すべての週（比較用、同じく公表翌日から） */
  baseline: { occurrences: number; returns: Record<LearnPeriodKey, PeriodStats> };
  /** 海外投資家のその週の売買の向き × 同じ週の日経225 */
  sameWeek: DirectionMatch;
  /** 海外投資家のその週の売買の向き × 公表翌日から 1 週間（5 営業日）の日経225 */
  afterPublish: DirectionMatch;
  /** 海外投資家と個人が逆向き（片方が買い越し・片方が売り越し）だった週の割合 */
  foreignVsIndividual: { weeks: number; oppositeRate: number };
  latest: { endDate: string; foreign4w: number } | null;
}

export interface LearnExtraStats {
  generatedAt: string;
  dataRange: { from: string; to: string };
  /** 全営業日に買った場合（比較用） */
  baseline: { occurrences: number; returns: Record<LearnPeriodKey, PeriodStats> };
  realizedVol: { window: number; bands: LearnReturnBand[]; latest: number | null };
  usdJpyMomentum: { window: number; bands: LearnReturnBand[]; latest: number | null };
  sqWeeks: { bigMoveThreshold: number; groups: SqWeekGroup[] };
  investorFlow: InvestorFlowStats;
}

export function getLearnExtraStats(): LearnExtraStats {
  return data as LearnExtraStats;
}
