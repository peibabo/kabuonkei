import { describe, it, expect } from "vitest";
import { aggregateLevelReturns } from "../_lib/stats-aggregator";

describe("aggregateLevelReturns", () => {
  const priceDates = [
    "2026-01-01",
    "2026-01-02",
    "2026-02-01",
    "2026-04-01",
    "2026-07-01",
  ];
  const priceMap = new Map<string, number>([
    ["2026-01-01", 100],
    ["2026-01-02", 110],
    ["2026-02-01", 120],
    ["2026-04-01", 130],
    ["2026-07-01", 140],
  ]);

  it("スコアに応じて温度帯別に集計する", () => {
    const result = aggregateLevelReturns<"1m" | "3m">({
      dates: ["2026-01-01", "2026-01-02"],
      scoreOf: (d) => (d === "2026-01-01" ? 10 : 90),
      priceMap,
      priceDates,
      forwardDays: { "1m": 30, "3m": 90 },
    });

    expect(result["極寒"].occurrences).toBe(1);
    expect(result["沸騰"].occurrences).toBe(1);
    expect(result["平温"].occurrences).toBe(0);
    // 2026-01-01 → 1m 後 ≒ 2026-02-01 = 120, return (120-100)/100*100 = 20%
    expect(result["極寒"].returns["1m"]).toEqual([20]);
    // 2026-01-01 → 3m 後 ≒ 2026-04-01 = 130, return 30%
    expect(result["極寒"].returns["3m"]).toEqual([30]);
  });

  it("scoreOf が null を返す日はスキップ", () => {
    const result = aggregateLevelReturns<"1m">({
      dates: ["2026-01-01", "2026-01-02"],
      scoreOf: (d) => (d === "2026-01-01" ? 50 : null),
      priceMap,
      priceDates,
      forwardDays: { "1m": 30 },
    });
    const totalOccurrences = Object.values(result).reduce(
      (s, r) => s + r.occurrences,
      0,
    );
    expect(totalOccurrences).toBe(1);
    expect(result["平温"].occurrences).toBe(1);
  });

  it("priceMap に基準日がなければスキップ", () => {
    const result = aggregateLevelReturns<"1m">({
      dates: ["2026-01-01", "9999-12-31"],
      scoreOf: () => 50,
      priceMap,
      priceDates,
      forwardDays: { "1m": 30 },
    });
    expect(result["平温"].occurrences).toBe(1);
  });

  it("将来価格が見つからなければ returns に追加しない（occurrences は残る）", () => {
    const result = aggregateLevelReturns<"1m" | "6m">({
      dates: ["2026-07-01"],
      scoreOf: () => 50,
      priceMap,
      priceDates,
      forwardDays: { "1m": 30, "6m": 180 },
    });
    expect(result["平温"].occurrences).toBe(1);
    // 1m 先は 2026-07-31 が priceDates にないため null → 空配列
    expect(result["平温"].returns["1m"]).toEqual([]);
    expect(result["平温"].returns["6m"]).toEqual([]);
  });

  it("初期状態では全温度帯が occurrences=0 / returns が各 key で空配列", () => {
    const result = aggregateLevelReturns<"1m" | "3m">({
      dates: [],
      scoreOf: () => 50,
      priceMap,
      priceDates,
      forwardDays: { "1m": 30, "3m": 90 },
    });
    for (const level of ["極寒", "冷え込み", "平温", "過熱", "沸騰"] as const) {
      expect(result[level].occurrences).toBe(0);
      expect(result[level].returns["1m"]).toEqual([]);
      expect(result[level].returns["3m"]).toEqual([]);
    }
  });
});
