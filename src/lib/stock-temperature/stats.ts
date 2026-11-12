/**
 * 銘柄別温度ページ用の集計（純関数）。データの読み込みは index.ts。
 */

import type { TemperaturePoint } from "./score";
import type { StockTemperatureEntry } from "./types";

function isoDaysAgo(base: string, days: number): string {
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
 * 過去1年の中で、最新の温度以上だった日の割合（%）。
 * 「過去1年で上位 X% の熱さ」の X。小さいほど珍しく熱い。
 */
export function topPercentInYear(history: TemperaturePoint[]): number | null {
  if (history.length === 0) return null;
  const latest = history[history.length - 1][1];
  const atLeast = history.filter(([, s]) => s >= latest).length;
  return Math.max(1, Math.round((atLeast / history.length) * 100));
}

/** 温度帯ごとの日数（極寒・冷え込み・平温・過熱・沸騰の順） */
export function countByBand(history: TemperaturePoint[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  for (const [, s] of history) {
    const idx = s <= 20 ? 0 : s <= 40 ? 1 : s <= 60 ? 2 : s <= 80 ? 3 : 4;
    counts[idx]++;
  }
  return counts;
}

export interface StockSummary {
  code: string;
  name: string;
  sector: string;
  date: string;
  score: number;
  d1: number | null;
}

export function summarize(code: string, entry: StockTemperatureEntry): StockSummary | null {
  const last = entry.history[entry.history.length - 1];
  if (!last) return null;
  return {
    code,
    name: entry.name,
    sector: entry.sector,
    date: last[0],
    score: last[1],
    d1: computeChanges(entry.history).d1,
  };
}

/** 温度の高い順（同点はコード順）に並べる */
export function sortByScoreDesc(list: StockSummary[]): StockSummary[] {
  return [...list].sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
}

/** 温度の高い順で 1 始まりの順位（同点は同順位） */
export function rankOf(list: StockSummary[], code: string): number | null {
  const target = list.find((s) => s.code === code);
  if (!target) return null;
  return list.filter((s) => s.score > target.score).length + 1;
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
  moverLimit: number = limit
): Rankings {
  const sorted = sortByScoreDesc(list);
  const withD1 = list.filter((s) => s.d1 != null);
  const byD1 = (dir: 1 | -1) =>
    [...withD1]
      .filter((s) => dir * s.d1! > 0)
      .sort((a, b) => dir * (b.d1! - a.d1!) || a.code.localeCompare(b.code))
      .slice(0, moverLimit);
  return {
    hottest: sorted.slice(0, limit),
    coldest: [...sorted].reverse().slice(0, limit),
    risers: byD1(1),
    fallers: byD1(-1),
  };
}

/** 業種ごとにまとめる（業種名順、各業種内はコード順） */
export function groupBySector(list: StockSummary[]): [string, StockSummary[]][] {
  const map = new Map<string, StockSummary[]>();
  for (const s of list) {
    const arr = map.get(s.sector) ?? [];
    arr.push(s);
    map.set(s.sector, arr);
  }
  return [...map.entries()]
    .map(([sector, arr]): [string, StockSummary[]] => [
      sector,
      arr.sort((a, b) => a.code.localeCompare(b.code)),
    ])
    .sort(([a], [b]) => a.localeCompare(b, "ja"));
}
