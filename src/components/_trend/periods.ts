/** 温度推移チャートの期間定数（米国版4期間 / 日本版6期間を統一型で表現） */

export interface PeriodConfig<P extends string> {
  readonly periods: readonly P[];
  readonly days: Readonly<Record<P, number>>;
  readonly labels: Readonly<Record<P, string>>;
  readonly tickIntervals: Readonly<Record<P, number>>;
}

export type UsTrendPeriod = "1M" | "3M" | "6M" | "1Y";

export const US_TREND_PERIODS: PeriodConfig<UsTrendPeriod> = {
  periods: ["1M", "3M", "6M", "1Y"] as const,
  days: { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 },
  labels: { "1M": "1ヶ月", "3M": "3ヶ月", "6M": "6ヶ月", "1Y": "1年" },
  tickIntervals: { "1M": 6, "3M": 14, "6M": 30, "1Y": 60 },
};

export type JpTrendPeriod = "1M" | "3M" | "6M" | "1Y" | "5Y" | "10Y";

export const JP_TREND_PERIODS: PeriodConfig<JpTrendPeriod> = {
  periods: ["1M", "3M", "6M", "1Y", "5Y", "10Y"] as const,
  days: { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "5Y": 1826, "10Y": 3652 },
  labels: {
    "1M": "1ヶ月",
    "3M": "3ヶ月",
    "6M": "6ヶ月",
    "1Y": "1年",
    "5Y": "5年",
    "10Y": "10年",
  },
  tickIntervals: {
    "1M": 6,
    "3M": 14,
    "6M": 30,
    "1Y": 60,
    "5Y": 240,
    "10Y": 500,
  },
};
