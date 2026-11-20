/**
 * 需給の温度（海外投資家フロー 4 週累計・信用買い残の 4 週変化）が、
 * その後の日経225 のリターンと関係があるかを確かめるための純粋関数。
 * analyze-supply-temperature.ts から I/O と分離してテスト可能にした。
 *
 * 再現の方針:
 *   - スコアの計算はライブのゲージと同じ normalize 関数を使う
 *   - 各営業日に「その日の取引が始まる前に知れた週」だけで計算する（先読みなし）。
 *     反映日の決め方は snapshot-backfill.ts の availableFrom（公表日以降で最初の水曜・木曜）だが、
 *     JPX の公表（信用残 水曜 15:00 頃 / 投資部門別 木曜 15:30）は大引け以降なので、
 *     反映日の終値では売買できない。そこで反映日の翌営業日から使う
 *   - 市場温度（C1）も同じ日について計算し、C1 と重ねて「C1 にない情報を持つか」を見る
 *
 * 試算専用。本体のスコア計算（src/lib/japan-fear-greed/）からは参照しない。
 */

import {
  normalizeForeignFlow,
  normalizeMarginBuyChange,
} from "../../src/lib/japan-fear-greed/normalize";
import { computeJapanTemperatureSeries } from "./japan-temperature";
import { INVESTOR_PUBLISH_LAG, MARGIN_PUBLISH_LAG, availableFrom } from "./snapshot-backfill";

export interface MarginHistoryWeek {
  /** 週の最終営業日 "YYYY-MM-DD" */
  date: string;
  buyBalance: number;
}

export interface FlowHistoryWeek {
  startDate: string;
  /** 週の最終日 "YYYY-MM-DD" */
  endDate: string;
  /** 海外投資家の売買差引（億円） */
  foreign: number;
}

/** 前方リターンを見る営業日数 */
export const HORIZONS = { "1m": 21, "3m": 63, "6m": 126 } as const;
export type HorizonKey = keyof typeof HORIZONS;
export const HORIZON_KEYS = Object.keys(HORIZONS) as HorizonKey[];

/** 4 週の窓として許す最長の暦日数（祝日週の欠けを許しつつ、長い欠損は弾く） */
export const MAX_4W_SPAN_DAYS = 35;

export interface SupplyDay {
  date: string;
  nikkei: number;
  /** 市場温度（C1） */
  c1: number;
  /** 海外投資家フロー 4 週累計（億円）と スコア。取れなければ null */
  flow4w: number | null;
  flowScore: number | null;
  /** 信用買い残の 4 週変化率（%）とスコア。取れなければ null */
  marginChange4w: number | null;
  marginScore: number | null;
  /**
   * 需給の温度 = 2 要素の平均。両方そろったときだけ値を持つ
   * （ライブは片方だけでも平均するが、2016 年より前の信用残だけの期間を混ぜないため）
   */
  supplyScore: number | null;
  /** 営業日ベースの前方リターン（%）。未経過なら null */
  forward: Record<HorizonKey, number | null>;
}

function daysBetween(a: string, b: string): number {
  return (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000;
}

/** 各週に「売買に使える最初の日」（反映日の翌営業日）を付ける。カレンダーが足りない週は除く */
function withFrom<T>(
  weeks: readonly T[],
  endDate: (w: T) => string,
  lag: number,
  tradingDays: readonly string[],
): Array<{ week: T; from: string }> {
  const out: Array<{ week: T; from: string }> = [];
  for (const w of weeks) {
    const reflected = availableFrom(endDate(w), lag, tradingDays);
    if (reflected == null) continue;
    const from = tradingDays.find((d) => d > reflected);
    if (from != null) out.push({ week: w, from });
  }
  return out;
}

/**
 * 営業日ごとに C1・需給の各スコア・前方リターンを並べる。
 * C1 が取れる日（日経の先頭 125 日より後）だけを返す。
 */
export function buildSupplyDays(
  nikkei: ReadonlyMap<string, number>,
  marginWeeks: readonly MarginHistoryWeek[],
  flowWeeks: readonly FlowHistoryWeek[],
): SupplyDay[] {
  const series = computeJapanTemperatureSeries(nikkei);
  const tradingDays = [...nikkei.keys()].sort();
  const indexOf = new Map(tradingDays.map((d, i) => [d, i]));

  // availableFrom は tradingDays を毎回なめるので、週ごとに一度だけ計算する
  const margin = withFrom(
    [...marginWeeks].sort((a, b) => a.date.localeCompare(b.date)),
    (w) => w.date,
    MARGIN_PUBLISH_LAG,
    tradingDays,
  );
  const flow = withFrom(
    [...flowWeeks].sort((a, b) => a.endDate.localeCompare(b.endDate)),
    (w) => w.endDate,
    INVESTOR_PUBLISH_LAG,
    tradingDays,
  );

  const out: SupplyDay[] = [];
  let mi = 0; // margin のうち、反映済みの週の数
  let fi = 0;
  for (const p of series) {
    while (mi < margin.length && margin[mi].from <= p.date) mi++;
    while (fi < flow.length && flow[fi].from <= p.date) fi++;

    let marginChange4w: number | null = null;
    if (mi >= 5) {
      const now = margin[mi - 1].week;
      const before = margin[mi - 5].week;
      if (before.buyBalance > 0 && daysBetween(before.date, now.date) <= MAX_4W_SPAN_DAYS) {
        marginChange4w = (now.buyBalance / before.buyBalance - 1) * 100;
      }
    }

    let flow4w: number | null = null;
    if (fi >= 4) {
      const last4 = flow.slice(fi - 4, fi).map((x) => x.week);
      if (daysBetween(last4[0].endDate, last4[3].endDate) <= MAX_4W_SPAN_DAYS - 7) {
        flow4w = last4.reduce((s, w) => s + w.foreign, 0);
      }
    }

    const flowScore = flow4w == null ? null : normalizeForeignFlow(flow4w);
    const marginScore = marginChange4w == null ? null : normalizeMarginBuyChange(marginChange4w);
    const supplyScore =
      flowScore != null && marginScore != null
        ? Math.round((flowScore + marginScore) / 2)
        : null;

    const i = indexOf.get(p.date)!;
    const forward = {} as Record<HorizonKey, number | null>;
    for (const key of HORIZON_KEYS) {
      const later = tradingDays[i + HORIZONS[key]];
      forward[key] = later == null ? null : (nikkei.get(later)! / nikkei.get(p.date)! - 1) * 100;
    }

    out.push({
      date: p.date,
      nikkei: p.nikkei,
      c1: p.score,
      flow4w,
      flowScore,
      marginChange4w,
      marginScore,
      supplyScore,
      forward,
    });
  }
  return out;
}

// --- 集計 -------------------------------------------------------------------

export interface ScoreBand {
  key: string;
  min: number;
  max: number;
}

/** 温度帯（サイト共通の 20 刻み） */
export const SCORE_BANDS: ScoreBand[] = [
  { key: "≤20", min: 0, max: 20 },
  { key: "21-40", min: 21, max: 40 },
  { key: "41-60", min: 41, max: 60 },
  { key: "61-80", min: 61, max: 80 },
  { key: "≥81", min: 81, max: 100 },
];

/** 需給を C1 と重ねるときの粗い 3 区分（セルの件数を確保するため） */
export const COARSE_BANDS: ScoreBand[] = [
  { key: "冷(≤35)", min: 0, max: 35 },
  { key: "中(36-64)", min: 36, max: 64 },
  { key: "熱(≥65)", min: 65, max: 100 },
];

export function bandOf(score: number, bands: readonly ScoreBand[]): ScoreBand {
  return bands.find((b) => score >= b.min && score <= b.max) ?? bands[bands.length - 1];
}

export interface ReturnStats {
  n: number;
  /** 平均リターン（%） */
  avg: number | null;
  /** 上昇した割合（%） */
  winRate: number | null;
}

export function returnStats(returns: readonly number[]): ReturnStats {
  if (returns.length === 0) return { n: 0, avg: null, winRate: null };
  const avg = returns.reduce((s, r) => s + r, 0) / returns.length;
  const win = (returns.filter((r) => r > 0).length / returns.length) * 100;
  return { n: returns.length, avg, winRate: win };
}

/** 前方リターンが経過済みの日だけで、h 期間のリターンを集める */
export function forwardReturns(days: readonly SupplyDay[], h: HorizonKey): number[] {
  return days.map((d) => d.forward[h]).filter((r): r is number => r != null);
}

/** 平均順位つきの順位（同値は平均順位） */
function ranks(values: readonly number[]): number[] {
  const idx = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = r;
    i = j + 1;
  }
  return out;
}

/** スピアマンの順位相関。2 件未満や分散ゼロは null */
export function spearman(x: readonly number[], y: readonly number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null;
  const rx = ranks(x);
  const ry = ranks(y);
  const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const mx = mean(rx);
  const my = mean(ry);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < rx.length; i++) {
    num += (rx[i] - mx) * (ry[i] - my);
    dx += (rx[i] - mx) ** 2;
    dy += (ry[i] - my) ** 2;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

/**
 * 該当日（pick が true の日）を、前の該当日から gapDays 営業日以内なら同じ回にまとめ、
 * 各回の最初の日を返す。日数ベースだと長引いた局面が多く数えられるのを補う
 */
export function episodeStarts(
  days: readonly SupplyDay[],
  pick: (d: SupplyDay) => boolean,
  gapDays = 20,
): SupplyDay[] {
  const starts: SupplyDay[] = [];
  let lastHit = -Infinity;
  days.forEach((d, i) => {
    if (!pick(d)) return;
    if (i - lastHit > gapDays) starts.push(d);
    lastHit = i;
  });
  return starts;
}
