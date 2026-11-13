/**
 * 銘柄別温度の算出（純関数）。
 *
 * 日本版温度の C1（終値 vs 125日移動平均の乖離）と同じ考え方を各銘柄に適用する。
 * ただし個別株は指数より値動きが大きく、C1 の固定閾値（±15%）だと 0/100 に
 * 張り付く日が多い（2026-11 の検証で 23〜60%）ため、乖離を「その銘柄の直近1年の
 * 乖離の振れ幅（二乗平均平方根）」で割った z 値にし、±2σ を 0〜100 に割り当てる。
 * 振れ幅は各日時点の過去データだけで計算する（先読みなし）。
 */

import { mapToScore } from "../japan-fear-greed/utils";

export const STOCK_MA_WINDOW = 125;
/** 振れ幅（σ）を測る期間（営業日） */
export const STOCK_SIGMA_WINDOW = 250;
/** 0 / 100 に割り当てる z 値 */
export const STOCK_Z_RANGE = 2;

export interface DailyCloseInput {
  date: string;
  close: number;
}

/** [日付, 温度] の配列（日付昇順） */
export type TemperaturePoint = [date: string, score: number];

/**
 * 日付昇順の終値から温度系列を計算する。
 * 先頭 MA_WINDOW + SIGMA_WINDOW - 1 日分は σ が確定しないため出力しない。
 */
export function computeStockTemperatureSeries(
  closes: DailyCloseInput[]
): TemperaturePoint[] {
  const deviations: { date: string; dev: number }[] = [];
  let sum = 0;
  for (let i = 0; i < closes.length; i++) {
    sum += closes[i].close;
    if (i >= STOCK_MA_WINDOW) sum -= closes[i - STOCK_MA_WINDOW].close;
    if (i < STOCK_MA_WINDOW - 1) continue;
    const ma = sum / STOCK_MA_WINDOW;
    deviations.push({ date: closes[i].date, dev: (closes[i].close - ma) / ma });
  }

  const out: TemperaturePoint[] = [];
  let sumSq = 0;
  for (let i = 0; i < deviations.length; i++) {
    sumSq += deviations[i].dev ** 2;
    if (i >= STOCK_SIGMA_WINDOW) sumSq -= deviations[i - STOCK_SIGMA_WINDOW].dev ** 2;
    if (i < STOCK_SIGMA_WINDOW - 1) continue;
    const sigma = Math.sqrt(Math.max(sumSq, 0) / STOCK_SIGMA_WINDOW);
    const z = sigma > 0 ? deviations[i].dev / sigma : 0;
    out.push([deviations[i].date, mapToScore(z, -STOCK_Z_RANGE, STOCK_Z_RANGE)]);
  }
  return out;
}
