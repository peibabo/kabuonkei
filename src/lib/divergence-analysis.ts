import analysisData from "@/data/divergence-analysis.json";
import type { SentimentLevel } from "@/lib/types";
import type { PeriodStats } from "@/lib/historical-stats";

export type DivergenceAnalysisPeriodKey = "1m" | "3m" | "6m";

export interface GapBand {
  label: string;
  min: number;
  max: number;
}

export interface DivergencePrimaryBand {
  band: string;
  occurrences: number;
  sp500: Record<DivergenceAnalysisPeriodKey, PeriodStats>;
  nikkei225: Record<DivergenceAnalysisPeriodKey, PeriodStats>;
  /** 日経225 平均 - S&P500 平均 (相対パフォーマンス, パーセントポイント) */
  spread: Record<DivergenceAnalysisPeriodKey, number>;
}

export interface DivergenceJointCell {
  gapBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<DivergenceAnalysisPeriodKey, PeriodStats>; // 日経225 ベース
}

export interface DivergenceAnalysis {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  gapBands: GapBand[];
  tempBands: SentimentLevel[];
  primary: { bands: DivergencePrimaryBand[] };
  joint: {
    dataRange: { from: string; to: string };
    sampleSize: number;
    cells: DivergenceJointCell[];
  };
  gapQuantiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    latest: { date: string; gap: number };
  };
  latestContext: {
    date: string;
    jpScore: number;
    usScore: number;
    vix: number;
    gap: number;
    gapBand: string;
    jpTempBand: SentimentLevel;
  };
  note: string;
}

export function getDivergenceAnalysis(): DivergenceAnalysis {
  return analysisData as DivergenceAnalysis;
}

export function classifyGapToBand(
  analysis: DivergenceAnalysis,
  gap: number
): string | null {
  for (const b of analysis.gapBands) {
    if (gap >= b.min && gap < b.max) return b.label;
  }
  return null;
}

export function findDivergenceJointCell(
  analysis: DivergenceAnalysis,
  gapBand: string,
  tempBand: SentimentLevel
): DivergenceJointCell | null {
  return (
    analysis.joint.cells.find(
      (c) => c.gapBand === gapBand && c.tempBand === tempBand
    ) ?? null
  );
}

/** 乖離値を分位点で線形補間した 0-100 の percentile に変換 */
export function computeGapPercentile(
  quantiles: DivergenceAnalysis["gapQuantiles"],
  gap: number
): number {
  const { p10, p25, p50, p75, p90 } = quantiles;
  // p10 未満: percentile 10 → 1 へ線形に減少
  if (gap <= p10) {
    const overshoot = (p10 - gap) / Math.max(Math.abs(p10) * 0.2, 5);
    return Math.max(1, Math.round(10 - overshoot * 9));
  }
  if (gap <= p25) return Math.round(10 + ((gap - p10) / (p25 - p10)) * 15);
  if (gap <= p50) return Math.round(25 + ((gap - p25) / (p50 - p25)) * 25);
  if (gap <= p75) return Math.round(50 + ((gap - p50) / (p75 - p50)) * 25);
  if (gap <= p90) return Math.round(75 + ((gap - p75) / (p90 - p75)) * 15);
  // p90 超: percentile 90 → 99 へ線形に増加
  return Math.min(
    99,
    Math.round(90 + ((gap - p90) / Math.max(Math.abs(p90) * 0.2, 5)) * 9)
  );
}

/** 乖離値を「日本優位 / 米国優位」の 1 行説明にする */
export function describeGap(gap: number): string {
  if (gap >= 20) return "日本が大幅に熱い";
  if (gap >= 10) return "日本がやや熱い";
  if (gap > -10) return "ほぼ同温";
  if (gap > -20) return "米国がやや熱い";
  return "米国が大幅に熱い";
}
