/**
 * 日経225 の 125 日移動平均乖離率（市場温度の元の値）ごとに、その後の値動きを集計する純粋関数。
 *
 * - 乖離率は市場温度と同じく、当日の終値を「当日を含まない直前 125 営業日」の平均と比べる
 * - 乖離率の区切り（DEVIATION_BANDS）ごとに、その日に買った場合の 1ヶ月〜1年後のリターンを日数ベースで集計する
 * - 時期による違いを見るため、乖離率が計算できる日数をちょうど半分に分けた前半・後半でも集計する
 *   （区切りの年を手で選ばないよう、日数の中点で機械的に分ける）
 * - 乖離が ±extremeThreshold を超えた日は、前の該当日から mergeWindow 営業日以内なら同じ 1 回にまとめ、
 *   回数ベースでも集計する（長く続いた下げ相場の日数が多く数えられて結果が偏るのを防ぐ）
 */

import {
  classifyDeviation,
  DEVIATION_BANDS,
  deviationToTemperature,
  type DeviationBandStats,
  type DeviationEpisode,
  type DeviationPeriodKey,
  type NikkeiMaDeviationAnalysis,
} from "../../src/lib/nikkei-ma-deviation-analysis";
import type { PeriodStats } from "../../src/lib/historical-stats";
import { computeTrailingMa125, MA_WINDOW } from "./japan-temperature";
import { CRASH_HORIZONS, DRAWDOWN_WINDOW } from "./nikkei-crash";
import { buildPeriodStats, round1 } from "./shared";

export interface MaDeviationOptions {
  extremeThreshold?: number;
  mergeWindow?: number;
  generatedAt: string;
}

type Closes = Array<{ date: string; close: number }>;

const HORIZONS: Record<DeviationPeriodKey, number> = CRASH_HORIZONS;

function statsFor(
  indices: number[],
  closes: Closes
): Record<DeviationPeriodKey, PeriodStats> {
  const out = {} as Record<DeviationPeriodKey, PeriodStats>;
  for (const [key, h] of Object.entries(HORIZONS) as [DeviationPeriodKey, number][]) {
    const rs: number[] = [];
    for (const i of indices) {
      // 平均がぶれないよう丸める前の値で集計する
      if (i + h < closes.length) rs.push((closes[i + h].close / closes[i].close - 1) * 100);
    }
    out[key] = buildPeriodStats(rs);
  }
  return out;
}

function splitStats(
  indices: number[],
  closes: Closes,
  splitIdx: number
): Omit<DeviationBandStats, "key"> {
  return {
    all: statsFor(indices, closes),
    firstHalf: statsFor(
      indices.filter((i) => i < splitIdx),
      closes
    ),
    secondHalf: statsFor(
      indices.filter((i) => i >= splitIdx),
      closes
    ),
  };
}

function buildEpisodes(
  hits: number[],
  closes: Closes,
  deviation: (number | null)[],
  mergeWindow: number,
  side: "low" | "high"
): { episodes: DeviationEpisode[]; startIdx: number[] } {
  const groups: number[][] = [];
  for (const i of hits) {
    const g = groups.at(-1);
    if (g && i - g[g.length - 1] <= mergeWindow) g.push(i);
    else groups.push([i]);
  }
  const episodes = groups.map((g) => {
    const i = g[0];
    const devs = g.map((j) => deviation[j]!);
    const end = Math.min(closes.length - 1, i + DRAWDOWN_WINDOW);
    let low = i;
    for (let j = i; j <= end; j++) {
      if (closes[j].close < closes[low].close) low = j;
    }
    const returns = {} as Record<DeviationPeriodKey, number | null>;
    for (const [key, h] of Object.entries(HORIZONS) as [DeviationPeriodKey, number][]) {
      returns[key] =
        i + h < closes.length ? round1((closes[i + h].close / closes[i].close - 1) * 100) : null;
    }
    return {
      date: closes[i].date,
      deviation: round1(deviation[i]!),
      peakDeviation: round1(side === "low" ? Math.min(...devs) : Math.max(...devs)),
      close: Math.round(closes[i].close * 100) / 100,
      returns,
      maxFurtherDrawdown: round1((closes[low].close / closes[i].close - 1) * 100),
      daysToLow: low - i,
      isComplete: i + DRAWDOWN_WINDOW < closes.length,
    };
  });
  return { episodes, startIdx: groups.map((g) => g[0]) };
}

/** 日付 → 終値 の Map から乖離率の分析 JSON を組み立てる */
export function computeNikkeiMaDeviationAnalysis(
  nikkei: ReadonlyMap<string, number>,
  options: MaDeviationOptions
): NikkeiMaDeviationAnalysis {
  const extremeThreshold = options.extremeThreshold ?? 15;
  const mergeWindow = options.mergeWindow ?? 20;

  const closes: Closes = [...nikkei.entries()]
    .map(([date, close]) => ({ date, close }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  if (closes.length <= MA_WINDOW + 1) {
    throw new Error(`日経225 の終値が ${MA_WINDOW + 2} 日分未満です`);
  }

  // 市場温度と同じく、当日を含まない直前 125 営業日の平均と比べる（計算は japan-temperature.ts と共有）
  const ma = computeTrailingMa125(closes.map((c) => c.close));
  const deviation = ma.map((m, i) => (m == null ? null : (closes[i].close / m - 1) * 100));

  const valid = closes.map((_, i) => i).filter((i) => deviation[i] != null);
  const splitIdx = valid[Math.floor(valid.length / 2)];

  const byBand = new Map<string, number[]>(DEVIATION_BANDS.map((b) => [b.key, []]));
  for (const i of valid) byBand.get(classifyDeviation(deviation[i]!))!.push(i);

  const lowHits = valid.filter((i) => deviation[i]! <= -extremeThreshold);
  const highHits = valid.filter((i) => deviation[i]! >= extremeThreshold);
  const low = buildEpisodes(lowHits, closes, deviation, mergeWindow, "low");
  const high = buildEpisodes(highHits, closes, deviation, mergeWindow, "high");

  const last = closes.length - 1;
  const latestDeviation = deviation[last]!;
  return {
    generatedAt: options.generatedAt,
    dataRange: { from: closes[valid[0]].date, to: closes[last].date },
    maWindow: MA_WINDOW,
    mergeWindow,
    extremeThreshold,
    dayCount: valid.length,
    halfSplitDate: closes[splitIdx].date,
    baseline: splitStats(valid, closes, splitIdx),
    bands: DEVIATION_BANDS.map((b) => ({
      key: b.key,
      ...splitStats(byBand.get(b.key)!, closes, splitIdx),
    })),
    lowEpisodes: low.episodes,
    highEpisodes: high.episodes,
    episodeSummary: {
      low: statsFor(low.startIdx, closes),
      high: statsFor(high.startIdx, closes),
    },
    latest: {
      date: closes[last].date,
      deviation: round1(latestDeviation),
      // 区切りと温度は丸める前の値で決める（境界付近で集計・トップのゲージとずれないように）
      bandKey: classifyDeviation(latestDeviation),
      temperature: deviationToTemperature(latestDeviation),
      close: Math.round(closes[last].close * 100) / 100,
    },
  };
}
