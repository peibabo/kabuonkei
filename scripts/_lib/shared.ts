/**
 * scripts/ 配下で複数の生成スクリプトが共通で使うヘルパー群。
 * 重複を避けるため、純粋な汎用関数・定数をここに集約する。
 */

import YahooFinance from "yahoo-finance2";
import type { SentimentLevel } from "../../src/lib/types";
import type { PeriodStats } from "../../src/lib/historical-stats";

export { getSentimentLevel } from "../../src/lib/sentiment";
export { estimateFearGreedFromVix } from "../../src/lib/temperature-history";
export type { PeriodStats };

/** 温度帯レンジ定義（過去統計スクリプトで共通利用） */
export const SENTIMENT_RANGES: Array<{
  level: SentimentLevel;
  scoreRange: [number, number];
}> = [
  { level: "極寒", scoreRange: [0, 20] },
  { level: "冷え込み", scoreRange: [21, 40] },
  { level: "平温", scoreRange: [41, 60] },
  { level: "過熱", scoreRange: [61, 80] },
  { level: "沸騰", scoreRange: [81, 100] },
];

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * 指定日からカレンダー日数 N 日後に最も近い取引日の価格を返す。
 * 7日以内の取引日が見つからなければ null。
 */
export function findForwardPrice(
  dateMap: Map<string, number>,
  sortedDates: string[],
  fromDate: string,
  calendarDays: number
): number | null {
  const target = new Date(fromDate);
  target.setDate(target.getDate() + calendarDays);
  const targetStr = target.toISOString().split("T")[0];
  for (let i = 0; i < sortedDates.length; i++) {
    if (sortedDates[i] >= targetStr) {
      const diff =
        (new Date(sortedDates[i]).getTime() - target.getTime()) /
        (1000 * 60 * 60 * 24);
      if (diff <= 7) {
        return dateMap.get(sortedDates[i]) ?? null;
      }
      return null;
    }
  }
  return null;
}

/** リターン配列から PeriodStats を算出 */
export function buildPeriodStats(returns: number[]): PeriodStats {
  if (returns.length === 0) {
    return { avgReturn: 0, medianReturn: 0, winRate: 0, sampleSize: 0 };
  }
  const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
  const wins = returns.filter((r) => r > 0).length;
  return {
    avgReturn: round1(avg),
    medianReturn: round1(median(returns)),
    winRate: round1((wins / returns.length) * 100),
    sampleSize: returns.length,
  };
}

/** 日付つき終値（sanitizeDailyCloses の入出力単位） */
export interface DailyClose {
  date: string;
  close: number;
}

/**
 * Yahoo Finance の日足にまれに混入する異常クオートを除去する。
 *
 * 実例: 2026-03-30/31 に 1306.T が本来の約 1/10（383円 → 37円）、
 * 1629.T が約 1/500（288円 → 0.55円）で返り、温度帯別リターン統計に
 * +49,000% 級の偽リターンが混入した（セクターヒートマップの
 * 商社・卸売 × 平温 が「3ヶ月後 +135%」と表示される事故）。
 *
 * 各点を前後 ±windowRadius 営業日の窓の中央値と比較し、
 * maxRatio 倍超 or 1/maxRatio 未満なら異常値として破棄する。
 * 既定の 3 倍閾値は、コロナショックや令和のブラックマンデー級の
 * 正常な暴落（1日 -12% 程度）にはまったく反応しない。
 */
export function sanitizeDailyCloses(
  entries: DailyClose[],
  windowRadius = 5,
  maxRatio = 3
): { kept: DailyClose[]; dropped: DailyClose[] } {
  const dropped: DailyClose[] = [];
  const kept = entries.filter((e, i) => {
    const lo = Math.max(0, i - windowRadius);
    const hi = Math.min(entries.length, i + windowRadius + 1);
    const win = entries
      .slice(lo, hi)
      .map((x) => x.close)
      .sort((a, b) => a - b);
    const med = win[Math.floor(win.length / 2)];
    if (!(med > 0) || !(e.close > 0)) {
      dropped.push(e);
      return false;
    }
    const ratio = e.close / med;
    const ok = ratio < maxRatio && ratio > 1 / maxRatio;
    if (!ok) dropped.push(e);
    return ok;
  });
  return { kept, dropped };
}

/** YahooFinance.chart で日足終値の Map<日付, 終値> を取得（異常クオートは除外） */
export async function fetchDailyCloses(
  yf: InstanceType<typeof YahooFinance>,
  symbol: string,
  period1: string,
  period2: string
): Promise<Map<string, number>> {
  const result = await yf.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  });
  const entries: DailyClose[] = [];
  for (const q of result.quotes) {
    if (q.close != null) {
      const dateStr = new Date(q.date).toISOString().split("T")[0];
      entries.push({ date: dateStr, close: q.close });
    }
  }
  const { kept, dropped } = sanitizeDailyCloses(entries);
  if (dropped.length > 0) {
    console.warn(
      `⚠️ ${symbol}: 異常クオート ${dropped.length} 件を除外 — ${dropped
        .map((d) => `${d.date}=${d.close}`)
        .join(", ")}`
    );
  }
  return new Map(kept.map((e) => [e.date, e.close]));
}
