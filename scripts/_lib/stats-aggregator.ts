/**
 * 温度帯別リターン集計の純粋関数。
 *
 * 米国版（VIX → S&P500）と日本版（C1+C5 → 日経225）で共通する
 * 「対象日の配列 + スコア算出関数 + 価格 Map → 温度帯別リターン配列」を抽出した。
 */

import { SENTIMENT_RANGES, findForwardPrice, getSentimentLevel } from "./shared";
import type { SentimentLevel } from "../../src/lib/types";

export interface AggregateLevelReturnsOptions<K extends string> {
  /** 集計対象となる基準日の配列（昇順ソート済） */
  dates: string[];
  /** 特定日のスコア（0-100）を返す。null ならその日はスキップ */
  scoreOf: (date: string) => number | null;
  /** 基準日および将来日の価格マップ（将来価格も同じマップから参照） */
  priceMap: Map<string, number>;
  /** 将来価格検索用の価格マップの日付配列（昇順ソート済） */
  priceDates: string[];
  /** 将来期間（例: { "1m": 30, "3m": 90, "6m": 180 }） */
  forwardDays: Record<K, number>;
}

export type LevelReturnMap<K extends string> = Record<
  SentimentLevel,
  {
    occurrences: number;
    returns: Record<K, number[]>;
  }
>;

/** 温度帯ごとに将来リターン配列を集計する。JSON 出力形状への整形は呼び出し側で行う。 */
export function aggregateLevelReturns<K extends string>({
  dates,
  scoreOf,
  priceMap,
  priceDates,
  forwardDays,
}: AggregateLevelReturnsOptions<K>): LevelReturnMap<K> {
  const forwardKeys = Object.keys(forwardDays) as K[];

  const result = {} as LevelReturnMap<K>;
  for (const { level } of SENTIMENT_RANGES) {
    const returns = {} as Record<K, number[]>;
    for (const key of forwardKeys) returns[key] = [];
    result[level] = { occurrences: 0, returns };
  }

  for (const date of dates) {
    const score = scoreOf(date);
    if (score == null) continue;
    const basePrice = priceMap.get(date);
    if (basePrice == null) continue;

    const level = getSentimentLevel(score);
    const entry = result[level];
    entry.occurrences++;

    for (const key of forwardKeys) {
      const days = forwardDays[key];
      const futurePrice = findForwardPrice(priceMap, priceDates, date, days);
      if (futurePrice != null) {
        const ret = ((futurePrice - basePrice) / basePrice) * 100;
        entry.returns[key].push(ret);
      }
    }
  }

  return result;
}

// --- 2D joint aggregator ---

export interface AggregateJointReturnsOptions<K extends string> {
  /** 集計対象となる基準日の配列 */
  dates: string[];
  /** 基準日を 2 つのバンドキーに分類。null ならスキップ */
  bucketOf: (date: string) => { band1: string; band2: string } | null;
  /** 基準日および将来日の価格マップ */
  priceMap: Map<string, number>;
  /** 価格マップの日付配列（昇順） */
  priceDates: string[];
  /** 将来期間 */
  forwardDays: Record<K, number>;
}

export interface JointCell<K extends string> {
  band1: string;
  band2: string;
  occurrences: number;
  returns: Record<K, number[]>;
}

/**
 * 2 次元バンド (band1 × band2) ごとに将来リターン配列を集計。
 * bucketOf は任意のカテゴリ分類関数で、例えば (信用倍率バンド, 温度バンド) のペアを返す。
 */
export function aggregateJointReturns<K extends string>({
  dates,
  bucketOf,
  priceMap,
  priceDates,
  forwardDays,
}: AggregateJointReturnsOptions<K>): JointCell<K>[] {
  const forwardKeys = Object.keys(forwardDays) as K[];
  const cellMap = new Map<string, JointCell<K>>();

  for (const date of dates) {
    const bucket = bucketOf(date);
    if (!bucket) continue;
    const basePrice = priceMap.get(date);
    if (basePrice == null) continue;

    const cellKey = `${bucket.band1}::${bucket.band2}`;
    let cell = cellMap.get(cellKey);
    if (!cell) {
      const returns = {} as Record<K, number[]>;
      for (const k of forwardKeys) returns[k] = [];
      cell = { band1: bucket.band1, band2: bucket.band2, occurrences: 0, returns };
      cellMap.set(cellKey, cell);
    }
    cell.occurrences++;

    for (const key of forwardKeys) {
      const days = forwardDays[key];
      const futurePrice = findForwardPrice(priceMap, priceDates, date, days);
      if (futurePrice != null) {
        const ret = ((futurePrice - basePrice) / basePrice) * 100;
        cell.returns[key].push(ret);
      }
    }
  }

  return Array.from(cellMap.values());
}
