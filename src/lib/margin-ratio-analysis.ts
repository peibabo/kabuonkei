import analysisData from "@/data/margin-ratio-analysis.json";
import type { SentimentLevel } from "@/lib/types";
import type { PeriodStats } from "@/lib/historical-stats";

export type MarginAnalysisPeriodKey = "1m" | "3m" | "6m";

export interface MarginRatioBand {
  label: string;
  min: number;
  max: number;
}

export interface MarginJointCell {
  ratioBand: string;
  tempBand: SentimentLevel;
  occurrences: number;
  returns: Record<MarginAnalysisPeriodKey, PeriodStats>;
}

export interface MarginMarginalBand {
  band: string;
  occurrences: number;
  returns: Record<MarginAnalysisPeriodKey, PeriodStats>;
}

export interface MarginRatioAnalysis {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  ratioBands: MarginRatioBand[];
  tempBands: SentimentLevel[];
  joint: MarginJointCell[];
  marginalRatio: MarginMarginalBand[];
  marginalTemp: MarginMarginalBand[];
  ratioQuartiles: {
    p25: number;
    p50: number;
    p75: number;
    p95: number;
    latest: { date: string; ratio: number };
  };
  latestContext: {
    date: string;
    ratio: number;
    ratioBand: string;
    score: number | null;
    tempBand: SentimentLevel | null;
  };
  note: string;
}

export function getMarginRatioAnalysis(): MarginRatioAnalysis {
  return analysisData as MarginRatioAnalysis;
}

/** (ratioBand, tempBand) でジョイントセルを lookup */
export function findJointCell(
  analysis: MarginRatioAnalysis,
  ratioBand: string,
  tempBand: SentimentLevel
): MarginJointCell | null {
  return (
    analysis.joint.find(
      (c) => c.ratioBand === ratioBand && c.tempBand === tempBand
    ) ?? null
  );
}

/** 与えた比率から該当バンドラベルを返す。範囲外は null */
export function classifyRatioToBand(
  analysis: MarginRatioAnalysis,
  ratio: number
): string | null {
  for (const b of analysis.ratioBands) {
    if (ratio >= b.min && ratio < b.max) return b.label;
  }
  return null;
}

/**
 * 最新比率が全期間分布のどの位置にあるか（0-100 percentile 近似）を返す。
 * quartile から線形補間。
 */
export function computeRatioPercentile(
  quartiles: MarginRatioAnalysis["ratioQuartiles"],
  ratio: number
): number {
  const { p25, p50, p75, p95 } = quartiles;
  if (ratio <= p25) return Math.round((ratio / p25) * 25);
  if (ratio <= p50) return Math.round(25 + ((ratio - p25) / (p50 - p25)) * 25);
  if (ratio <= p75) return Math.round(50 + ((ratio - p50) / (p75 - p50)) * 25);
  if (ratio <= p95) return Math.round(75 + ((ratio - p75) / (p95 - p75)) * 20);
  return Math.min(99, Math.round(95 + ((ratio - p95) / Math.max(p95 * 0.1, 0.5)) * 4));
}
