/**
 * 日本版 市場温度（C1 = 日経225 の 125 日移動平均乖離）の日次系列を計算する純粋関数。
 *
 * 過去推移・過去統計・類似日・業種ヒートマップの生成スクリプトで共通に使う。
 * ライブのゲージ（src/lib/japan-fear-greed/compute.ts）と同じく、
 * 当日の終値を「当日を含まない直前 125 営業日」の平均と比べる。
 */

import { normalizeNikkeiMaDeviation } from "../../src/lib/japan-fear-greed/normalize";

export const MA_WINDOW = 125;

export interface JapanTemperaturePoint {
  date: string;
  score: number;
  /** 日経225 終値 */
  nikkei: number;
}

/**
 * 日付昇順の終値配列から、各日の「当日を含まない直前 125 営業日」の平均を返す。
 * 先頭 125 日は平均が取れないので null。市場温度と、乖離率の分析記事（nikkei-ma-deviation.ts）で共有する
 */
export function computeTrailingMa125(closes: readonly number[]): (number | null)[] {
  const out: (number | null)[] = [];
  let windowSum = 0;
  for (let i = 0; i < closes.length; i++) {
    if (i >= MA_WINDOW) {
      out.push(windowSum / MA_WINDOW);
      windowSum -= closes[i - MA_WINDOW];
    } else {
      out.push(null);
    }
    windowSum += closes[i];
  }
  return out;
}

/** 日付 → 終値 の Map から、MA が取れる日（先頭 125 日より後）の市場温度を返す（日付昇順） */
export function computeJapanTemperatureSeries(
  nikkei: ReadonlyMap<string, number>
): JapanTemperaturePoint[] {
  const dates = [...nikkei.keys()].sort();
  const closes = dates.map((d) => nikkei.get(d)!);
  const ma = computeTrailingMa125(closes);
  const out: JapanTemperaturePoint[] = [];
  for (let i = 0; i < dates.length; i++) {
    const ma125 = ma[i];
    if (ma125 == null) continue;
    out.push({
      date: dates[i],
      score: normalizeNikkeiMaDeviation(closes[i], ma125),
      nikkei: Math.round(closes[i] * 100) / 100,
    });
  }
  return out;
}
