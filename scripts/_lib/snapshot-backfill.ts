/**
 * 日本版スナップショットの C2（海外投資家フロー）/ C3（信用倍率）を、
 * 「その日に公表済みだった JPX データ」で再計算するための純粋関数。
 * backfill-japan-fg-snapshots.ts から I/O と分離してテスト可能にした。
 *
 * データが反映される日の決め方（通常運用の再現）:
 *   1. JPX の公表日 = 週末日（金曜）の n 営業日後（信用倍率は 3、投資部門別は 4）
 *   2. データ更新ジョブは水曜・木曜にだけ動くので、公表日以降で最初の水曜か木曜から反映
 */

import {
  normalizeForeignFlow,
  normalizeMarginRatio,
} from "../../src/lib/japan-fear-greed/normalize";
import { getSentimentLevel } from "../../src/lib/sentiment";
import type { SnapshotEntry } from "./snapshot-merge";

/** 信用倍率: 週末日の 3 営業日後（通常は翌週水曜）に公表 */
export const MARGIN_PUBLISH_LAG = 3;
/** 投資部門別売買状況: 週末日の 4 営業日後（通常は翌週木曜）に公表 */
export const INVESTOR_PUBLISH_LAG = 4;

export interface WeeklyValue {
  /** 週の最終営業日 "YYYY-MM-DD" */
  endDate: string;
  value: number;
}

/** date より後の n 番目の営業日。カレンダーが足りなければ null */
export function nthBusinessDayAfter(
  date: string,
  n: number,
  tradingDays: readonly string[]
): string | null {
  const later = tradingDays.filter((d) => d > date);
  return later[n - 1] ?? null;
}

/** date 以降で最初の水曜または木曜（祝日でもジョブは動くので暦日で数える） */
export function firstRefreshDayOnOrAfter(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  while (d.getUTCDay() !== 3 && d.getUTCDay() !== 4) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d.toISOString().slice(0, 10);
}

/** 週次データがスナップショットに反映され始める日 */
export function availableFrom(
  endDate: string,
  publishLag: number,
  tradingDays: readonly string[]
): string | null {
  const published = nthBusinessDayAfter(endDate, publishLag, tradingDays);
  return published == null ? null : firstRefreshDayOnOrAfter(published);
}

/** snapshotDate の時点で反映済みだった週次データ（週末日の昇順） */
export function weeksAvailableOn(
  snapshotDate: string,
  weeks: readonly WeeklyValue[],
  publishLag: number,
  tradingDays: readonly string[]
): WeeklyValue[] {
  return weeks
    .filter((w) => {
      const from = availableFrom(w.endDate, publishLag, tradingDays);
      return from != null && from <= snapshotDate;
    })
    .sort((a, b) => a.endDate.localeCompare(b.endDate));
}

export interface BackfillInputs {
  /** 海外投資家の週次売買差引（億円） */
  foreignFlowWeeks: readonly WeeklyValue[];
  /** 信用倍率（週次） */
  marginRatioWeeks: readonly WeeklyValue[];
  /** 営業日カレンダー（昇順） */
  tradingDays: readonly string[];
}

/**
 * C2 / C3 を再計算したエントリを返す。C1 / C4 / C5 は記録済みの値をそのまま使う。
 * 必要な週次データが揃わない場合は null（呼び出し側で元のエントリを残す）。
 */
export function recomputeEntry(
  entry: SnapshotEntry,
  inputs: BackfillInputs
): SnapshotEntry | null {
  const foreign = weeksAvailableOn(
    entry.date,
    inputs.foreignFlowWeeks,
    INVESTOR_PUBLISH_LAG,
    inputs.tradingDays
  );
  const margin = weeksAvailableOn(
    entry.date,
    inputs.marginRatioWeeks,
    MARGIN_PUBLISH_LAG,
    inputs.tradingDays
  );
  if (foreign.length < 4 || margin.length === 0) return null;

  const flow4w = foreign.slice(-4).reduce((sum, w) => sum + w.value, 0);
  const components = {
    ...entry.components,
    foreignFlow: normalizeForeignFlow(flow4w),
    marginRatio: normalizeMarginRatio(margin[margin.length - 1].value),
  };
  const values = Object.values(components);
  const score = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return {
    date: entry.date,
    score,
    level: getSentimentLevel(score),
    availableCount: values.length,
    components,
  };
}
