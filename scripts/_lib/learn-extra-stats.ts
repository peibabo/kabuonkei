/**
 * 解説記事（/learn）に載せる補足の集計を作る純粋関数。
 *
 * - 値動きの大きさ（実現ボラティリティ）の水準別・その後の日経225 … 日経VI の記事用。
 *   日経VI そのものは取得できないため、日経225 の直近 20 営業日の値動きから計算した年率ボラを代わりに使う
 * - ドル円の勢い（50 営業日の変化率）の帯別・その後の日経225 … ドル円の記事用
 * - SQ のある週とない週の日経225 の値動き … 裁定残の記事用
 * - 海外投資家の売買（4 週累計）の帯別・その後の日経225 と、売買の向きと株価の向きの一致率 … 投資部門別の記事用
 */

import type {
  DirectionMatch,
  InvestorFlowBand,
  InvestorFlowStats,
  LearnExtraStats,
  LearnPeriodKey,
  LearnReturnBand,
  SqWeekGroup,
} from "../../src/lib/learn-extra-stats";
import type { PeriodStats } from "../../src/lib/historical-stats";
import type { InvestorFlowWeek } from "../../src/lib/investor-flow-history";
import { buildPeriodStats, round1 } from "./shared";
import { CRASH_HORIZONS } from "./nikkei-crash";

type Closes = Array<{ date: string; close: number }>;

/** 前方リターンの期間（営業日）。急落の分析（nikkei-crash）と同じ定義を使う */
export const LEARN_HORIZONS: Record<LearnPeriodKey, number> = {
  "1m": CRASH_HORIZONS["1m"],
  "3m": CRASH_HORIZONS["3m"],
  "6m": CRASH_HORIZONS["6m"],
};

/** 実現ボラの計算に使う営業日数 */
export const VOL_WINDOW = 20;
/** 年率換算に使う 1 年の営業日数 */
const TRADING_DAYS_PER_YEAR = 250;
/** ドル円の勢いを測る営業日数（旧 C5 と同じ） */
export const MOMENTUM_WINDOW = 50;

/** 実現ボラの帯（年率 %）。日経VI の目安（平時 15〜25、30 超で警戒）に合わせて区切る */
export const VOL_BANDS = [
  { label: "〜15", min: -Infinity, max: 15 },
  { label: "15〜25", min: 15, max: 25 },
  { label: "25〜35", min: 25, max: 35 },
  { label: "35〜", min: 35, max: Infinity },
] as const;

/** ドル円の 50 営業日変化率の帯（%） */
export const MOMENTUM_BANDS = [
  { label: "円高が急に進んだ（-5% 以下）", min: -Infinity, max: -5 },
  { label: "円高ぎみ（-5〜-2%）", min: -5, max: -2 },
  { label: "横ばい（-2〜+2%）", min: -2, max: 2 },
  { label: "円安ぎみ（+2〜+5%）", min: 2, max: 5 },
  { label: "円安が急に進んだ（+5% 以上）", min: 5, max: Infinity },
] as const;

/** 1 週間でこれ以上（絶対値 %）動いた週を「大きく動いた週」とする */
export const BIG_WEEK_MOVE = 3;

export function toSortedCloses(map: Map<string, number>): Closes {
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, close]) => ({ date, close }));
}

function statsFor(indices: number[], closes: Closes): Record<LearnPeriodKey, PeriodStats> {
  const out = {} as Record<LearnPeriodKey, PeriodStats>;
  for (const [key, h] of Object.entries(LEARN_HORIZONS) as [LearnPeriodKey, number][]) {
    const rs: number[] = [];
    for (const i of indices) {
      if (i + h < closes.length) rs.push((closes[i + h].close / closes[i].close - 1) * 100);
    }
    out[key] = buildPeriodStats(rs);
  }
  return out;
}

function bandIndex(value: number, bands: readonly { min: number; max: number }[]): number {
  // 下限を含み上限を含まない（最後の帯は上限なし）
  return bands.findIndex((b) => value >= b.min && value < b.max);
}

function buildBands(
  values: Array<number | null>,
  closes: Closes,
  bands: readonly { label: string; min: number; max: number }[],
  fromIndex: number
): LearnReturnBand[] {
  const buckets: number[][] = bands.map(() => []);
  for (let i = fromIndex; i < closes.length; i++) {
    const v = values[i];
    if (v == null) continue;
    const b = bandIndex(v, bands);
    if (b >= 0) buckets[b].push(i);
  }
  return bands.map((b, k) => ({
    band: b.label,
    occurrences: buckets[k].length,
    returns: statsFor(buckets[k], closes),
  }));
}

/** 日付 i を最後の日とする直近 window 営業日の日次対数リターンの標準偏差を年率 % にしたもの */
export function realizedVolSeries(closes: Closes, window = VOL_WINDOW): Array<number | null> {
  const logRets = closes.map((c, i) => (i === 0 ? 0 : Math.log(c.close / closes[i - 1].close)));
  return closes.map((_, i) => {
    if (i < window) return null;
    const xs = logRets.slice(i - window + 1, i + 1);
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
    return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
  });
}

/**
 * 日経225 の各日に、前の日（休場ならさらに前で最も近い日）までのドル円の 50 営業日変化率（%）を対応させる。
 * ドル円の日足はロンドンの日付で、その日の終値は日本時間の翌朝に付くため、同じ日付の値は日経225 の引け（15:30）
 * より後の値動きを含む。先の情報が混ざらないよう、日経225 の日付より前のドル円だけを使う。
 * 使うドル円が 5 日より古い日は null。
 */
export function usdJpyMomentumOnNikkeiDates(
  nikkei: Closes,
  usdJpy: Closes,
  window = MOMENTUM_WINDOW
): Array<number | null> {
  const momentum = new Map<string, number>();
  usdJpy.forEach((c, i) => {
    if (i >= window) momentum.set(c.date, (c.close / usdJpy[i - window].close - 1) * 100);
  });
  const usdDates = usdJpy.map((c) => c.date);
  let j = -1;
  return nikkei.map((n) => {
    while (j + 1 < usdDates.length && usdDates[j + 1] < n.date) j++;
    if (j < 0) return null;
    const d = usdDates[j];
    const gapDays = (Date.parse(n.date) - Date.parse(d)) / 86_400_000;
    if (gapDays > 5) return null;
    return momentum.get(d) ?? null;
  });
}

/**
 * その月の SQ 日（第 2 金曜。休場なら直前の営業日）。
 * 第 2 金曜がデータの最終日より後（まだ来ていない）や、その週に営業日が無い月は null。
 */
export function sqDateOfMonth(yearMonth: string, sortedDates: string[]): string | null {
  const [y, m] = yearMonth.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const firstFriday = 1 + ((5 - first.getUTCDay() + 7) % 7);
  const secondFriday = `${yearMonth}-${String(firstFriday + 7).padStart(2, "0")}`;
  const last = sortedDates[sortedDates.length - 1];
  if (last == null || secondFriday > last) return null;
  // 第 2 金曜以前で最も近い営業日（二分探索）
  let lo = 0;
  let hi = sortedDates.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (sortedDates[mid] <= secondFriday) lo = mid;
    else hi = mid - 1;
  }
  const d = sortedDates[lo];
  if (d > secondFriday) return null;
  // 休場なら前の営業日に繰り上がる（同じ週の中に限る）
  const gap = (Date.parse(secondFriday) - Date.parse(d)) / 86_400_000;
  return gap <= 4 ? d : null;
}

/** 月曜始まりの週のキー（その週の月曜日の日付） */
function weekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
}

function summarizeWeeks(label: string, moves: number[]): SqWeekGroup {
  const abs = moves.map(Math.abs);
  return {
    label,
    weeks: moves.length,
    avgAbsMove: moves.length ? round1(abs.reduce((a, b) => a + b, 0) / moves.length) : 0,
    avgReturn: moves.length ? round1(moves.reduce((a, b) => a + b, 0) / moves.length) : 0,
    bigMoveShare: moves.length
      ? round1((abs.filter((x) => x >= BIG_WEEK_MOVE).length / moves.length) * 100)
      : 0,
  };
}

/**
 * 週ごとの日経225 の騰落率（前の週の最終営業日の終値 → その週の最終営業日の終値）を、
 * メジャー SQ（3・6・9・12 月）の週 / マイナー SQ の週 / SQ のない週 に分けて集計する。
 * from を渡すと、その日以降に終わる週だけを数える（前の週の終値は from より前でもよい）。
 * データの最後の週は、まだ終わっていない可能性があるため数えない。
 */
export function computeSqWeekGroups(closes: Closes, from = ""): SqWeekGroup[] {
  const dates = closes.map((c) => c.date);
  const sqByWeek = new Map<string, string>();
  for (const ym of new Set(dates.map((d) => d.slice(0, 7)))) {
    const sq = sqDateOfMonth(ym, dates);
    if (sq) sqByWeek.set(weekKey(sq), sq);
  }

  const weekLast = new Map<string, { date: string; close: number }>();
  for (const c of closes) weekLast.set(weekKey(c.date), c);
  const weeks = [...weekLast.keys()].sort();

  const major: number[] = [];
  const minor: number[] = [];
  const none: number[] = [];
  // 最後の週（weeks.length - 1）は数えない
  for (let k = 1; k < weeks.length - 1; k++) {
    const prev = weekLast.get(weeks[k - 1])!;
    const cur = weekLast.get(weeks[k])!;
    if (cur.date < from) continue;
    const move = (cur.close / prev.close - 1) * 100;
    const sqInWeek = sqByWeek.get(weeks[k]);
    if (!sqInWeek) none.push(move);
    else if (["03", "06", "09", "12"].includes(sqInWeek.slice(5, 7))) major.push(move);
    else minor.push(move);
  }
  return [
    summarizeWeeks("メジャー SQ の週", major),
    summarizeWeeks("マイナー SQ の週", minor),
    summarizeWeeks("SQ のない週", none),
  ];
}

// --- 投資部門別（海外投資家のフロー） ---

/** 海外投資家の 4 週累計の帯（億円）。株温計の「需給の温度」（4 週で ±2 兆円を 0〜100）の 25 / 50 / 75 に当たる ±1 兆円と 0 で区切る */
export const FLOW_BANDS = [
  { label: "1 兆円以上の売り越し", min: -Infinity, max: -10_000 },
  { label: "1 兆円未満の売り越し", min: -10_000, max: 0 },
  { label: "1 兆円未満の買い越し", min: 0, max: 10_000 },
  { label: "1 兆円以上の買い越し", min: 10_000, max: Infinity },
] as const;
/** 累計する週数（需給の温度と同じ） */
export const FLOW_WEEKS = 4;
/**
 * 週次データは翌週の第 4 営業日（原則木曜）の 15:30 に出る。取引終了と同じ時刻なので、
 * 「公表後」はその次の営業日の終値から数える（週の最終日の後の 5 営業日目）
 */
export const PUBLISH_BUSINESS_DAY = 4;/** 公表後の値動きを見る営業日数（1 週間） */
const AFTER_PUBLISH_DAYS = 5;

const DAY_MS = 86_400_000;
const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** date 以上で最初の営業日の位置（なければ -1） */
function firstIndexOnOrAfter(dates: string[], date: string): number {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] < date) lo = mid + 1;
    else hi = mid;
  }
  return lo < dates.length ? lo : -1;
}

function matchRate(pairs: Array<[number, number]>): DirectionMatch {
  const valid = pairs.filter(([a, b]) => a !== 0 && b !== 0);
  const hits = valid.filter(([a, b]) => Math.sign(a) === Math.sign(b)).length;
  return { weeks: valid.length, matchRate: valid.length ? round1((hits / valid.length) * 100) : 0 };
}

export function computeInvestorFlowStats(weeks: InvestorFlowWeek[], nikkei: Closes): InvestorFlowStats {
  const sorted = [...weeks].sort((a, b) => a.endDate.localeCompare(b.endDate));
  const dates = nikkei.map((c) => c.date);
  // 前の週とつながっているか: 前の週の最終日と次の週の初日の間に日経225 の営業日がない（大型連休は休場なのでつながる）
  const connected = (k: number) => {
    if (k === 0) return false;
    const i = firstIndexOnOrAfter(dates, addDays(sorted[k - 1].endDate, 1));
    return i < 0 || dates[i] >= sorted[k].startDate;
  };

  // 公表翌日の終値の位置。日経225 のデータがまだない（公表前・直後）週は -1
  const entry = sorted.map((w) => {
    const firstNext = firstIndexOnOrAfter(dates, addDays(w.endDate, 1));
    const i = firstNext < 0 ? -1 : firstNext + PUBLISH_BUSINESS_DAY;
    return i >= 0 && i < dates.length ? i : -1;
  });
  const conn = sorted.map((_, k) => connected(k));

  // 4 週累計（途中で週が抜けていたら null）
  const sum4 = sorted.map((_, k) => {
    if (k < FLOW_WEEKS - 1) return null;
    let total = 0;
    for (let j = k - FLOW_WEEKS + 1; j <= k; j++) {
      if (j > k - FLOW_WEEKS + 1 && !conn[j]) return null;
      total += sorted[j].foreign;
    }
    return total;
  });

  const buckets: number[][] = FLOW_BANDS.map(() => []);
  const episodeStarts: string[][] = FLOW_BANDS.map(() => []);
  let prevBand = -1;
  sorted.forEach((_, k) => {
    const v = sum4[k];
    const b = v == null ? -1 : bandIndex(v, FLOW_BANDS);
    if (b >= 0 && entry[k] >= 0) {
      buckets[b].push(entry[k]);
      if (!(b === prevBand && conn[k])) episodeStarts[b].push(sorted[k].endDate);
    }
    prevBand = b >= 0 && entry[k] >= 0 ? b : -1;
  });
  const bands: InvestorFlowBand[] = FLOW_BANDS.map((b, k) => ({
    band: b.label,
    occurrences: buckets[k].length,
    episodes: episodeStarts[k].length,
    episodeStarts: episodeStarts[k],
    returns: statsFor(buckets[k], nikkei),
  }));
  const allEntries = sum4.flatMap((v, k) => (v != null && entry[k] >= 0 ? [entry[k]] : []));

  // 同じ週の日経225: 前の週の最後の終値 → その週の最後の終値
  const sameWeek: Array<[number, number]> = [];
  const afterPublish: Array<[number, number]> = [];
  const opposite: Array<[number, number]> = [];
  sorted.forEach((w, k) => {
    const next = firstIndexOnOrAfter(dates, addDays(w.endDate, 1));
    const end = (next < 0 ? dates.length : next) - 1;
    const start = firstIndexOnOrAfter(dates, w.startDate) - 1;
    if (start >= 0 && end > start && next >= 0) {
      sameWeek.push([w.foreign, nikkei[end].close / nikkei[start].close - 1]);
    }
    const p = entry[k];
    if (p >= 0 && p + AFTER_PUBLISH_DAYS < nikkei.length) {
      afterPublish.push([w.foreign, nikkei[p + AFTER_PUBLISH_DAYS].close / nikkei[p].close - 1]);
    }
    opposite.push([w.foreign, -w.individual]);
  });
  const opp = matchRate(opposite);

  const lastK = sum4.length - 1;
  return {
    dataRange: { from: sorted[0]?.startDate ?? "", to: sorted[sorted.length - 1]?.endDate ?? "" },
    bands,
    baseline: { occurrences: allEntries.length, returns: statsFor(allEntries, nikkei) },
    sameWeek: matchRate(sameWeek),
    afterPublish: matchRate(afterPublish),
    foreignVsIndividual: { weeks: opp.weeks, oppositeRate: opp.matchRate },
    latest:
      lastK >= 0 && sum4[lastK] != null
        ? { endDate: sorted[lastK].endDate, foreign4w: Math.round(sum4[lastK]!) }
        : null,
  };
}

export function computeLearnExtraStats(
  nikkeiMap: Map<string, number>,
  usdJpyMap: Map<string, number>,
  { from, generatedAt, flowWeeks = [] }: { from: string; generatedAt: string; flowWeeks?: InvestorFlowWeek[] }
): LearnExtraStats {
  const nikkei = toSortedCloses(nikkeiMap);
  const usdJpy = toSortedCloses(usdJpyMap);
  // 計算の助走（20 日・50 日）には from より前のデータも使い、集計の起点だけを from 以降にする
  const fromIndex = nikkei.findIndex((c) => c.date >= from);
  const start = fromIndex < 0 ? nikkei.length : fromIndex;
  const all = Array.from({ length: nikkei.length - start }, (_, k) => start + k);

  const vol = realizedVolSeries(nikkei);
  const momentum = usdJpyMomentumOnNikkeiDates(nikkei, usdJpy);
  const latestVol = vol[vol.length - 1];
  const latestMomentum = momentum[momentum.length - 1];

  return {
    generatedAt,
    dataRange: { from: nikkei[start]?.date ?? from, to: nikkei[nikkei.length - 1]?.date ?? from },
    baseline: { occurrences: all.length, returns: statsFor(all, nikkei) },
    realizedVol: {
      window: VOL_WINDOW,
      bands: buildBands(vol, nikkei, VOL_BANDS, start),
      latest: latestVol == null ? null : round1(latestVol),
    },
    usdJpyMomentum: {
      window: MOMENTUM_WINDOW,
      bands: buildBands(momentum, nikkei, MOMENTUM_BANDS, start),
      latest: latestMomentum == null ? null : round1(latestMomentum),
    },
    sqWeeks: {
      bigMoveThreshold: BIG_WEEK_MOVE,
      groups: computeSqWeekGroups(nikkei, from),
    },
    investorFlow: computeInvestorFlowStats(flowWeeks, nikkei),
  };
}
