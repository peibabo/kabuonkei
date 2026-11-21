import analysisData from "@/data/supply-demand-analysis.json";
import type { PeriodStats } from "@/lib/historical-stats";

/** 前方リターンを測る期間（営業日: 1m=21 / 3m=63 / 6m=126） */
export type SupplyPeriodKey = "1m" | "3m" | "6m";

export const SUPPLY_PERIOD_KEYS: SupplyPeriodKey[] = ["1m", "3m", "6m"];

export const SUPPLY_PERIOD_LABELS: Record<SupplyPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
};

/** 記事の slug・タイトル・公開日（記事ページ / 一覧 / feed / 関連記事で共有） */
export const SUPPLY_DEMAND_ARTICLE = {
  slug: "supply-demand-signals",
  path: "/analysis/supply-demand-signals",
  title:
    "海外投資家の売り越し・信用買い残の減少は買い時のサイン？— 日経平均のその後を検証",
  shortTitle: "海外投資家の売り越し・信用買い残の減少は買い時？",
  publishedAt: "2026-11-21",
} as const;

export type SupplyBandKey = "very-low" | "low" | "mid" | "high" | "very-high";

export interface SupplyBand {
  key: SupplyBandKey;
  label: string;
  /** 下側は「以下」、上側は「以上」。null は上限・下限なし */
  min: number | null;
  max: number | null;
}

/** 海外投資家の売買差引（4 週累計、億円）の区切り */
export const FLOW_BANDS: readonly SupplyBand[] = [
  { key: "very-low", label: "1兆円以上の売り越し", min: null, max: -10000 },
  { key: "low", label: "3,000億〜1兆円の売り越し", min: -10000, max: -3000 },
  { key: "mid", label: "±3,000億円以内", min: -3000, max: 3000 },
  { key: "high", label: "3,000億〜1兆円の買い越し", min: 3000, max: 10000 },
  { key: "very-high", label: "1兆円以上の買い越し", min: 10000, max: null },
];

/** 信用買い残の 4 週変化率（%）の区切り */
export const MARGIN_BANDS: readonly SupplyBand[] = [
  { key: "very-low", label: "10%以上の減少", min: null, max: -10 },
  { key: "low", label: "3〜10%の減少", min: -10, max: -3 },
  { key: "mid", label: "±3%以内", min: -3, max: 3 },
  { key: "high", label: "3〜10%の増加", min: 3, max: 10 },
  { key: "very-high", label: "10%以上の増加", min: 10, max: null },
];

/**
 * 値を区切りに振り分ける。下側は境界を含めて低い側、上側は境界を含めて高い側に入れる
 * （例: 海外勢 −1兆円ちょうどは「1兆円以上の売り越し」、+3,000億円ちょうどは「3,000億〜1兆円の買い越し」）
 */
export function classifySupply(value: number, bands: readonly SupplyBand[]): SupplyBandKey {
  const [veryLow, low, mid, high] = bands;
  if (value <= veryLow.max!) return "very-low";
  if (value <= low.max!) return "low";
  if (value < mid.max!) return "mid";
  if (value < high.max!) return "high";
  return "very-high";
}

export interface SupplyBandStats {
  key: SupplyBandKey;
  /** 期間全体 */
  all: Record<SupplyPeriodKey, PeriodStats>;
  /** 前半（dataRange.from 〜 halfSplitDate の前日） */
  firstHalf: Record<SupplyPeriodKey, PeriodStats>;
  /** 後半（halfSplitDate 〜） */
  secondHalf: Record<SupplyPeriodKey, PeriodStats>;
}

/** 極端な値になった回（20 営業日以内の該当日は同じ回にまとめる）の最初の日 */
export interface SupplyEpisode {
  date: string;
  /** その日の値（海外勢は億円、信用買い残は %） */
  value: number;
  /** その日の市場温度（0〜100） */
  temperature: number;
  returns: Record<SupplyPeriodKey, number | null>;
}

export interface SupplyIndicatorAnalysis {
  /** 値が取れる最初の日〜最後の日 */
  dataRange: { from: string; to: string };
  dayCount: number;
  /** 日数を半分に分けた後半の初日 */
  halfSplitDate: string;
  baseline: Omit<SupplyBandStats, "key">;
  bands: SupplyBandStats[];
  /** 回数ベースで数える閾値（以下。海外勢は億円、信用買い残は %） */
  extremeThreshold: number;
  extremeEpisodes: SupplyEpisode[];
  /** 回ごとの最初の日に買った場合の集計 */
  extremeSummary: Record<SupplyPeriodKey, PeriodStats>;
  /** 値とその後のリターンの順位相関（スピアマン、小数 2 桁） */
  correlation: Record<SupplyPeriodKey, number | null>;
  /** 市場温度が低い日のうち「需給も悪い」とみなす上限（以下。海外勢は億円、信用買い残は %） */
  coldWeakThreshold: number;
  /** 市場温度が coldThreshold 以下の日を、この指標で 2 つに分けた集計（前半・後半は halfSplitDate で分ける） */
  cold: {
    /** 市場温度が低い日すべて（この指標が取れる日） */
    all: Omit<SupplyBandStats, "key">;
    /** 需給も悪い日（値が coldWeakThreshold 以下） */
    weak: Omit<SupplyBandStats, "key">;
    /** それ以外 */
    other: Omit<SupplyBandStats, "key">;
  };
}

export interface SupplyDemandAnalysis {
  generatedAt: string;
  mergeWindow: number;
  /** 「市場温度が低い日」の上限 */
  coldThreshold: number;
  flow: SupplyIndicatorAnalysis;
  margin: SupplyIndicatorAnalysis;
  latest: {
    date: string;
    temperature: number;
    /** 海外投資家の 4 週累計（億円、整数に丸めた表示用）と、丸める前の値で決めた区切り */
    flow4w: number | null;
    flowBandKey: SupplyBandKey | null;
    /** 信用買い残の 4 週変化率（%、小数 1 桁に丸めた表示用）と、丸める前の値で決めた区切り */
    marginChange4w: number | null;
    marginBandKey: SupplyBandKey | null;
  };
}

/** 上がった割合（%）と件数から「◯回中◯回」の◯を出す（記事と OG 画像で共有） */
export function supplyWinCount(stats: PeriodStats): number {
  return Math.round((stats.winRate / 100) * stats.sampleSize);
}

export function getSupplyDemandAnalysis(): SupplyDemandAnalysis {
  return analysisData as SupplyDemandAnalysis;
}

export function findSupplyBand(
  indicator: SupplyIndicatorAnalysis,
  key: SupplyBandKey
): SupplyBandStats {
  const band = indicator.bands.find((b) => b.key === key);
  if (!band) throw new Error(`需給の区切り ${key} がデータにありません`);
  return band;
}

/** 海外投資家の 4 週累計（億円）を「1兆2,354億円の売り越し」のような文にする */
export function formatFlowOku(oku: number): string {
  const abs = Math.round(Math.abs(oku));
  const cho = Math.floor(abs / 10000);
  const rest = abs % 10000;
  const amount =
    cho > 0 ? `${cho}兆${rest > 0 ? `${rest.toLocaleString("ja-JP")}億` : ""}円` : `${rest.toLocaleString("ja-JP")}億円`;
  if (abs === 0) return "0円";
  return `${amount}の${oku < 0 ? "売り越し" : "買い越し"}`;
}

/** 信用買い残の 4 週変化率（%）を「12.3%の減少」のような文にする */
export function formatMarginChange(pct: number): string {
  if (pct === 0) return "変化なし";
  return `${Math.abs(pct).toFixed(1)}%の${pct < 0 ? "減少" : "増加"}`;
}
