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

export interface VixSp500Analysis {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sampleSize: number;
  vixBands: VixBand[];
  tempBands: SentimentLevel[];
  primary: { bands: VixPrimaryBand[] };
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
