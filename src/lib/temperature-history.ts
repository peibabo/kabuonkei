import type { ChartPoint } from "./types";
import staticData from "@/data/temperature-history.json";
import { estimateFearGreedFromVix } from "./fear-greed";

export { estimateFearGreedFromVix };

export interface TemperaturePoint {
  date: string; // "YYYY-MM-DD"
  score: number; // 0-100
  vix: number; // 元のVIX値
}

interface TemperatureHistoryData {
  generatedAt: string;
  dataRange: { from: string; to: string };
  daily: TemperaturePoint[];
}

/** 静的JSONの温度推移データを取得 */
export function getStaticTemperatureHistory(): TemperaturePoint[] {
  return (staticData as TemperatureHistoryData).daily;
}

/** VIXチャートデータ（ChartPoint[]）をTemperaturePoint[]に変換 */
export function convertVixChartToTemperature(
  vixChart: ChartPoint[]
): TemperaturePoint[] {
  return vixChart.map((p) => ({
    date: p.date,
    score: estimateFearGreedFromVix(p.value),
    vix: Math.round(p.value * 10) / 10,
  }));
}

/**
 * 静的データとランタイムVIXチャートデータをマージ。
 * 日付重複はランタイム側を優先。結果は日付昇順。
 */
export function mergeTemperatureData(
  staticPoints: TemperaturePoint[],
  runtimeVixChart: ChartPoint[]
): TemperaturePoint[] {
  const runtimePoints = convertVixChartToTemperature(runtimeVixChart);

  // ランタイムデータの日付セット
  const runtimeDates = new Set(runtimePoints.map((p) => p.date));

  // 静的データからランタイムと重複しない分を取得
  const merged = staticPoints.filter((p) => !runtimeDates.has(p.date));

  // ランタイムデータを追加
  merged.push(...runtimePoints);

  // 日付昇順ソート
  merged.sort((a, b) => a.date.localeCompare(b.date));

  return merged;
}
