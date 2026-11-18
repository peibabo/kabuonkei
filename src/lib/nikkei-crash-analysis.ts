import analysisData from "@/data/nikkei-crash-analysis.json";
import type { PeriodStats } from "@/lib/historical-stats";

/** 急落後リターンを測る期間（営業日: 1m=21 / 3m=63 / 6m=126 / 1y=252） */
export type CrashPeriodKey = "1m" | "3m" | "6m" | "1y";

export const CRASH_PERIOD_KEYS: CrashPeriodKey[] = ["1m", "3m", "6m", "1y"];

/** 記事の slug・タイトル・公開日（記事ページ / 一覧 / feed / 関連記事で共有） */
export const NIKKEI_CRASH_ARTICLE = {
  slug: "nikkei-crash-aftermath",
  path: "/analysis/nikkei-crash-aftermath",
  title: "日経平均が1日5%以上下げた後どうなった？— 1985年以降の急落を全件検証",
  shortTitle: "日経平均が1日5%以上下げた後どうなった？",
  publishedAt: "2026-11-18",
} as const;

export const CRASH_PERIOD_LABELS: Record<CrashPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
  "1y": "1年後",
};

/** 急落の局面 1 回分（20 営業日以内の連続急落は 1 回にまとめる） */
export interface CrashEpisode {
  /** 局面の最初の急落日 */
  date: string;
  /** 最初の急落日の前日比（%） */
  change: number;
  /** 局面内で最も大きかった 1 日の下落率（%） */
  worstChange: number;
  /** 局面内で -閾値 以下だった日数 */
  crashDays: number;
  /** 最初の急落日の終値 */
  close: number;
  /** 最初の急落日の市場温度（0-100）。125 日の MA が取れない場合 null */
  temperature: number | null;
  /** 最初の急落日の終値で買った場合の前方リターン（%）。期間が未経過なら null */
  returns: Record<CrashPeriodKey, number | null>;
  /** 急落日から 6ヶ月（126 営業日）以内の最安値までの下落率（%、0 以下） */
  maxFurtherDrawdown: number;
  /** その最安値の日付 */
  lowDate: string;
  /** 最安値までの営業日数（0 = 急落日が底） */
  daysToLow: number;
  /** 6ヶ月が経過していて最安値が確定しているか */
  isComplete: boolean;
}

export interface CrashDrawdownSummary {
  /** 6ヶ月経過済みの局面数 */
  count: number;
  avgDrawdown: number;
  medianDrawdown: number;
  medianDaysToLow: number;
  /** 急落日がそのまま底だった回数 */
  bottomOnCrashDay: number;
}

export interface NikkeiCrashAnalysis {
  generatedAt: string;
  dataRange: { from: string; to: string };
  /** 急落の閾値（前日比 %、例: -5） */
  threshold: number;
  /** この営業日数以内の急落は同じ局面にまとめる */
  mergeWindow: number;
  /** 寒い／それ以外を分ける温度（この値以下を「寒い」とする） */
  coldThreshold: number;
  /** 閾値以下の下落日の総数（まとめる前） */
  crashDayCount: number;
  episodes: CrashEpisode[];
  summary: {
    /** 各局面の最初の急落日に買った場合 */
    episodes: Record<CrashPeriodKey, PeriodStats>;
    /** 全営業日に買った場合（比較用） */
    baseline: Record<CrashPeriodKey, PeriodStats>;
    /** 急落日の温度が coldThreshold 以下だった局面 */
    cold: Record<CrashPeriodKey, PeriodStats>;
    /** 急落日の温度が coldThreshold 超だった局面 */
    warm: Record<CrashPeriodKey, PeriodStats>;
    drawdown: CrashDrawdownSummary;
  };
}

export function getNikkeiCrashAnalysis(): NikkeiCrashAnalysis {
  return analysisData as NikkeiCrashAnalysis;
}

/** 最新の局面（観測中の局面の扱いに使う） */
export function getLatestCrashEpisode(
  analysis: NikkeiCrashAnalysis = getNikkeiCrashAnalysis()
): CrashEpisode | null {
  return analysis.episodes.at(-1) ?? null;
}

/**
 * 大きな下げ相場の入り口で、急落後も下げ続けた（6ヶ月後もマイナス）局面。
 * 「急落＝買い場」が外れた例として本文に載せる
 */
export function getFailedCrashEpisodes(
  analysis: NikkeiCrashAnalysis = getNikkeiCrashAnalysis()
): CrashEpisode[] {
  return analysis.episodes.filter(
    (e) => e.returns["6m"] != null && e.returns["6m"] < 0
  );
}
