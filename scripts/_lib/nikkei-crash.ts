/**
 * 日経225 の急落（1 日で閾値以上の下落）後の値動きを集計する純粋関数。
 *
 * - 前日比が threshold（例: -5%）以下の日を「急落日」とする
 * - 直前の急落日から mergeWindow 営業日以内の急落は同じ局面にまとめ、
 *   局面の最初の急落日の終値で買った場合の前方リターンを測る
 * - 温度は市場温度（C1）と同じ定義を、渡された終値系列からさかのぼって計算する
 */

import type {
  CrashEpisode,
  CrashPeriodKey,
  NikkeiCrashAnalysis,
} from "../../src/lib/nikkei-crash-analysis";
import type { PeriodStats } from "../../src/lib/historical-stats";
import { computeJapanTemperatureSeries } from "./japan-temperature";
import { buildPeriodStats, median, round1 } from "./shared";

export const CRASH_HORIZONS: Record<CrashPeriodKey, number> = {
  "1m": 21,
  "3m": 63,
  "6m": 126,
  "1y": 252,
};

/** 最安値を探す期間（営業日） */
export const DRAWDOWN_WINDOW = 126;

export interface CrashAnalysisOptions {
  threshold?: number;
  mergeWindow?: number;
  coldThreshold?: number;
  generatedAt: string;
}

type Closes = Array<{ date: string; close: number }>;

function forwardReturn(closes: Closes, i: number, h: number): number | null {
  if (i + h >= closes.length) return null;
  return round1((closes[i + h].close / closes[i].close - 1) * 100);
}

function statsFor(
  indices: number[],
  closes: Closes
): Record<CrashPeriodKey, PeriodStats> {
  const out = {} as Record<CrashPeriodKey, PeriodStats>;
  for (const [key, h] of Object.entries(CRASH_HORIZONS) as [
    CrashPeriodKey,
    number,
  ][]) {
    const rs: number[] = [];
    for (const i of indices) {
      if (i + h < closes.length) {
        // 平均がぶれないよう丸める前の値で集計する
        rs.push((closes[i + h].close / closes[i].close - 1) * 100);
      }
    }
    out[key] = buildPeriodStats(rs);
  }
  return out;
}

/** 日付 → 終値 の Map から急落分析 JSON を組み立てる */
export function computeNikkeiCrashAnalysis(
  nikkei: ReadonlyMap<string, number>,
  options: CrashAnalysisOptions
): NikkeiCrashAnalysis {
  const threshold = options.threshold ?? -5;
  const mergeWindow = options.mergeWindow ?? 20;
  const coldThreshold = options.coldThreshold ?? 20;

  const closes: Closes = [...nikkei.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (closes.length < 2) {
    throw new Error("日経225 の終値が 2 日分未満です");
  }

  const temperature = new Map(
    computeJapanTemperatureSeries(nikkei).map((p) => [p.date, p.score])
  );

  // 急落日を拾って局面にまとめる
  interface Draft {
    start: number;
    last: number;
    change: number;
    worst: number;
    days: number;
  }
  const drafts: Draft[] = [];
  let crashDayCount = 0;
  for (let i = 1; i < closes.length; i++) {
    const change = (closes[i].close / closes[i - 1].close - 1) * 100;
    if (change > threshold) continue;
    crashDayCount++;
    const prev = drafts.at(-1);
    if (prev && i - prev.last <= mergeWindow) {
      prev.last = i;
      prev.days++;
      prev.worst = Math.min(prev.worst, change);
    } else {
      drafts.push({ start: i, last: i, change, worst: change, days: 1 });
    }
  }

  const episodes: CrashEpisode[] = drafts.map((d) => {
    const i = d.start;
    const end = Math.min(closes.length - 1, i + DRAWDOWN_WINDOW);
    let low = i;
    for (let j = i; j <= end; j++) {
      if (closes[j].close < closes[low].close) low = j;
    }
    const returns = {} as Record<CrashPeriodKey, number | null>;
    for (const [key, h] of Object.entries(CRASH_HORIZONS) as [
      CrashPeriodKey,
      number,
    ][]) {
      returns[key] = forwardReturn(closes, i, h);
    }
    return {
      date: closes[i].date,
      change: round1(d.change),
      worstChange: round1(d.worst),
      crashDays: d.days,
      close: Math.round(closes[i].close * 100) / 100,
      temperature: temperature.get(closes[i].date) ?? null,
      returns,
      maxFurtherDrawdown: round1((closes[low].close / closes[i].close - 1) * 100),
      lowDate: closes[low].date,
      daysToLow: low - i,
      isComplete: i + DRAWDOWN_WINDOW < closes.length,
    };
  });

  const startIdx = drafts.map((d) => d.start);
  const tempOf = (i: number) => temperature.get(closes[i].date);
  const coldIdx = startIdx.filter((i) => {
    const t = tempOf(i);
    return t != null && t <= coldThreshold;
  });
  const warmIdx = startIdx.filter((i) => {
    const t = tempOf(i);
    return t != null && t > coldThreshold;
  });

  const complete = episodes.filter((e) => e.isComplete);
  // 平均・中央値は丸める前の値で集計する（リターンの集計と揃える）
  const drawdowns = drafts.flatMap((d, k) => {
    const e = episodes[k];
    if (!e.isComplete) return [];
    const low = closes[d.start + e.daysToLow].close;
    return [(low / closes[d.start].close - 1) * 100];
  });

  return {
    generatedAt: options.generatedAt,
    dataRange: { from: closes[0].date, to: closes[closes.length - 1].date },
    threshold,
    mergeWindow,
    coldThreshold,
    crashDayCount,
    episodes,
    summary: {
      episodes: statsFor(startIdx, closes),
      baseline: statsFor(
        closes.map((_, i) => i),
        closes
      ),
      cold: statsFor(coldIdx, closes),
      warm: statsFor(warmIdx, closes),
      drawdown: {
        count: complete.length,
        avgDrawdown:
          complete.length > 0
            ? round1(drawdowns.reduce((a, b) => a + b, 0) / complete.length)
            : 0,
        medianDrawdown: complete.length > 0 ? round1(median(drawdowns)) : 0,
        medianDaysToLow:
          complete.length > 0
            ? Math.round(median(complete.map((e) => e.daysToLow)))
            : 0,
        bottomOnCrashDay: complete.filter((e) => e.daysToLow === 0).length,
      },
    },
  };
}
