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

/** 日付 → 終値 の Map から、MA が取れる日（先頭 125 日より後）の市場温度を返す（日付昇順） */
export function computeJapanTemperatureSeries(
  nikkei: ReadonlyMap<string, number>
): JapanTemperaturePoint[] {
  const dates = [...nikkei.keys()].sort();
  const closes = dates.map((d) => nikkei.get(d)!);
  const out: JapanTemperaturePoint[] = [];
  let windowSum = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i >= MA_WINDOW) {
      const ma125 = windowSum / MA_WINDOW;
      out.push({
        date: dates[i],
        score: normalizeNikkeiMaDeviation(closes[i], ma125),
        nikkei: Math.round(closes[i] * 100) / 100,
      });
      windowSum -= closes[i - MA_WINDOW];
    }
    windowSum += closes[i];
  }
  return out;
}
