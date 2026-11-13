/**
 * 銘柄別温度ページ用の集計（純関数）。データの読み込みは index.ts。
 */

import { SENTIMENT_LEVELS, getSentimentLevel } from "../sentiment";
import type { SentimentLevel } from "../types";
import type { TemperaturePoint } from "./score";
import type { StockTemperatureEntry } from "./types";

/** base（YYYY-MM-DD）の days 日前の日付 */
export function isoDaysAgo(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** date 以前で最も新しい温度。なければ null */
function scoreOnOrBefore(history: TemperaturePoint[], date: string): number | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i][0] <= date) return history[i][1];
  }
  return null;
}

export interface TemperatureChanges {
  /** 前営業日比 */
  d1: number | null;
  /** 1週間前比（7日前以前の直近営業日） */
  w1: number | null;
  /** 1か月前比（30日前以前の直近営業日） */
  m1: number | null;
}

export function computeChanges(history: TemperaturePoint[]): TemperatureChanges {
  if (history.length === 0) return { d1: null, w1: null, m1: null };
  const [latestDate, latest] = history[history.length - 1];
  const diff = (prev: number | null) => (prev == null ? null : latest - prev);
  return {
    d1: history.length >= 2 ? latest - history[history.length - 2][1] : null,
    w1: diff(scoreOnOrBefore(history, isoDaysAgo(latestDate, 7))),
    m1: diff(scoreOnOrBefore(history, isoDaysAgo(latestDate, 30))),
  };
}

/** 履歴が何日間にわたるか（最初の日〜最新日の暦日数） */
export function historySpanDays(history: TemperaturePoint[]): number {
  if (history.length === 0) return 0;
  const ms = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
  return Math.round((ms(history[history.length - 1][0]) - ms(history[0][0])) / 86_400_000);
}

/** 最新日から days 日以内（最新日を含む）の履歴 */
export function recentHistory(
  history: TemperaturePoint[],
  days: number
): TemperaturePoint[] {
  if (history.length === 0) return [];
  const since = isoDaysAgo(history[history.length - 1][0], days);
  return history.filter(([date]) => date > since);
}

export interface RangeStats {
  max: TemperaturePoint;
  min: TemperaturePoint;
  avg: number;
}

export function computeRangeStats(history: TemperaturePoint[]): RangeStats | null {
  if (history.length === 0) return null;
  let max = history[0];
  let min = history[0];
  let sum = 0;
  for (const p of history) {
    if (p[1] > max[1]) max = p;
    if (p[1] < min[1]) min = p;
    sum += p[1];
  }
  return { max, min, avg: Math.round((sum / history.length) * 10) / 10 };
}

/**
 * 履歴の中で、最新の温度以上だった日の割合（%）。
 * 「過去1年で上位 X% の熱さ」の X。小さいほど珍しく熱い。
 */
export function topPercent(history: TemperaturePoint[]): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1][1];
  const atLeast = history.filter(([, s]) => s >= latest).length;
  return Math.max(1, Math.round((atLeast / history.length) * 100));
}

/** 温度帯ごとの日数 */
export function countByLevel(history: TemperaturePoint[]): Record<SentimentLevel, number> {
  const counts = Object.fromEntries(SENTIMENT_LEVELS.map((l) => [l, 0])) as Record<
    SentimentLevel,
    number
  >;
  for (const [, s] of history) counts[getSentimentLevel(s)]++;
  return counts;
}

export interface StockSummary {
  code: string;
  name: string;
  sector: string;
  score: number;
  /** 前営業日比 */
  d1: number | null;
}

export function summarize(code: string, entry: StockTemperatureEntry): StockSummary | null {
  const h = entry.history;
  if (h.length === 0) return null;
  const score = h[h.length - 1][1];
  return {
    code,
    name: entry.name,
    sector: entry.sector,
    score,
    d1: h.length >= 2 ? score - h[h.length - 2][1] : null,
  };
}

const byCode = (a: StockSummary, b: StockSummary) => a.code.localeCompare(b.code);

/** 温度の高い順（同点はコード順）に並べる */
export function sortByScoreDesc(list: StockSummary[]): StockSummary[] {
  return [...list].sort((a, b) => b.score - a.score || byCode(a, b));
}

/** 温度の高い順で 1 始まりの順位（同点は同順位） */
export function rankOf(list: StockSummary[], code: string): number | null {
  const target = list.find((s) => s.code === code);
  if (!target) return null;
  return list.filter((s) => s.score > target.score).length + 1;
}

/**
 * 並び済みの一覧に 1 始まりの順位を振る（値が同じなら同順位）。
 * 銘柄ページの順位（rankOf）とランキングページの順位を一致させるために使う。
 */
export function ranksWithTies<T>(sorted: T[], value: (item: T) => number | null): number[] {
  const ranks: number[] = [];
  sorted.forEach((item, i) => {
    ranks.push(i > 0 && value(item) === value(sorted[i - 1]) ? ranks[i - 1] : i + 1);
  });
  return ranks;
}

export interface Rankings {
  hottest: StockSummary[];
  coldest: StockSummary[];
  risers: StockSummary[];
  fallers: StockSummary[];
}

export function buildRankings(
  list: StockSummary[],
  limit: number,
  moverLimit: number
): Rankings {
  const byScore = sortByScoreDesc(list);
  const moved = (s: StockSummary): s is StockSummary & { d1: number } =>
    s.d1 != null && s.d1 !== 0;
  const movers = list.filter(moved);
  return {
    hottest: byScore.slice(0, limit),
    coldest: byScore.toReversed().slice(0, limit),
    risers: movers
      .filter((s) => s.d1 > 0)
      .sort((a, b) => b.d1 - a.d1 || byCode(a, b))
      .slice(0, moverLimit),
    fallers: movers
      .filter((s) => s.d1 < 0)
      .sort((a, b) => a.d1 - b.d1 || byCode(a, b))
      .slice(0, moverLimit),
  };
}

/** 業種ごとにまとめる（業種名順、各業種内はコード順） */
export function groupBySector(list: StockSummary[]): [string, StockSummary[]][] {
  const groups = Object.groupBy(list, (s) => s.sector) as Record<string, StockSummary[]>;
  return Object.entries(groups)
    .map(([sector, items]): [string, StockSummary[]] => [sector, items.sort(byCode)])
    .sort(([a], [b]) => a.localeCompare(b, "ja"));
}
