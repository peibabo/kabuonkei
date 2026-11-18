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
   * 前営業日の日本版温度スコア（`japan-temperature-history.json` の、現在値の立会日より前の最後の記録）。
   * トップ画面ヒーローの「昨日比」表示に使う。null なら直近観測なし。
   */
  previousJapanScore: number | null;
  /**
   * 現在の日本版温度レベル（極寒〜沸騰）の連続営業日数（当日含む）。
   * `japan-temperature-history.json` 由来。null なら不明（日本スコア欠損時）。
   * トップ画面ヒーローの「N日目」見出しに使う。
   */
  japanLevelStreak: number | null;
  /**
   * 日本版の直近 5 営業日の温度スコア（古い→新しい順、今の値の立会日は含まない）。
   * トップの「この 1 週間」タイル用。表示側で今の値を末尾に足す。空配列なら「—」。
   */
  japanSparkline: number[];
  /**
   * 米国版の直近 5 営業日の温度スコア（古い→新しい順、今の値の立会日は含まない）。
   * 静的な推移 + VIX チャートからの推定で作る（CNN の oneWeekAgo はフォールバック中は使えない）。
   */
  usSparkline: number[];
  volatility: VolatilityData[];
  indices: IndexData[];
  bonds: BondYieldData;
  forex: ForexData;
  commodities: CommodityData[];
  lastUpdated: string;
}
