import { describe, it, expect } from "vitest";
import { createMemoCache } from "../market-data/cache";
import { buildMarketData, formatJstTimestamp } from "../market-data/compose";
import type {
  BondYieldData,
  CommodityData,
  FearGreedData,
  ForexData,
  IndexData,
  JapanFearGreedData,
  VolatilityData,
} from "../types";

describe("createMemoCache", () => {
  it("set した値を TTL 内は返す", () => {
    let clock = 0;
    const cache = createMemoCache<string>(1000, () => clock);
    cache.set("hello");
    expect(cache.get()).toBe("hello");
    clock = 999;
    expect(cache.get()).toBe("hello");
  });

  it("TTL 超過後は null を返す", () => {
    let clock = 0;
    const cache = createMemoCache<string>(1000, () => clock);
    cache.set("hello");
    clock = 1000; // ちょうど TTL
    expect(cache.get()).toBeNull();
    clock = 1500;
    expect(cache.get()).toBeNull();
  });

  it("未設定状態では null", () => {
    const cache = createMemoCache<string>(1000);
    expect(cache.get()).toBeNull();
  });

  it("invalidate で即座に null に戻る", () => {
    let clock = 0;
    const cache = createMemoCache<number>(1000, () => clock);
    cache.set(42);
    expect(cache.get()).toBe(42);
    cache.invalidate();
    expect(cache.get()).toBeNull();
  });

  it("set 再実行で TTL 基準が更新される", () => {
    let clock = 0;
    const cache = createMemoCache<number>(1000, () => clock);
    cache.set(1);
    clock = 900;
    cache.set(2);
    clock = 1500; // 初期 set からは 1500 経過だが、2回目 set からは 600
    expect(cache.get()).toBe(2);
  });
});

describe("formatJstTimestamp", () => {
  it("UTC 2026-04-20T01:00:00Z を JST 10:00:00 表記にする", () => {
    const utcMs = Date.UTC(2026, 3, 20, 1, 0, 0);
    expect(formatJstTimestamp(utcMs)).toBe("2026-04-20 10:00:00 JST");
  });

  it("UTC 23:00 が JST 翌日 08:00 になる", () => {
    const utcMs = Date.UTC(2026, 3, 19, 23, 0, 0);
    expect(formatJstTimestamp(utcMs)).toBe("2026-04-20 08:00:00 JST");
  });
});

describe("buildMarketData", () => {
  const stubFearGreed: FearGreedData = {
    score: 50,
    rating: "Neutral",
    previousClose: 50,
    oneWeekAgo: 48,
    oneMonthAgo: 45,
    oneYearAgo: 40,
    timestamp: "2026-04-20T00:00:00Z",
  };

  const stubVolatility: VolatilityData[] = [
    {
      symbol: "^VIX",
      name: "VIX",
      price: 18,
      change: 0,
      chart: [],
      marketTime: null,
    },
  ];
  const stubIndices: IndexData[] = [];
  const stubBonds: BondYieldData = {
    name: "US10Y",
    yield: 4.2,
    change: 0,
    chart: [],
    marketTime: null,
  };
  const stubForex: ForexData = {
    pair: "USDJPY",
    name: "USD/JPY",
    rate: 150,
    change: 0,
    changePercent: 0,
    marketTime: null,
  };
  const stubCommodities: CommodityData[] = [];

  it("入力をそのまま詰め替え、lastUpdated を JST 文字列に整形する", () => {
    const utcMs = Date.UTC(2026, 3, 20, 1, 0, 0); // JST 10:00
    const result = buildMarketData({
      fearGreed: stubFearGreed,
      japanFearGreed: null,
      volatility: stubVolatility,
      indices: stubIndices,
      bonds: stubBonds,
      forex: stubForex,
      commodities: stubCommodities,
      now: utcMs,
    });
    expect(result.fearGreed).toBe(stubFearGreed);
    expect(result.japanFearGreed).toBeNull();
    expect(result.volatility).toBe(stubVolatility);
    expect(result.indices).toBe(stubIndices);
    expect(result.bonds).toBe(stubBonds);
    expect(result.forex).toBe(stubForex);
    expect(result.commodities).toBe(stubCommodities);
    expect(result.lastUpdated).toBe("2026-04-20 10:00:00 JST");
  });

  it("japanFearGreed が与えられればそのまま保持する", () => {
    const jfg: JapanFearGreedData = {
      score: 55,
      level: "平温",
      components: [],
      availableCount: 5,
      generatedAt: "2026-04-20T00:00:00Z",
    };
    const result = buildMarketData({
      fearGreed: stubFearGreed,
      japanFearGreed: jfg,
      volatility: stubVolatility,
      indices: stubIndices,
      bonds: stubBonds,
      forex: stubForex,
      commodities: stubCommodities,
      now: 0,
    });
    expect(result.japanFearGreed).toBe(jfg);
  });
});
