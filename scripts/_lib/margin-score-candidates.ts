/**
 * 信用倍率スコア（C3）の定義候補を並べて比べるための純粋関数。
 * analyze-margin-score-candidates.ts から I/O と分離してテスト可能にした。
 *
 * 試算専用。本体のスコア計算（src/lib/japan-fear-greed/）からは参照しない。
 */

import { normalizeMarginRatio } from "../../src/lib/japan-fear-greed/normalize";
import { mapToScore } from "../../src/lib/japan-fear-greed/utils";
import { MARGIN_PUBLISH_LAG, availableFrom } from "./snapshot-backfill";
import type { SnapshotEntry } from "./snapshot-merge";

export interface MarginWeek {
  /** 週の最終営業日 "YYYY-MM-DD" */
  date: string;
  buyBalance: number;
  sellBalance: number;
  ratio: number;
}

export const CANDIDATE_IDS = [
  "old",
  "ratioRange",
  "ratioWow",
  "buyRange",
  "buyChange4w",
] as const;
export type CandidateId = (typeof CANDIDATE_IDS)[number];

export const CANDIDATE_LABELS: Record<CandidateId, string> = {
  old: "旧:倍率水準",
  ratioRange: "A:倍率52週位置",
  ratioWow: "B:倍率前週比",
  buyRange: "C:買残52週位置",
  buyChange4w: "D:買残4週比",
};

/** レンジ内位置を見る週数（当週を含む） */
export const RANGE_WEEKS = 52;
/** B: 倍率の前週比。±15% を 0 / 100 に対応（全期間の p5 -12.5% / p95 +15.4%） */
export const RATIO_WOW_BOUND_PCT = 15;
/** D: 買残の 4 週変化率。±15% を 0 / 100 に対応（全期間の p5 -12.8% / p95 +15.3%） */
export const BUY_CHANGE_4W_BOUND_PCT = 15;

export interface CandidateRow {
  date: string;
  ratio: number;
  /** 倍率の前週比（%） */
  ratioWowPct: number;
  /** 買残の 4 週変化率（%） */
  buyChange4wPct: number;
  scores: Record<CandidateId, number>;
}

/** values の最小〜最大の中で value がどこにあるか（0–100）。幅がなければ 50 */
export function rangePosition(value: number, values: readonly number[]): number {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!(max > min)) return 50;
  return mapToScore(value, min, max);
}

function pctChange(now: number, before: number): number {
  return (now / before - 1) * 100;
}

/**
 * 各週の候補スコアを返す。52 週レンジが取れる週（先頭から 52 本目）以降のみ。
 * どの候補も、その週までのデータだけで決まる（先読みなし）。
 */
export function computeCandidateRows(
  weeks: readonly MarginWeek[],
): CandidateRow[] {
  const rows: CandidateRow[] = [];
  for (let i = RANGE_WEEKS - 1; i < weeks.length; i++) {
    const w = weeks[i];
    const window = weeks.slice(i - RANGE_WEEKS + 1, i + 1);
    const ratioWowPct = pctChange(w.ratio, weeks[i - 1].ratio);
    const buyChange4wPct = pctChange(w.buyBalance, weeks[i - 4].buyBalance);
    rows.push({
      date: w.date,
      ratio: w.ratio,
      ratioWowPct,
      buyChange4wPct,
      scores: {
        old: normalizeMarginRatio(w.ratio),
        ratioRange: rangePosition(
          w.ratio,
          window.map((x) => x.ratio),
        ),
        ratioWow: mapToScore(
          ratioWowPct,
          -RATIO_WOW_BOUND_PCT,
          RATIO_WOW_BOUND_PCT,
        ),
        buyRange: rangePosition(
          w.buyBalance,
          window.map((x) => x.buyBalance),
        ),
        buyChange4w: mapToScore(
          buyChange4wPct,
          -BUY_CHANGE_4W_BOUND_PCT,
          BUY_CHANGE_4W_BOUND_PCT,
        ),
      },
    });
  }
  return rows;
}

/** 昇順ソート済みでない配列の分位点（下側の観測値を返す） */
export function quantile(values: readonly number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) * p)];
}

export interface RowWithAvailability {
  row: CandidateRow;
  /** この週の値がスナップショットに反映され始める日。カレンダー不足なら null */
  from: string | null;
}

/** 各週に「反映開始日」を付ける（公表ラグ + 水・木の更新ジョブを再現） */
export function withAvailability(
  rows: readonly CandidateRow[],
  tradingDays: readonly string[],
): RowWithAvailability[] {
  return rows.map((row) => ({
    row,
    from: availableFrom(row.date, MARGIN_PUBLISH_LAG, tradingDays),
  }));
}

/** snapshotDate の時点でスナップショットに反映済みだった最新の週 */
export function rowAvailableOn(
  snapshotDate: string,
  rows: readonly RowWithAvailability[],
): CandidateRow | null {
  let latest: CandidateRow | null = null;
  for (const r of rows) {
    if (r.from != null && r.from <= snapshotDate) {
      if (latest == null || r.row.date > latest.date) latest = r.row;
    }
  }
  return latest;
}

/** C3 だけ差し替えた 5 要素の総合スコア（他の 4 要素は記録済みの値） */
export function totalWithMarginScore(
  entry: SnapshotEntry,
  marginScore: number,
): number {
  const c = entry.components;
  return Math.round(
    (c.nikkeiMa + c.foreignFlow + marginScore + c.arbitrage + c.usdJpyMomentum) /
      5,
  );
}
