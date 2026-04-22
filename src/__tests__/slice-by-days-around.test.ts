import { describe, it, expect } from "vitest";
import { sliceByDaysAround } from "@/lib/japan-temperature-history";
import type { JapanTempPoint } from "@/lib/japan-temperature-history";

function p(date: string, score = 50): JapanTempPoint {
  return { date, score, method: "simple2" };
}

describe("sliceByDaysAround", () => {
  const history: JapanTempPoint[] = [
    p("2024-05-01"),
    p("2024-06-01"),
    p("2024-07-01"),
    p("2024-08-01"),
    p("2024-08-05"), // center
    p("2024-09-01"),
    p("2024-10-01"),
    p("2024-11-01"),
  ];

  it("returns points within ±N days of center", () => {
    // center 2024-08-05, ±30 日 → 2024-07-06 〜 2024-09-04
    // history からは 2024-08-01, 2024-08-05, 2024-09-01 の3件がヒット
    const result = sliceByDaysAround(history, "2024-08-05", 30);
    expect(result.map((r) => r.date)).toEqual([
      "2024-08-01",
      "2024-08-05",
      "2024-09-01",
    ]);
  });

  it("returns wider range at 90 days", () => {
    const result = sliceByDaysAround(history, "2024-08-05", 90);
    const dates = result.map((r) => r.date);
    // ±90 days: 2024-05-07 〜 2024-11-03
    expect(dates).toEqual([
      "2024-06-01",
      "2024-07-01",
      "2024-08-01",
      "2024-08-05",
      "2024-09-01",
      "2024-10-01",
      "2024-11-01",
    ]);
  });

  it("returns post-only range when center is before history starts", () => {
    const result = sliceByDaysAround(history, "2024-04-01", 60);
    // 2024-02-01 〜 2024-05-31
    expect(result.map((r) => r.date)).toEqual(["2024-05-01"]);
  });

  it("returns pre-only range when center is after history ends", () => {
    const result = sliceByDaysAround(history, "2024-12-15", 60);
    // 2024-10-16 〜 2025-02-13
    expect(result.map((r) => r.date)).toEqual(["2024-11-01"]);
  });

  it("returns empty when range does not intersect history", () => {
    const result = sliceByDaysAround(history, "2020-01-01", 10);
    expect(result).toEqual([]);
  });

  it("returns empty on empty input", () => {
    expect(sliceByDaysAround([], "2024-08-05", 30)).toEqual([]);
  });

  it("includes only center when days=0 and center is present", () => {
    const result = sliceByDaysAround(history, "2024-08-05", 0);
    expect(result.map((r) => r.date)).toEqual(["2024-08-05"]);
  });
});
