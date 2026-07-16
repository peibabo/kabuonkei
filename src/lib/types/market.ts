import type {
  BondYieldData,
  CommodityData,
  ForexData,
  IndexData,
  VolatilityData,
} from "./common";
import type { FearGreedData } from "./us-fear-greed";
import type { JapanFearGreedData } from "./japan-fear-greed";

export interface MarketData {
  fearGreed: FearGreedData;
  japanFearGreed: JapanFearGreedData | null;
  /**
   * 前回観測の日本版温度スコア。
   * `japan-fg-snapshots.json` の最新スナップショット（無ければ `japan-temperature-history.json` の末尾簡易版）。
   * トップ画面ヒーローの「昨日比」表示に使う。null なら直近観測なし。
   */
  previousJapanScore: number | null;
  /**
   * 現在の日本版温度レベル（極寒〜沸騰）の連続営業日数（当日含む）。
   * `japan-fg-snapshots.json`（full5 法）由来。null なら不明（日本スコア欠損時）。
   * トップ画面ヒーローの「N日目」見出しに使う。
   */
  japanLevelStreak: number | null;
  /**
   * 直近 7 日間の日本版温度スコア（古い→新しい順）。
   * トップ画面ヒーロータイル内 sparkline 用。空配列なら表示しない。
   */
  japanSparkline: number[];
  /**
   * 直近 7 日間の米国版温度スコア（古い→新しい順）。
   * 現状は previousClose / oneWeekAgo / 現在値の 3 点のみ。Phase 2 で拡張余地あり。
   */
  usSparkline: number[];
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
  lastUpdated: string;
}
