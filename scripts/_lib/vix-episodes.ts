/**
 * VIX が閾値（既定 30）以上になった日を「1 回の高騰」ごとにまとめ、
 * 最初の日に S&P500 を買った場合の前方リターンを集計する純粋関数。
 *
 * VIX バンド別の日数ベース集計（generate-vix-sp500-analysis.ts の primary）は、
 * リーマン・ショックのように長引いた危機ほど多く数えられ、危機の後半（底に近い日）が勝率を押し上げる。
 * 「30 を超えた日に買ったらどうだったか」を見るには、回数ベースのこの集計を併せて見る必要がある。
 *
 * まとめ方は日経平均の急落分析（nikkei-crash.ts）と同じ: 前の該当日から GAP 営業日以内の該当日は同じ回。
 */

import { buildPeriodStats, findForwardPrice, round1 } from "./shared";
import type { PeriodStats } from "./shared";
import type {
  VixAnalysisPeriodKey,
  VixEpisode,
  VixEpisodeSummary,
} from "../../src/lib/vix-sp500-analysis";

export const VIX_EPISODE_THRESHOLD = 30;
/** 前の該当日からこの営業日数以内なら同じ回とみなす */
export const VIX_EPISODE_GAP = 20;
/** 「最初の日が底だったか」を見る期間（カレンダー日） */
export const VIX_EPISODE_DRAWDOWN_DAYS = 180;

type VixEpisodePeriodKey = VixAnalysisPeriodKey;

export function computeVixEpisodes(
  vixMap: ReadonlyMap<string, number>,
  spMap: Map<string, number>,
  forwardDays: Record<VixEpisodePeriodKey, number>,
  opts: { threshold?: number; gap?: number } = {}
): VixEpisodeSummary {
  const threshold = opts.threshold ?? VIX_EPISODE_THRESHOLD;
  const gap = opts.gap ?? VIX_EPISODE_GAP;
  const spDates = [...spMap.keys()].sort();
  // VIX と S&P500 の両方がある日を取引日として数える（primary と同じ母集団）
  const dates = [...vixMap.keys()].filter((d) => spMap.has(d)).sort();
  const lastSpDate = spDates[spDates.length - 1];
  const periods = Object.keys(forwardDays) as VixEpisodePeriodKey[];

  const forward = (date: string, key: VixEpisodePeriodKey): number | null => {
    const base = spMap.get(date);
    const p = findForwardPrice(spMap, spDates, date, forwardDays[key]);
    if (base == null || p == null) return null;
    return ((p - base) / base) * 100;
  };

  const groups: number[][] = [];
  let last = -Infinity;
  dates.forEach((d, i) => {
    if (vixMap.get(d)! < threshold) return;
    if (i - last > gap) groups.push([i]);
    else groups[groups.length - 1].push(i);
    last = i;
  });

  // 平均・勝率がぶれないよう、丸める前の値で集計する（nikkei-crash.ts と同じ）
  const rawFirstDay: Record<VixEpisodePeriodKey, number[]> = { "1m": [], "3m": [], "6m": [] };
  let bottomCount = 0;
  let bottomOf = 0;

  const episodes: VixEpisode[] = groups.map((g) => {
    const start = dates[g[0]];
    let peakIdx = g[0];
    for (const i of g) if (vixMap.get(dates[i])! > vixMap.get(dates[peakIdx])!) peakIdx = i;

    const sp500 = {} as Record<VixEpisodePeriodKey, number | null>;
    for (const k of periods) {
      const r = forward(start, k);
      if (r != null) rawFirstDay[k].push(r);
      sp500[k] = r == null ? null : round1(r);
    }

    // 180 日たっていなければ底かどうかは判定しない
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + VIX_EPISODE_DRAWDOWN_DAYS);
    const endStr = endDate.toISOString().split("T")[0];
    let drawdown: number | null = null;
    if (lastSpDate >= endStr) {
      const base = spMap.get(start)!;
      let min = base;
      for (const d of spDates) {
        if (d > start && d <= endStr) min = Math.min(min, spMap.get(d)!);
      }
      bottomOf++;
      if (min >= base) bottomCount++;
      // 丸めで -0 にならないよう、さらに下げていない回は 0 にそろえる
      drawdown = min >= base ? 0 : Math.min(round1(((min - base) / base) * 100), -0.1);
    }

    return {
      start,
      end: dates[g[g.length - 1]],
      days: g.length,
      firstVix: round1(vixMap.get(start)!),
      peakVix: round1(vixMap.get(dates[peakIdx])!),
      peakDate: dates[peakIdx],
      sp500,
      sp500Drawdown: drawdown,
    };
  });

  const firstDay = {} as Record<VixEpisodePeriodKey, PeriodStats>;
  const baseline = {} as Record<VixEpisodePeriodKey, PeriodStats>;
  for (const k of periods) {
    firstDay[k] = buildPeriodStats(rawFirstDay[k]);
    baseline[k] = buildPeriodStats(
      dates.map((d) => forward(d, k)).filter((v): v is number => v != null)
    );
  }

  return {
    threshold,
    gapTradingDays: gap,
    totalDays: groups.reduce((s, g) => s + g.length, 0),
    episodes,
    firstDay,
    baseline,
    bottom: { count: bottomCount, of: bottomOf },
  };
}
