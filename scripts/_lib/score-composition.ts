/**
 * 日本版スコアの「構成要素の組み合わせ」を過去データで比べるための純粋関数。
 * analyze-jp-score-composition.ts から I/O と分離してテスト可能にした。
 *
 * 試算専用。本体のスコア計算（src/lib/japan-fear-greed/）からは参照しない。
 */

import {
  normalizeNikkeiMaDeviation,
  normalizeUsdJpyMomentum,
} from "../../src/lib/japan-fear-greed/normalize";
import { mapToScore } from "../../src/lib/japan-fear-greed/utils";
import {
  computeCurrentState,
  shouldFire,
} from "../../src/lib/alerts/state-transition";
import type { AlertState } from "../../src/lib/types";

export const MA_LONG = 125;
export const MA_SHORT = 25;
export const MOMENTUM_WINDOW = 50;
export const AD_WINDOW = 25;
/** 騰落レシオ（25日）: 70 以下が底値圏・120〜130 以上が過熱という一般的な目安を 0 / 100 に対応 */
export const AD_BOUNDS = { fear: 70, greed: 130 } as const;
/** 25日移動平均乖離率（%）: ±8% を 0 / 100 に対応 */
export const MA_SHORT_BOUND_PCT = 8;
/** 騰落レシオを計算する最低銘柄数（これ未満の日は欠損扱い） */
export const AD_MIN_STOCKS = 100;

export type ElementId = "c1" | "c5" | "ad" | "ma25";

export interface ElementRow {
  date: string;
  /** 日経225 終値 */
  close: number;
  /** 前日比（%）。先頭は 0 */
  ret: number;
  /** 各要素のスコア（0–100）。計算できない日は null */
  elements: Record<ElementId, number | null>;
  /** 騰落レシオ（25日）の生値。計算できない日は null */
  adRatio: number | null;
  /** 25日移動平均乖離率（%）の生値 */
  ma25Pct: number | null;
}

function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 日ごとの値上がり・値下がり銘柄数。前の取引日と当日の両方に終値がある銘柄だけ数える。
 * 変わらずはどちらにも入れない。
 */
export function countAdvancesDeclines(
  dates: readonly string[],
  stocks: ReadonlyArray<ReadonlyMap<string, number>>,
): Array<{ adv: number; dec: number; total: number }> {
  return dates.map((date, i) => {
    if (i === 0) return { adv: 0, dec: 0, total: 0 };
    const prev = dates[i - 1];
    let adv = 0;
    let dec = 0;
    let total = 0;
    for (const closes of stocks) {
      const now = closes.get(date);
      const before = closes.get(prev);
      if (now == null || before == null) continue;
      total++;
      if (now > before) adv++;
      else if (now < before) dec++;
    }
    return { adv, dec, total };
  });
}

/**
 * 騰落レシオ（window 日）= 値上がり銘柄数の合計 ÷ 値下がり銘柄数の合計 × 100。
 * 窓の中に銘柄数が minStocks 未満の日があれば null。
 */
export function advanceDeclineRatio(
  counts: ReadonlyArray<{ adv: number; dec: number; total: number }>,
  window = AD_WINDOW,
  minStocks = AD_MIN_STOCKS,
): Array<number | null> {
  return counts.map((_, i) => {
    if (i < window) return null;
    const win = counts.slice(i - window + 1, i + 1);
    if (win.some((c) => c.total < minStocks)) return null;
    const dec = win.reduce((a, c) => a + c.dec, 0);
    if (dec === 0) return null;
    return (win.reduce((a, c) => a + c.adv, 0) / dec) * 100;
  });
}

export interface ElementInputs {
  /** 日経225 終値（日付 → 終値） */
  nikkei: ReadonlyMap<string, number>;
  /** ドル円（日付 → 終値） */
  usdJpy: ReadonlyMap<string, number>;
  /** 構成銘柄ごとの終値 */
  stocks: ReadonlyArray<ReadonlyMap<string, number>>;
}

/**
 * 日経225 の取引日ごとに各要素のスコアを計算する。
 * C1・C5 は generate-japan-temperature-history.ts と同じ定義
 * （C1: 直前 125 営業日の平均との乖離、C5: ドル円の 50 本前との変化率）。
 */
export function buildElementRows(inputs: ElementInputs): ElementRow[] {
  const dates = [...inputs.nikkei.keys()].sort();
  const closes = dates.map((d) => inputs.nikkei.get(d)!);
  const usdDates = [...inputs.usdJpy.keys()].sort();
  const usdIndex = new Map(usdDates.map((d, i) => [d, i]));
  const adRatios = advanceDeclineRatio(
    countAdvancesDeclines(dates, inputs.stocks),
  );

  const rows: ElementRow[] = [];
  for (let i = MA_LONG; i < dates.length; i++) {
    const date = dates[i];
    const close = closes[i];
    const c1 = normalizeNikkeiMaDeviation(
      close,
      mean(closes.slice(i - MA_LONG, i)),
    );

    let c5: number | null = null;
    const ui = usdIndex.get(date);
    if (ui != null && ui >= MOMENTUM_WINDOW) {
      c5 = normalizeUsdJpyMomentum(
        inputs.usdJpy.get(date)!,
        inputs.usdJpy.get(usdDates[ui - MOMENTUM_WINDOW])!,
      );
    }

    const ma25Pct = (close / mean(closes.slice(i - MA_SHORT, i)) - 1) * 100;
    const adRatio = adRatios[i];

    rows.push({
      date,
      close,
      ret: (close / closes[i - 1] - 1) * 100,
      elements: {
        c1,
        c5,
        ad: adRatio == null ? null : mapToScore(adRatio, AD_BOUNDS.fear, AD_BOUNDS.greed),
        ma25: mapToScore(ma25Pct, -MA_SHORT_BOUND_PCT, MA_SHORT_BOUND_PCT),
      },
      adRatio,
      ma25Pct,
    });
  }
  return rows;
}

export interface Candidate {
  id: string;
  label: string;
  elements: readonly ElementId[];
}

/** 候補のスコア = 利用可能な要素の単純平均（本体と同じ欠損処理）。全要素が欠損なら null */
export function candidateScore(
  row: ElementRow,
  candidate: Candidate,
): number | null {
  const values = candidate.elements
    .map((id) => row.elements[id])
    .filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return Math.round(mean(values));
}

export interface StateWalk {
  /** 各日の状態（アラートと同じ閾値・ヒステリシス）。スコア欠損日は直前の状態を引き継ぐ */
  states: AlertState[];
  /** 平温 → 極端域に入った日（= 通知が出る日）の添字 */
  coldFires: number[];
  hotFires: number[];
}

/** アラートと同じ状態遷移で、通知が出る日を再現する */
export function walkStates(scores: ReadonlyArray<number | null>): StateWalk {
  const states: AlertState[] = [];
  const coldFires: number[] = [];
  const hotFires: number[] = [];
  let prev: AlertState = "neutral";
  scores.forEach((score, i) => {
    const curr = score == null ? prev : computeCurrentState(prev, score);
    const decision = shouldFire(prev, curr);
    if (decision.fire && decision.kind === "cold") coldFires.push(i);
    if (decision.fire && decision.kind === "hot") hotFires.push(i);
    states.push(curr);
    prev = curr;
  });
  return { states, coldFires, hotFires };
}

/**
 * i 日目からカレンダー日数 calendarDays 日後のリターン（%）。
 * findForwardPrice（scripts/_lib/shared.ts）と同じ規則: 目標日以降で最初の取引日、
 * ただし 7 日以内に取引日がなければ null。
 */
export function forwardReturn(
  dates: readonly string[],
  closes: readonly number[],
  i: number,
  calendarDays: number,
): number | null {
  const target = new Date(`${dates[i]}T00:00:00Z`);
  target.setUTCDate(target.getUTCDate() + calendarDays);
  const targetStr = target.toISOString().slice(0, 10);
  let lo = i;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] >= targetStr) hi = mid;
    else lo = mid + 1;
  }
  if (lo >= dates.length) return null;
  const diffDays =
    (new Date(`${dates[lo]}T00:00:00Z`).getTime() - target.getTime()) / 86_400_000;
  if (diffDays > 7) return null;
  return (closes[lo] / closes[i] - 1) * 100;
}

/** i 日目の終値から、その後 calendarDays 日以内の最安値までの下落率（%、0 以下） */
export function maxDrawdownAfter(
  dates: readonly string[],
  closes: readonly number[],
  i: number,
  calendarDays: number,
): number {
  const end = new Date(`${dates[i]}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + calendarDays);
  const endStr = end.toISOString().slice(0, 10);
  let min = closes[i];
  for (let j = i + 1; j < dates.length && dates[j] <= endStr; j++) {
    if (closes[j] < min) min = closes[j];
  }
  return (min / closes[i] - 1) * 100;
}

export interface ReturnSummary {
  n: number;
  avg: number;
  median: number;
  winRate: number;
}

export function summarizeReturns(values: ReadonlyArray<number | null>): ReturnSummary {
  const v = values.filter((x): x is number => x != null).sort((a, b) => a - b);
  if (v.length === 0) return { n: 0, avg: NaN, median: NaN, winRate: NaN };
  const mid = Math.floor(v.length / 2);
  return {
    n: v.length,
    avg: mean(v),
    median: v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2,
    winRate: (v.filter((x) => x > 0).length / v.length) * 100,
  };
}
