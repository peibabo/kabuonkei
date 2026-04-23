import { describe, it, expect } from "vitest";
import { aggregateJointReturns } from "../_lib/stats-aggregator";

describe("aggregateJointReturns", () => {
  // 1m (+30日) と 3m (+90日) の前方価格が見つかるよう日付を整える
  const priceDates = [
    "2026-01-01",
    "2026-01-02",
    "2026-02-01",
    "2026-02-02",
    "2026-04-01",
    "2026-04-02",
  ];
  const priceMap = new Map<string, number>([
    ["2026-01-01", 100],
    ["2026-01-02", 110],
    ["2026-02-01", 130],
    ["2026-02-02", 132],
    ["2026-04-01", 150],
    ["2026-04-02", 154],
  ]);

  it("band1 × band2 の組合せごとにセルを作る", () => {
    const buckets: Record<string, { band1: string; band2: string }> = {
      "2026-01-01": { band1: "low", band2: "cold" },
      "2026-01-02": { band1: "high", band2: "hot" },
    };
    const result = aggregateJointReturns<"1m" | "3m">({
      dates: ["2026-01-01", "2026-01-02"],
      bucketOf: (d) => buckets[d] ?? null,
      priceMap,
      priceDates,
      forwardDays: { "1m": 30, "3m": 90 },
    });
    expect(result.length).toBe(2);

    const lowCold = result.find((c) => c.band1 === "low" && c.band2 === "cold");
    expect(lowCold?.occurrences).toBe(1);
    // 2026-01-01(100) → 1m≒2026-02-01(130): +30%
    expect(lowCold?.returns["1m"]).toEqual([30]);
    // 2026-01-01(100) → 3m≒2026-04-01(150): +50%
    expect(lowCold?.returns["3m"]).toEqual([50]);

    const highHot = result.find((c) => c.band1 === "high" && c.band2 === "hot");
    expect(highHot?.occurrences).toBe(1);
    // 2026-01-02(110) → 1m=2026-02-01(130): (130-110)/110*100 ≈ 18.18 ... その直近取引日は 2026-02-01
    expect(highHot?.returns["1m"][0]).toBeCloseTo(18.18, 1);
  });

  it("bucketOf が null の日はスキップ", () => {
    const result = aggregateJointReturns<"1m">({
      dates: ["2026-01-01", "2026-01-02"],
      bucketOf: (d) =>
        d === "2026-01-01" ? { band1: "A", band2: "X" } : null,
      priceMap,
      priceDates,
      forwardDays: { "1m": 30 },
    });
    expect(result.length).toBe(1);
    expect(result[0].band1).toBe("A");
    expect(result[0].occurrences).toBe(1);
  });

  it("priceMap に基準日がなければスキップ", () => {
    const result = aggregateJointReturns<"1m">({
      dates: ["9999-12-31"],
      bucketOf: () => ({ band1: "A", band2: "X" }),
      priceMap,
      priceDates,
      forwardDays: { "1m": 30 },
    });
    expect(result.length).toBe(0);
  });

  it("同じセルに複数日が入ると occurrences が加算される", () => {
    const result = aggregateJointReturns<"1m">({
      dates: ["2026-01-01", "2026-01-02"],
      bucketOf: () => ({ band1: "A", band2: "X" }),
      priceMap,
      priceDates,
      forwardDays: { "1m": 30 },
    });
    expect(result.length).toBe(1);
    expect(result[0].occurrences).toBe(2);
    expect(result[0].returns["1m"].length).toBe(2);
  });

  it("将来価格が見つからなければ returns は空のまま、occurrences は残る", () => {
    const result = aggregateJointReturns<"1m" | "6m">({
      dates: ["2026-04-01"],
      bucketOf: () => ({ band1: "A", band2: "X" }),
      priceMap,
      priceDates,
      forwardDays: { "1m": 30, "6m": 180 },
    });
    expect(result.length).toBe(1);
    expect(result[0].occurrences).toBe(1);
    // 2026-04-01 から 1m (5/1) 先が priceDates に無い → 空
    expect(result[0].returns["1m"]).toEqual([]);
    expect(result[0].returns["6m"]).toEqual([]);
  });
});
