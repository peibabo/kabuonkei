import { describe, it, expect } from "vitest";
import { findPriceOnOrAfter, computeEventReturns } from "../generate-similar-days";

describe("findPriceOnOrAfter", () => {
  const priceMap = new Map<string, number>([
    ["2020-01-02", 100],
    ["2020-01-03", 101],
    ["2020-01-06", 102],
    ["2020-01-07", 103],
  ]);
  const sortedDates = [...priceMap.keys()].sort();

  it("returns exact match when target date exists", () => {
    expect(findPriceOnOrAfter(priceMap, sortedDates, "2020-01-06")).toEqual({
      date: "2020-01-06",
      price: 102,
    });
  });

  it("jumps to next trading day when target falls on weekend", () => {
    // 2020-01-04 (土), 2020-01-05 (日) → 2020-01-06 にジャンプ
    expect(findPriceOnOrAfter(priceMap, sortedDates, "2020-01-04")).toEqual({
      date: "2020-01-06",
      price: 102,
    });
  });

  it("returns null when target is after all available dates", () => {
    expect(findPriceOnOrAfter(priceMap, sortedDates, "2020-02-01")).toBeNull();
  });

  it("returns first date when target is before all available dates", () => {
    expect(findPriceOnOrAfter(priceMap, sortedDates, "2019-12-01")).toEqual({
      date: "2020-01-02",
      price: 100,
    });
  });
});

describe("computeEventReturns", () => {
  // シンプルな合成データ: 100 → +10% (30日) → +30% (90日) → +50% (180日) → +100% (365日)
  function buildMap(): {
    priceMap: Map<string, number>;
    sortedDates: string[];
  } {
    const priceMap = new Map<string, number>();
    const base = new Date("2020-01-01");
    // 400 日分のデータ。0日目 100、30日目 110、90日目 130、180日目 150、365日目 200
    for (let i = 0; i <= 400; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      let price = 100;
      if (i >= 365) price = 200;
      else if (i >= 180) price = 150;
      else if (i >= 90) price = 130;
      else if (i >= 30) price = 110;
      priceMap.set(iso, price);
    }
    const sortedDates = [...priceMap.keys()].sort();
    return { priceMap, sortedDates };
  }

  it("computes all 4 returns when data is sufficient", () => {
    const { priceMap, sortedDates } = buildMap();
    const r = computeEventReturns(priceMap, sortedDates, "2020-01-01");
    expect(r.return1m).toBe(10);
    expect(r.return3m).toBe(30);
    expect(r.return6m).toBe(50);
    expect(r.return1y).toBe(100);
  });

  it("returns null for all when event is after all data", () => {
    const { priceMap, sortedDates } = buildMap();
    const r = computeEventReturns(priceMap, sortedDates, "2099-01-01");
    expect(r).toEqual({
      return1m: null,
      return3m: null,
      return6m: null,
      return1y: null,
    });
  });

  it("returns null for forward returns when data is too short", () => {
    // 60日分しかないデータ: 1M は取れるが 3M/6M/1Y は null
    const priceMap = new Map<string, number>();
    const base = new Date("2020-01-01");
    for (let i = 0; i <= 60; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      priceMap.set(d.toISOString().split("T")[0], 100 + i);
    }
    const sortedDates = [...priceMap.keys()].sort();
    const r = computeEventReturns(priceMap, sortedDates, "2020-01-01");
    expect(r.return1m).not.toBeNull();
    // findForwardPrice は 30 日先にヒット
    expect(r.return3m).toBeNull();
    expect(r.return6m).toBeNull();
    expect(r.return1y).toBeNull();
  });
});
