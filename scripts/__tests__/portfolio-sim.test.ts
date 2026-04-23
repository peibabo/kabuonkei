import { describe, it, expect } from "vitest";
import {
  DEFAULT_PORTFOLIO_RULE,
  computeFirstBusinessDays,
  computeMaxDrawdown,
  computeSharpe,
  computeStats,
  resolveBand,
  simulatePortfolio,
} from "../_lib/portfolio-sim";

describe("resolveBand", () => {
  it("スコアから正しい温度帯に分類する", () => {
    const bands = DEFAULT_PORTFOLIO_RULE.bands;
    expect(resolveBand(0, bands).level).toBe("極寒");
    expect(resolveBand(20, bands).level).toBe("極寒");
    expect(resolveBand(21, bands).level).toBe("冷え込み");
    expect(resolveBand(50, bands).level).toBe("平温");
    expect(resolveBand(80, bands).level).toBe("過熱");
    expect(resolveBand(81, bands).level).toBe("沸騰");
    expect(resolveBand(100, bands).level).toBe("沸騰");
  });
});

describe("computeFirstBusinessDays", () => {
  it("月ごとに最初の営業日を抽出", () => {
    const dates = [
      "2026-01-05",
      "2026-01-06",
      "2026-01-07",
      "2026-02-02",
      "2026-02-03",
      "2026-03-02",
    ];
    const firsts = computeFirstBusinessDays(dates);
    expect([...firsts].sort()).toEqual([
      "2026-01-05",
      "2026-02-02",
      "2026-03-02",
    ]);
  });
});

describe("computeMaxDrawdown", () => {
  it("一貫して上昇する系列は 0", () => {
    expect(computeMaxDrawdown([100, 110, 120])).toBe(0);
  });
  it("ピークから -20% のドローダウンを検出", () => {
    expect(computeMaxDrawdown([100, 120, 96])).toBeCloseTo(-20, 5);
  });
});

describe("computeSharpe", () => {
  it("ゼロ分散なら 0 を返す", () => {
    expect(computeSharpe([0.01, 0.01, 0.01])).toBe(0);
  });
  it("正の平均リターンでは正の Sharpe", () => {
    const s = computeSharpe([0.01, 0.02, 0.015, 0.012, 0.018]);
    expect(s).toBeGreaterThan(0);
  });
});

describe("computeStats", () => {
  it("2 点しかなくても NaN にならず、リターンを算出する", () => {
    const daily = [
      { date: "2026-01-01", nav: 100, benchmark: 100, equityRatio: 0.6, score: 50 },
      { date: "2027-01-01", nav: 110, benchmark: 120, equityRatio: 0.6, score: 55 },
    ];
    const s = computeStats(daily, 100);
    expect(s.totalReturn).toBeCloseTo(10, 1);
    expect(s.benchmarkReturn).toBeCloseTo(20, 1);
    expect(s.alpha).toBeCloseTo(-10, 1);
    expect(s.cagr).toBeGreaterThan(9);
    expect(s.cagr).toBeLessThan(11);
  });
});

describe("simulatePortfolio — 基礎", () => {
  // 月初のみを並べたシンプルな日付列
  const priceDates = [
    "2026-01-05",
    "2026-01-06",
    "2026-02-02",
    "2026-03-02",
    "2026-04-01",
  ];
  const priceMap = new Map<string, number>([
    ["2026-01-05", 100],
    ["2026-01-06", 100],
    ["2026-02-02", 110],
    ["2026-03-02", 120],
    ["2026-04-01", 130],
  ]);

  it("初月リバランスで 60/40 → NAV は株価変動に 60% 連動", () => {
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50, // 平温固定 → 60% 株
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // 初日に 60/40 にリバランス → NAV=100, equity=60/100=0.6 unit, cash=40
    // 2月初 (price=110): NAV = 0.6 * 110 + 40 = 106
    const febFirst = result.daily.find((d) => d.date === "2026-02-02");
    expect(febFirst).toBeDefined();
    // ただし 2月初もリバランス日。target=0.6 のまま → NAV 保全
    expect(febFirst!.nav).toBeCloseTo(106, 1);
  });

  it("NAV 保全: リバランス前後で NAV は変化しない", () => {
    // スコアを変えてリバランスの比率を変えるケース
    const scoreByDate = new Map<string, number>([
      ["2026-01-05", 50], // 平温 → 60%
      ["2026-02-02", 10], // 極寒 → 90%
      ["2026-03-02", 50], // 平温 → 60%
    ]);
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: (d) => scoreByDate.get(d) ?? null,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // trades.navBefore が、リバランス直後の NAV と一致することを間接的に確認
    // 2月初のトレード: price=110, 直前の株 unit=0.6, cash=40 → navBefore = 106
    const feb = result.trades.find((t) => t.date === "2026-02-02");
    expect(feb).toBeDefined();
    expect(feb!.navBefore).toBeCloseTo(106, 1);
    expect(feb!.band).toBe("極寒");
    expect(feb!.toEquityRatio).toBeCloseTo(0.9, 5);
  });

  it("リバランスは月初のみで発火する", () => {
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // 月初以外の 2026-01-06 にはリバランスが起きない
    const midJanTrade = result.trades.find((t) => t.date === "2026-01-06");
    expect(midJanTrade).toBeUndefined();
  });

  it("ベンチマークは初日に全額株を買い、それを保有し続ける", () => {
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // 初日 price=100 で 100 NAV → 1 unit → 4月初 price=130 で NAV=130
    const last = result.daily[result.daily.length - 1];
    expect(last.benchmark).toBeCloseTo(130, 1);
  });
});

describe("simulatePortfolio — 差分モード", () => {
  it("バックフィル全実行と 2 回に分けた実行で最終 NAV が一致", () => {
    const priceDates = [
      "2026-01-05",
      "2026-02-02",
      "2026-03-02",
      "2026-04-01",
      "2026-05-01",
    ];
    const priceMap = new Map<string, number>([
      ["2026-01-05", 100],
      ["2026-02-02", 110],
      ["2026-03-02", 95],
      ["2026-04-01", 120],
      ["2026-05-01", 130],
    ]);
    const scoreByDate = new Map<string, number>([
      ["2026-01-05", 50],
      ["2026-02-02", 10],
      ["2026-03-02", 85],
      ["2026-04-01", 50],
      ["2026-05-01", 50],
    ]);

    const full = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: (d) => scoreByDate.get(d) ?? null,
      rule: DEFAULT_PORTFOLIO_RULE,
    });

    // 前半
    const part1 = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: (d) => scoreByDate.get(d) ?? null,
      rule: DEFAULT_PORTFOLIO_RULE,
      startDate: "2026-01-05",
      endDate: "2026-03-02",
    });
    // 後半（part1 の endState から継続）
    const part2 = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: (d) => scoreByDate.get(d) ?? null,
      rule: DEFAULT_PORTFOLIO_RULE,
      startDate: "2026-04-01",
      startState: part1.endState,
    });

    const fullLast = full.daily[full.daily.length - 1];
    const splitLast = part2.daily[part2.daily.length - 1];
    expect(splitLast.nav).toBeCloseTo(fullLast.nav, 1);
    expect(splitLast.benchmark).toBeCloseTo(fullLast.benchmark, 1);
  });
});
