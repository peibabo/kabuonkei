import { describe, it, expect } from "vitest";
import {
  mergeJapanTemperatureData,
  sliceByDays,
  type JapanTempPoint,
} from "@/lib/japan-temperature-history";

const simplePoints: JapanTempPoint[] = [
  { date: "2026-03-01", score: 40, method: "simple2", c1: 40, c5: 40 },
  { date: "2026-03-02", score: 45, method: "simple2", c1: 50, c5: 40 },
  { date: "2026-04-01", score: 55, method: "simple2", c1: 60, c5: 50 },
];

const fullPoints: JapanTempPoint[] = [
  {
    date: "2026-04-01",
    score: 60,
    method: "full5",
    level: "平温",
    availableCount: 5,
    components: {
      nikkeiMa: 65,
      foreignFlow: 55,
      marginRatio: 60,
      arbitrage: 60,
      usdJpyMomentum: 60,
    },
  },
  {
    date: "2026-04-02",
    score: 62,
    method: "full5",
    level: "過熱",
    availableCount: 5,
    components: {
      nikkeiMa: 65,
      foreignFlow: 55,
      marginRatio: 60,
      arbitrage: 70,
      usdJpyMomentum: 60,
    },
  },
];

describe("mergeJapanTemperatureData", () => {
  it("簡易版とフル版を別系列として結合する", () => {
    const result = mergeJapanTemperatureData(simplePoints, fullPoints);
    // 3 simple + 2 full = 5件
    expect(result).toHaveLength(5);
    expect(result.filter((p) => p.method === "simple2")).toHaveLength(3);
    expect(result.filter((p) => p.method === "full5")).toHaveLength(2);
  });

  it("同日に両方ある場合も両方残る（別系列扱い）", () => {
    const result = mergeJapanTemperatureData(simplePoints, fullPoints);
    const apr01Entries = result.filter((p) => p.date === "2026-04-01");
    expect(apr01Entries).toHaveLength(2);
    expect(apr01Entries.some((p) => p.method === "simple2" && p.score === 55)).toBe(true);
    expect(apr01Entries.some((p) => p.method === "full5" && p.score === 60)).toBe(true);
  });

  it("結果は日付昇順でソートされる", () => {
    const result = mergeJapanTemperatureData(simplePoints, fullPoints);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].date >= result[i - 1].date).toBe(true);
    }
  });

  it("同日ではフル版が後ろ（描画で上に重なる）", () => {
    const result = mergeJapanTemperatureData(simplePoints, fullPoints);
    const apr01Idx = result.findIndex(
      (p) => p.date === "2026-04-01" && p.method === "simple2"
    );
    const apr01FullIdx = result.findIndex(
      (p) => p.date === "2026-04-01" && p.method === "full5"
    );
    expect(apr01FullIdx).toBeGreaterThan(apr01Idx);
  });

  it("片方が空でも動作する", () => {
    expect(mergeJapanTemperatureData(simplePoints, [])).toHaveLength(3);
    expect(mergeJapanTemperatureData([], fullPoints)).toHaveLength(2);
    expect(mergeJapanTemperatureData([], [])).toEqual([]);
  });
});

describe("sliceByDays", () => {
  const points: JapanTempPoint[] = [
    { date: "2026-01-01", score: 40, method: "simple2" },
    { date: "2026-02-01", score: 45, method: "simple2" },
    { date: "2026-03-01", score: 50, method: "simple2" },
    { date: "2026-04-01", score: 55, method: "simple2" },
  ];

  it("末尾から指定日数分を切り出す", () => {
    // 末尾は2026-04-01、60日前は2026-01-31 → 2/1以降の3件
    const result = sliceByDays(points, 60);
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-01");
  });

  it("全期間より長い日数を指定すれば全件返る", () => {
    expect(sliceByDays(points, 10000)).toHaveLength(4);
  });

  it("空配列を渡せば空配列を返す", () => {
    expect(sliceByDays([], 30)).toEqual([]);
  });
});
