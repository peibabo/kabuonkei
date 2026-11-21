/**
 * 海外投資家の売買（4 週累計）と信用買い残の 4 週変化が、その後の日経225 の値動きと
 * 関係があるかを集計する純粋関数（記事 /analysis/supply-demand-signals 用）。
 *
 * - 各営業日の値は supply-temperature-analysis.ts の buildSupplyDays() で作る
 *   （JPX の公表は大引け以降なので、各週は反映日の翌営業日から使う。先読みなし）
 * - 区切り（FLOW_BANDS / MARGIN_BANDS）ごとに、その日に買った場合の 1・3・6ヶ月後のリターンを日数ベースで集計
 * - 時期による違いを見るため、指標ごとに値が取れる日数をちょうど半分に分けた前半・後半でも集計
 * - 極端な値（海外勢 −1兆円以下 / 信用買い残 −10% 以下）の日は、前の該当日から mergeWindow 営業日以内なら
 *   同じ 1 回にまとめ、回数ベースでも集計
 * - 市場温度が coldThreshold 以下の日を「需給も悪い日」（海外勢 −1兆円以下 / 信用買い残 −3% 以下）と
 *   それ以外に分け、温度にない情報を持つかを見る
 */

import type { PeriodStats } from "../../src/lib/historical-stats";
import {
  classifySupply,
  FLOW_BANDS,
  MARGIN_BANDS,
  type SupplyBand,
  type SupplyBandStats,
  type SupplyDemandAnalysis,
  type SupplyEpisode,
  type SupplyIndicatorAnalysis,
  type SupplyPeriodKey,
} from "../../src/lib/supply-demand-analysis";
import { buildPeriodStats, round1 } from "./shared";
import {
  buildSupplyDays,
  episodeStarts,
  forwardReturns,
  HORIZON_KEYS,
  spearman,
  type FlowHistoryWeek,
  type MarginHistoryWeek,
  type SupplyDay,
} from "./supply-temperature-analysis";

export interface SupplyDemandOptions {
  generatedAt: string;
  mergeWindow?: number;
  coldThreshold?: number;
  flowExtreme?: number;
  marginExtreme?: number;
  marginWeakThreshold?: number;
}

const PERIODS = HORIZON_KEYS as SupplyPeriodKey[];

function statsFor(days: readonly SupplyDay[]): Record<SupplyPeriodKey, PeriodStats> {
  const out = {} as Record<SupplyPeriodKey, PeriodStats>;
  // 平均がぶれないよう丸める前の値で集計する
  for (const p of PERIODS) out[p] = buildPeriodStats(forwardReturns(days, p));
  return out;
}

function splitStats(days: readonly SupplyDay[], splitDate: string): Omit<SupplyBandStats, "key"> {
  return {
    all: statsFor(days),
    firstHalf: statsFor(days.filter((d) => d.date < splitDate)),
    secondHalf: statsFor(days.filter((d) => d.date >= splitDate)),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function analyzeIndicator(
  all: readonly SupplyDay[],
  value: (d: SupplyDay) => number | null,
  bands: readonly SupplyBand[],
  opts: {
    extreme: number;
    mergeWindow: number;
    coldThreshold: number;
    coldWeak: number;
    roundValue: (v: number) => number;
  }
): SupplyIndicatorAnalysis {
  const has = (d: SupplyDay) => value(d) != null;
  const days = all.filter(has);
  if (days.length === 0) throw new Error("需給の値が取れる日がありません");
  const splitDate = days[Math.floor(days.length / 2)].date;

  // 欠損日を詰めると離れた回がまとまるので、欠損を含む元の並びで数える
  const starts = episodeStarts(
    all,
    (d) => has(d) && value(d)! <= opts.extreme,
    opts.mergeWindow
  );
  const extremeEpisodes: SupplyEpisode[] = starts.map((d) => ({
    date: d.date,
    value: opts.roundValue(value(d)!),
    temperature: d.c1,
    returns: Object.fromEntries(
      PERIODS.map((p) => [p, d.forward[p] == null ? null : round1(d.forward[p]!)])
    ) as Record<SupplyPeriodKey, number | null>,
  }));

  const correlation = {} as Record<SupplyPeriodKey, number | null>;
  for (const p of PERIODS) {
    const t = days.filter((d) => d.forward[p] != null);
    const r = spearman(
      t.map((d) => value(d)!),
      t.map((d) => d.forward[p]!)
    );
    correlation[p] = r == null ? null : round2(r);
  }

  const cold = days.filter((d) => d.c1 <= opts.coldThreshold);
  return {
    dataRange: { from: days[0].date, to: days[days.length - 1].date },
    dayCount: days.length,
    halfSplitDate: splitDate,
    baseline: splitStats(days, splitDate),
    bands: bands.map((b) => ({
      key: b.key,
      ...splitStats(
        days.filter((d) => classifySupply(value(d)!, bands) === b.key),
        splitDate
      ),
    })),
    extremeThreshold: opts.extreme,
    extremeEpisodes,
    extremeSummary: statsFor(starts),
    correlation,
    coldWeakThreshold: opts.coldWeak,
    cold: {
      all: splitStats(cold, splitDate),
      weak: splitStats(
        cold.filter((d) => value(d)! <= opts.coldWeak),
        splitDate
      ),
      other: splitStats(
        cold.filter((d) => value(d)! > opts.coldWeak),
        splitDate
      ),
    },
  };
}

/** 日経の終値と JPX の週次データから、記事の JSON を組み立てる */
export function computeSupplyDemandAnalysis(
  nikkei: ReadonlyMap<string, number>,
  marginWeeks: readonly MarginHistoryWeek[],
  flowWeeks: readonly FlowHistoryWeek[],
  options: SupplyDemandOptions
): SupplyDemandAnalysis {
  const mergeWindow = options.mergeWindow ?? 20;
  const coldThreshold = options.coldThreshold ?? 20;
  const flowExtreme = options.flowExtreme ?? -10000;
  const marginExtreme = options.marginExtreme ?? -10;
  const marginWeakThreshold = options.marginWeakThreshold ?? -3;

  const all = buildSupplyDays(nikkei, marginWeeks, flowWeeks);
  if (all.length === 0) throw new Error("日経225 の終値が足りません");

  const flow = analyzeIndicator(all, (d) => d.flow4w, FLOW_BANDS, {
    extreme: flowExtreme,
    mergeWindow,
    coldThreshold,
    // 市場温度が低い日はほぼ毎日売り越しなので、大きく売り越した日（極端な値と同じ線）で分ける
    coldWeak: flowExtreme,
    roundValue: Math.round,
  });
  const margin = analyzeIndicator(all, (d) => d.marginChange4w, MARGIN_BANDS, {
    extreme: marginExtreme,
    mergeWindow,
    coldThreshold,
    coldWeak: marginWeakThreshold,
    roundValue: round1,
  });

  const last = all[all.length - 1];
  return {
    generatedAt: options.generatedAt,
    mergeWindow,
    coldThreshold,
    flow,
    margin,
    latest: {
      date: last.date,
      temperature: last.c1,
      flow4w: last.flow4w == null ? null : Math.round(last.flow4w),
      // 区切りは丸める前の値で決める
      flowBandKey: last.flow4w == null ? null : classifySupply(last.flow4w, FLOW_BANDS),
      marginChange4w: last.marginChange4w == null ? null : round1(last.marginChange4w),
      marginBandKey:
        last.marginChange4w == null ? null : classifySupply(last.marginChange4w, MARGIN_BANDS),
    },
  };
}
