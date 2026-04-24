import { describe, it, expect } from "vitest";
import {
  classifyGapToBand,
  computeGapPercentile,
  describeGap,
  findDivergenceJointCell,
  getDivergenceAnalysis,
  type DivergenceAnalysis,
} from "@/lib/divergence-analysis";

const fixture: DivergenceAnalysis = {
  generatedAt: "2026-04-24",
  dataRange: { from: "2016-10-28", to: "2026-04-23" },
  sampleSize: 2383,
  gapBands: [
    { label: "米国が大幅優位 (≤ -20)", min: -999, max: -20 },
    { label: "米国がやや優位 (-20〜-10)", min: -20, max: -10 },
    { label: "ほぼ同温 (-10〜+10)", min: -10, max: 10 },
    { label: "日本がやや優位 (+10〜+20)", min: 10, max: 20 },
    { label: "日本が大幅優位 (≥ +20)", min: 20, max: 999 },
  ],
  tempBands: ["極寒", "冷え込み", "平温", "過熱", "沸騰"],
  primary: { bands: [] },
  joint: {
    dataRange: { from: "2016-10-28", to: "2026-04-23" },
    sampleSize: 0,
    cells: [
      {
        gapBand: "日本が大幅優位 (≥ +20)",
        tempBand: "沸騰",
        occurrences: 42,
        returns: {
          "1m": { avgReturn: 1.2, medianReturn: 1.0, winRate: 60, sampleSize: 42 },
          "3m": { avgReturn: 5.3, medianReturn: 4.8, winRate: 65, sampleSize: 42 },
          "6m": { avgReturn: 8.1, medianReturn: 7.5, winRate: 70, sampleSize: 42 },
        },
      },
    ],
  },
  gapQuantiles: {
    p10: -45,
    p25: -31,
    p50: -13,
    p75: 6,
    p90: 22,
    latest: { date: "2026-04-23", gap: 22 },
  },
  latestContext: {
    date: "2026-04-23",
    jpScore: 91,
    usScore: 69,
    vix: 19.3,
    gap: 22,
    gapBand: "日本が大幅優位 (≥ +20)",
    jpTempBand: "沸騰",
  },
  note: "test fixture",
};

describe("classifyGapToBand", () => {
  it("負の極端な値は『米国が大幅優位』に入る", () => {
    expect(classifyGapToBand(fixture, -50)).toBe("米国が大幅優位 (≤ -20)");
    expect(classifyGapToBand(fixture, -20.1)).toBe("米国が大幅優位 (≤ -20)");
  });

  it("境界値 -20 は『米国がやや優位』に入る (min inclusive)", () => {
    expect(classifyGapToBand(fixture, -20)).toBe("米国がやや優位 (-20〜-10)");
  });

  it("0 は『ほぼ同温』に入る", () => {
    expect(classifyGapToBand(fixture, 0)).toBe("ほぼ同温 (-10〜+10)");
  });

  it("境界値 +10 は『日本がやや優位』に入る (min inclusive)", () => {
    expect(classifyGapToBand(fixture, 10)).toBe("日本がやや優位 (+10〜+20)");
  });

  it("正の極端な値は『日本が大幅優位』に入る", () => {
    expect(classifyGapToBand(fixture, 22)).toBe("日本が大幅優位 (≥ +20)");
    expect(classifyGapToBand(fixture, 50)).toBe("日本が大幅優位 (≥ +20)");
  });
});

describe("computeGapPercentile", () => {
  it("p10 = 10, p50 = 50, p90 = 90 percentile を返す", () => {
    expect(computeGapPercentile(fixture.gapQuantiles, -45)).toBe(10);
    expect(computeGapPercentile(fixture.gapQuantiles, -13)).toBe(50);
    expect(computeGapPercentile(fixture.gapQuantiles, 22)).toBe(90);
  });

  it("p10 を超えて低い値は 10% 未満", () => {
    expect(computeGapPercentile(fixture.gapQuantiles, -100)).toBeLessThan(10);
  });

  it("p90 を超えて高い値は 90% 超 (上限 99)", () => {
    const v = computeGapPercentile(fixture.gapQuantiles, 100);
    expect(v).toBeGreaterThan(90);
    expect(v).toBeLessThanOrEqual(99);
  });
});

describe("describeGap", () => {
  it("乖離値を 5 段階の日本語ラベルに変換する", () => {
    expect(describeGap(-25)).toBe("米国が大幅に熱い");
    expect(describeGap(-15)).toBe("米国がやや熱い");
    expect(describeGap(0)).toBe("ほぼ同温");
    expect(describeGap(15)).toBe("日本がやや熱い");
    expect(describeGap(25)).toBe("日本が大幅に熱い");
  });
});

describe("findDivergenceJointCell", () => {
  it("ヒットしたセルを返す", () => {
    const c = findDivergenceJointCell(
      fixture,
      "日本が大幅優位 (≥ +20)",
      "沸騰"
    );
    expect(c?.occurrences).toBe(42);
    expect(c?.returns["3m"].avgReturn).toBeCloseTo(5.3);
  });

  it("存在しない組合せは null を返す", () => {
    expect(
      findDivergenceJointCell(fixture, "日本が大幅優位 (≥ +20)", "極寒")
    ).toBeNull();
  });
});

describe("getDivergenceAnalysis", () => {
  it("実際の分析 JSON が必須フィールドを持っている", () => {
    const a = getDivergenceAnalysis();
    expect(a.gapBands.length).toBe(5);
    expect(a.tempBands.length).toBe(5);
    expect(a.primary.bands.length).toBe(5);
    expect(a.gapQuantiles.latest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(a.latestContext.gap).toBe(
      a.latestContext.jpScore - a.latestContext.usScore
    );
  });
});
