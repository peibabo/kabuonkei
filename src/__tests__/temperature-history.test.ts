import { describe, it, expect } from "vitest";
import {
  estimateFearGreedFromVix,
  convertVixChartToTemperature,
  mergeTemperatureData,
} from "@/lib/temperature-history";
import type { TemperaturePoint } from "@/lib/temperature-history";
import type { ChartPoint } from "@/lib/types";

describe("estimateFearGreedFromVix", () => {
  it("VIX=10で100を返す", () => {
    expect(estimateFearGreedFromVix(10)).toBe(100);
  });

  it("VIX=40で0を返す", () => {
    expect(estimateFearGreedFromVix(40)).toBe(0);
  });

  it("VIX=25で50を返す", () => {
    expect(estimateFearGreedFromVix(25)).toBe(50);
  });

  it("VIX<10でも100を超えない", () => {
    expect(estimateFearGreedFromVix(5)).toBe(100);
  });

  it("VIX>40でも0未満にならない", () => {
    expect(estimateFearGreedFromVix(50)).toBe(0);
  });
});

describe("convertVixChartToTemperature", () => {
  it("ChartPoint配列をTemperaturePoint配列に変換する", () => {
    const input: ChartPoint[] = [
      { date: "2026-04-01", value: 20 },
      { date: "2026-04-02", value: 30 },
    ];
    const result = convertVixChartToTemperature(input);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      date: "2026-04-01",
      score: 67,
      vix: 20,
    });
    expect(result[1]).toEqual({
      date: "2026-04-02",
      score: 33,
      vix: 30,
    });
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(convertVixChartToTemperature([])).toEqual([]);
  });
});

describe("mergeTemperatureData", () => {
  const staticData: TemperaturePoint[] = [
    { date: "2026-03-01", score: 70, vix: 19 },
    { date: "2026-03-02", score: 65, vix: 20.5 },
    { date: "2026-04-01", score: 60, vix: 22 },
  ];

  const runtimeVixChart: ChartPoint[] = [
    { date: "2026-04-01", value: 23 }, // 静的データと重複
    { date: "2026-04-02", value: 25 },
  ];

  it("日付重複はランタイム側を優先する", () => {
    const result = mergeTemperatureData(staticData, runtimeVixChart);
    const apr01 = result.find((p) => p.date === "2026-04-01");
    expect(apr01?.vix).toBe(23); // ランタイムの値
    expect(apr01?.score).toBe(estimateFearGreedFromVix(23));
  });

  it("結果は日付昇順でソートされる", () => {
    const result = mergeTemperatureData(staticData, runtimeVixChart);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it("静的+ランタイムの全日付を含む（重複除く）", () => {
    const result = mergeTemperatureData(staticData, runtimeVixChart);
    // 3/1, 3/2, 4/1(重複→1つ), 4/2 = 4件
    expect(result).toHaveLength(4);
  });

  it("静的データのみの場合も正しく動作する", () => {
    const result = mergeTemperatureData(staticData, []);
    expect(result).toHaveLength(3);
    expect(result).toEqual(staticData);
  });

  it("ランタイムデータのみの場合も正しく動作する", () => {
    const result = mergeTemperatureData([], runtimeVixChart);
    expect(result).toHaveLength(2);
  });

  it("両方空の場合は空配列を返す", () => {
    const result = mergeTemperatureData([], []);
    expect(result).toEqual([]);
  });
});

// estimateFearGreedFromVixのインポートをテスト内でも使う
function estimateFearGreedFromVixLocal(vix: number): number {
  const score = Math.round(100 - ((vix - 10) / 30) * 100);
  return Math.max(0, Math.min(100, score));
}
