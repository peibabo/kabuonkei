import analysisData from "@/data/nikkei-ma-deviation-analysis.json";
import type { PeriodStats } from "@/lib/historical-stats";
import { normalizeNikkeiMaDeviation } from "@/lib/japan-fear-greed/normalize";

/** 前方リターンを測る期間（営業日: 1m=21 / 3m=63 / 6m=126 / 1y=252） */
export type DeviationPeriodKey = "1m" | "3m" | "6m" | "1y";

export const DEVIATION_PERIOD_KEYS: DeviationPeriodKey[] = ["1m", "3m", "6m", "1y"];

export const DEVIATION_PERIOD_LABELS: Record<DeviationPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
  "1y": "1年後",
};

/** 記事の slug・タイトル・公開日（記事ページ / 一覧 / feed / 関連記事で共有） */
export const MA_DEVIATION_ARTICLE = {
  slug: "nikkei-ma-deviation",
  path: "/analysis/nikkei-ma-deviation",
  title:
    "日経平均の125日移動平均乖離率は買い時・売り時のサインになる？— 1985年以降で検証",
  shortTitle: "日経平均の125日線乖離率は買い時のサインになる？",
  publishedAt: "2026-11-20",
} as const;

export type DeviationBandKey =
  | "le-15"
  | "-15to-10"
  | "-10to-5"
  | "-5to5"
  | "5to10"
  | "10to15"
  | "ge15";

/**
 * 乖離率の区切り。下側は「以下」、上側は「以上」で、真ん中（-5% 超 +5% 未満）を平均付近とする。
 * min / max は null で上限・下限なし
 */
export const DEVIATION_BANDS: ReadonlyArray<{
  key: DeviationBandKey;
  label: string;
  min: number | null;
  max: number | null;
}> = [
  { key: "le-15", label: "−15%以下", min: null, max: -15 },
  { key: "-15to-10", label: "−15%〜−10%", min: -15, max: -10 },
  { key: "-10to-5", label: "−10%〜−5%", min: -10, max: -5 },
  { key: "-5to5", label: "−5%〜+5%", min: -5, max: 5 },
  { key: "5to10", label: "+5%〜+10%", min: 5, max: 10 },
  { key: "10to15", label: "+10%〜+15%", min: 10, max: 15 },
  { key: "ge15", label: "+15%以上", min: 15, max: null },
];

/** 乖離率（%）を区切りに振り分ける。下側は境界を含めて低い側、上側は境界を含めて高い側に入れる */
export function classifyDeviation(deviation: number): DeviationBandKey {
  if (deviation <= -15) return "le-15";
  if (deviation <= -10) return "-15to-10";
  if (deviation <= -5) return "-10to-5";
  if (deviation < 5) return "-5to5";
  if (deviation < 10) return "5to10";
  if (deviation < 15) return "10to15";
  return "ge15";
}

/** 乖離率（%）を市場温度（0〜100）にする。トップのゲージと同じ式 */
export function deviationToTemperature(deviation: number): number {
  return normalizeNikkeiMaDeviation(100 + deviation, 100);
}

export interface DeviationBandStats {
  key: DeviationBandKey;
  /** 期間全体 */
  all: Record<DeviationPeriodKey, PeriodStats>;
  /** 前半（dataRange.from 〜 halfSplitDate の前日） */
  firstHalf: Record<DeviationPeriodKey, PeriodStats>;
  /** 後半（halfSplitDate 〜） */
  secondHalf: Record<DeviationPeriodKey, PeriodStats>;
}

/** 乖離が ±extremeThreshold を超えた回（20 営業日以内の該当日は同じ回にまとめる） */
export interface DeviationEpisode {
  /** その回で最初に閾値を超えた日 */
  date: string;
  /** その日の乖離率（%） */
  deviation: number;
  /** その回で最も大きかった乖離率（%、下側なら最小値・上側なら最大値） */
  peakDeviation: number;
  close: number;
  returns: Record<DeviationPeriodKey, number | null>;
  /** 最初の日から 6ヶ月（126 営業日）以内の最安値までの下落率（%、0 以下） */
  maxFurtherDrawdown: number;
  /** 最安値までの営業日数（0 = 最初の日が底） */
  daysToLow: number;
  /** 6ヶ月が経過して最安値が確定しているか */
  isComplete: boolean;
}

export interface NikkeiMaDeviationAnalysis {
  generatedAt: string;
  /** 乖離率が計算できる最初の日〜最後の日 */
  dataRange: { from: string; to: string };
  maWindow: number;
  mergeWindow: number;
  /** 回数ベースで数える乖離率の閾値（±%） */
  extremeThreshold: number;
  /** 乖離率が計算できた営業日数 */
  dayCount: number;
  /** 日数を半分に分けた後半の初日 */
  halfSplitDate: string;
  baseline: Omit<DeviationBandStats, "key">;
  bands: DeviationBandStats[];
  /** 乖離が -extremeThreshold 以下になった回 */
  lowEpisodes: DeviationEpisode[];
  /** 乖離が +extremeThreshold 以上になった回 */
  highEpisodes: DeviationEpisode[];
  /** 回ごとの最初の日に買った場合の集計 */
  episodeSummary: {
    low: Record<DeviationPeriodKey, PeriodStats>;
    high: Record<DeviationPeriodKey, PeriodStats>;
  };
  latest: {
    date: string;
    /** 乖離率（%、小数 1 桁に丸めた表示用） */
    deviation: number;
    /** 丸める前の乖離率で決めた区切り */
    bandKey: DeviationBandKey;
    /** 丸める前の乖離率から計算した市場温度（トップのゲージと同じ） */
    temperature: number;
    close: number;
  };
}

/** 上がった割合（%）と件数から「◯回中◯回」の◯を出す（記事と OG 画像で共有） */
export function winCount(stats: PeriodStats): number {
  return Math.round((stats.winRate / 100) * stats.sampleSize);
}

export function getNikkeiMaDeviationAnalysis(): NikkeiMaDeviationAnalysis {
  return analysisData as NikkeiMaDeviationAnalysis;
}

export function findDeviationBand(
  analysis: NikkeiMaDeviationAnalysis,
  key: DeviationBandKey
): DeviationBandStats {
  const band = analysis.bands.find((b) => b.key === key);
  if (!band) throw new Error(`乖離率の区切り ${key} がデータにありません`);
  return band;
}
