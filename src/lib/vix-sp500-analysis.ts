import analysisData from "@/data/vix-sp500-analysis.json";
import type { SentimentLevel } from "@/lib/types";
import type { PeriodStats } from "@/lib/historical-stats";

export type VixAnalysisPeriodKey = "1m" | "3m" | "6m";

export interface VixBand {
  label: string;
  min: number;
  max: number;
}

export interface VixPrimaryBand {
  band: string;
  occurrences: number;
  sp500: Record<VixAnalysisPeriodKey, PeriodStats>;
  nikkei225: Record<VixAnalysisPeriodKey, PeriodStats>;
}

export interface VixJointCell {
  vixBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<VixAnalysisPeriodKey, PeriodStats>; // 日経225 ベース
}

/** VIX 30 以上を「1 回の高騰」ごとにまとめた回数ベースの集計（scripts/_lib/vix-episodes.ts） */
export interface VixEpisode {
  start: string;
  end: string;
  days: number;
  firstVix: number;
  peakVix: number;
  peakDate: string;
  sp500: Record<VixAnalysisPeriodKey, number | null>;
  /** 最初の日の終値から 180 日以内の最安終値まで（%）。0 なら最初の日が底（さらに下げた回は -0.1 以下）。未経過は null */
  sp500Drawdown: number | null;
}

export interface VixEpisodeSummary {
  threshold: number;
  gapTradingDays: number;
  totalDays: number;
  episodes: VixEpisode[];
  firstDay: Record<VixAnalysisPeriodKey, PeriodStats>;
  baseline: Record<VixAnalysisPeriodKey, PeriodStats>;
  bottom: { count: number; of: number };
}

export interface VixSp500Analysis {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  vixBands: VixBand[];
  tempBands: SentimentLevel[];
  primary: { bands: VixPrimaryBand[] };
  /** 古い JSON には無い */
  episodes?: VixEpisodeSummary;
  joint: {
    dataRange: { from: string; to: string };
    sampleSize: number;
    cells: VixJointCell[];
  };
  vixQuantiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    latest: { date: string; vix: number };
  };
  latestContext: {
    date: string;
    vix: number;
    vixBand: string;
    jpScore: number | null;
    tempBand: SentimentLevel | null;
  };
  note: string;
}

/** 分析記事の path・タイトル（記事ページ / 解説記事からのリンクで共有） */
export const VIX_ANALYSIS_ARTICLE = {
  path: "/analysis/vix-threshold-sp500",
  title: "VIX が 30 を超えた日、その後 S&P500 はどう動いたか？— 過去20年の検証",
} as const;

/** VIX × 日本版温度のクロス集計で、日数がこれ未満のセルは参考値として扱う */
export const VIX_JOINT_LOW_SAMPLE_THRESHOLD = 20;

export function getVixSp500Analysis(): VixSp500Analysis {
  return analysisData as VixSp500Analysis;
}

export function classifyVixToBand(
  analysis: VixSp500Analysis,
  vix: number
): string | null {
  for (const b of analysis.vixBands) {
    if (vix >= b.min && vix < b.max) return b.label;
  }
  return null;
}

export function findVixJointCell(
  analysis: VixSp500Analysis,
  vixBand: string,
  tempBand: SentimentLevel
): VixJointCell | null {
  return (
    analysis.joint.cells.find(
      (c) => c.vixBand === vixBand && c.tempBand === tempBand
    ) ?? null
  );
}

/** VIX 値を分位点で線形補間した 0-100 の percentile に変換 */
export function computeVixPercentile(
  quartiles: VixSp500Analysis["vixQuantiles"],
  vix: number
): number {
  const { p25, p50, p75, p95 } = quartiles;
  if (vix <= p25) return Math.round((vix / p25) * 25);
  if (vix <= p50) return Math.round(25 + ((vix - p25) / (p50 - p25)) * 25);
  if (vix <= p75) return Math.round(50 + ((vix - p50) / (p75 - p50)) * 25);
  if (vix <= p95) return Math.round(75 + ((vix - p75) / (p95 - p75)) * 20);
  return Math.min(
    99,
    Math.round(95 + ((vix - p95) / Math.max(p95 * 0.1, 1)) * 4)
  );
}

/** 複数セルをまとめた期間ごとの成績（中央値はセルからは復元できないため持たない） */
export type PooledPeriodStats = Pick<PeriodStats, "avgReturn" | "winRate" | "sampleSize">;

/**
 * VIX × 日本版温度のセルをまとめて 1 つのグループの成績にする。
 * 平均リターン・勝率は各セルの sampleSize で重み付けした平均（＝全日を 1 つに集計したのと同じ）。
 * 小数第 1 位に丸めて保存されたセルから計算するため、末尾の桁は元データの再集計と僅かにずれうる。
 */
export function poolVixJointCells(cells: VixJointCell[]): {
  occurrences: number;
  returns: Partial<Record<VixAnalysisPeriodKey, PooledPeriodStats>>;
} {
  const returns: Partial<Record<VixAnalysisPeriodKey, PooledPeriodStats>> = {};
  for (const key of ["1m", "3m", "6m"] as const) {
    const n = cells.reduce((sum, c) => sum + c.returns[key].sampleSize, 0);
    if (n === 0) continue;
    const weighted = (pick: (s: PeriodStats) => number) =>
      Math.round(
        (cells.reduce((sum, c) => sum + pick(c.returns[key]) * c.returns[key].sampleSize, 0) / n) * 10
      ) / 10;
    returns[key] = {
      avgReturn: weighted((s) => s.avgReturn),
      winRate: weighted((s) => s.winRate),
      sampleSize: n,
    };
  }
  return { occurrences: cells.reduce((sum, c) => sum + c.occurrences, 0), returns };
}
