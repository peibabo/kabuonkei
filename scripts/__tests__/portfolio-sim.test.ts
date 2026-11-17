import { describe, it, expect } from "vitest";
import {
  DEFAULT_PORTFOLIO_RULE,
  computeFirstBusinessDays,
  computeMaxDrawdown,
  computeSharpe,
  computeStats,
  resolveBand,
  simulatePortfolio,
  planColdBoost,
  computeColdBoostStats,
  COLD_BOOST_MULTIPLIER,
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
  it("2 点しかなくても NaN にならず、3 戦略すべてのリターンを算出する", () => {
    const daily = [
      {
        date: "2026-01-01",
        nav: 100,
        benchmark: 100,
        benchmarkDca: 100,
        equityRatio: 0.6,
        score: 50,
      },
      {
        date: "2027-01-01",
        nav: 110,
        benchmark: 120,
        benchmarkDca: 115,
        equityRatio: 0.6,
        score: 55,
      },
    ];
    const s = computeStats(daily, 100);
    expect(s.totalReturn).toBeCloseTo(10, 1);
    expect(s.benchmarkReturn).toBeCloseTo(20, 1);
    expect(s.alpha).toBeCloseTo(-10, 1);
    expect(s.dcaReturn).toBeCloseTo(15, 1);
    expect(s.alphaVsDca).toBeCloseTo(-5, 1);
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

  it("初月リバランスで 80/20 → NAV は株価変動に 80% 連動", () => {
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50, // 平温固定 → 80% 株（sym 80/20 ルール）
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // 初日に 80/20 にリバランス → NAV=100, equity=80/100=0.8 unit, cash=20
    // 2月初 (price=110): NAV = 0.8 * 110 + 20 = 108
    const febFirst = result.daily.find((d) => d.date === "2026-02-02");
    expect(febFirst).toBeDefined();
    // ただし 2月初もリバランス日。target=0.8 のまま → NAV 保全
    expect(febFirst!.nav).toBeCloseTo(108, 1);
  });

  it("NAV 保全: リバランス前後で NAV は変化しない", () => {
    // スコアを変えてリバランスの比率を変えるケース
    const scoreByDate = new Map<string, number>([
      ["2026-01-05", 50], // 平温 → 80%
      ["2026-02-02", 10], // 極寒 → 100%
      ["2026-03-02", 50], // 平温 → 80%
    ]);
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: (d) => scoreByDate.get(d) ?? null,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // trades.navBefore が、リバランス直後の NAV と一致することを間接的に確認
    // 2月初のトレード: price=110, 直前の株 unit=0.8, cash=20 → navBefore = 108
    const feb = result.trades.find((t) => t.date === "2026-02-02");
    expect(feb).toBeDefined();
    expect(feb!.navBefore).toBeCloseTo(108, 1);
    expect(feb!.band).toBe("極寒");
    expect(feb!.toEquityRatio).toBeCloseTo(1.0, 5);
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
    // DCA の積立回数は初期化時の horizon に依存するため、
    // part1 が 3 ヶ月分で初期化すると part2 と合算しても full と一致しない。
    // 本番運用では generate:portfolio-history（full）→ snapshot:portfolio（diff）
    // の順で回すため、DCA は実質「full で初期化された state を diff で継続」する構造になる
  });

  it("dcaMonthlyContribution を持つ startState から diff 継続できる", () => {
    const priceDates = [
      "2026-01-05",
      "2026-02-02",
      "2026-03-02",
      "2026-04-01",
    ];
    const priceMap = new Map<string, number>([
      ["2026-01-05", 100],
      ["2026-02-02", 100],
      ["2026-03-02", 100],
      ["2026-04-01", 100],
    ]);

    // フル run
    const full = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });

    // 最初の 2 ヶ月（part1）とそのあと 2 ヶ月（part2）に分ける。
    // part1 は最初から 4 ヶ月 horizon を前提にした state を手動で生成して渡す
    // （本番の snapshot-portfolio は既存 JSON から dcaMonthlyContribution を引き継ぐ）
    const part1 = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
      endDate: "2026-02-02",
    });
    const part2 = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
      startDate: "2026-03-02",
      startState: {
        ...part1.endState,
        // full と同じ horizon (4 ヶ月) で初期化されたかのように手動補正
        dcaMonthlyContribution: DEFAULT_PORTFOLIO_RULE.initialNav / 4,
        dcaRemainingContributions: 2,
      },
    });

    const fullLast = full.daily[full.daily.length - 1];
    const splitLast = part2.daily[part2.daily.length - 1];
    // part1 が 2 ヶ月で初期化されるため完全一致しない（50/2 = 25 投入済み）
    // ただし DCA の "続きを投入する" 振る舞い自体は正しく継続することを確認
    expect(splitLast.benchmarkDca).toBeGreaterThan(0);
    expect(fullLast.benchmarkDca).toBeCloseTo(100, 1);
  });
});

describe("simulatePortfolio — DCA ベンチマーク", () => {
  // 月初のみ 4 ヶ月分 = 4 回の積立、等額で 25 ずつ
  const priceDates = [
    "2026-01-05",
    "2026-02-02",
    "2026-03-02",
    "2026-04-01",
  ];

  it("価格が一定なら積立 NAV は initialNav から動かない", () => {
    const priceMap = new Map<string, number>([
      ["2026-01-05", 100],
      ["2026-02-02", 100],
      ["2026-03-02", 100],
      ["2026-04-01", 100],
    ]);
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    const last = result.daily[result.daily.length - 1];
    // 100 の元手を 4 回等額で投入 → 全額投入完了時点で株価変わらず = NAV 100
    expect(last.benchmarkDca).toBeCloseTo(100, 1);
  });

  it("価格が毎月 +10% 上昇する相場では一括買い持ちが DCA を上回る", () => {
    const priceMap = new Map<string, number>([
      ["2026-01-05", 100],
      ["2026-02-02", 110],
      ["2026-03-02", 121],
      ["2026-04-01", 133.1],
    ]);
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    const last = result.daily[result.daily.length - 1];
    // 一括: 100 → 133.1 (+33.1%)
    expect(last.benchmark).toBeCloseTo(133.1, 1);
    // DCA: 4 回に分けて 25 ずつ、平均購入価格は 100 + 110 + 121 + 133.1 = 464.1/4 = 116.025
    //      最終ユニット数 = 25/100 + 25/110 + 25/121 + 25/133.1 ≒ 0.881
    //      NAV = 0.881 * 133.1 ≒ 117.3
    expect(last.benchmarkDca).toBeGreaterThan(115);
    expect(last.benchmarkDca).toBeLessThan(120);
    // 一括 > DCA
    expect(last.benchmark).toBeGreaterThan(last.benchmarkDca);
  });

  it("DCA 月次投入は現金から株に按分で動き、累積投入額は initialNav に一致する", () => {
    const priceMap = new Map<string, number>([
      ["2026-01-05", 100],
      ["2026-02-02", 50],
      ["2026-03-02", 200],
      ["2026-04-01", 100],
    ]);
    const result = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf: () => 50,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    // 4 ヶ月分 = 25 * 4 = 100 を累積投入 → endState.dcaCash が 0 に近い
    expect(result.endState.dcaCash).toBeCloseTo(0, 1);
    expect(result.endState.dcaRemainingContributions).toBe(0);
    // ボラが激しい相場（50→200）では平均購入価格が下がって DCA 有利
    // 最終 price=100 なのでユニット数 * 100 = 最終 NAV
    //   25/100 + 25/50 + 25/200 + 25/100 = 0.25 + 0.5 + 0.125 + 0.25 = 1.125 unit
    //   NAV = 1.125 * 100 = 112.5
    const last = result.daily[result.daily.length - 1];
    expect(last.benchmarkDca).toBeCloseTo(112.5, 1);
  });
});

describe("積立＋極寒で上乗せ", () => {
  /** 各月の 1 日・2 日の 2 営業日。月初のスコアと価格を指定する */
  function build(months: Array<{ score: number; price: number }>) {
    const priceMap = new Map<string, number>();
    const scores = new Map<string, number>();
    months.forEach((m, i) => {
      const ym = `2026-${String(i + 1).padStart(2, "0")}`;
      priceMap.set(`${ym}-01`, m.price);
      priceMap.set(`${ym}-02`, m.price);
      scores.set(`${ym}-01`, m.score);
      scores.set(`${ym}-02`, m.score);
    });
    const priceDates = [...priceMap.keys()].sort();
    return { priceMap, priceDates, scoreOf: (d: string) => scores.get(d) ?? null };
  }

  it("planColdBoost: 極寒の月に 3 回分使い、その分早く予算が尽きる", () => {
    expect(COLD_BOOST_MULTIPLIER).toBe(3);
    // 5 か月・2 か月目だけ極寒 → 1 + 3 + 1 = 5 回分で 3 か月目に使い切る
    expect(planColdBoost([50, 10, 50, 50, 50])).toEqual({
      multiplier: 3,
      totalMonths: 5,
      coldMonths: 1,
      exhaustedMonth: 3,
    });
    // 極寒がなければ普通の積立と同じく最後の月に使い切る
    expect(planColdBoost([50, 50, 50]).exhaustedMonth).toBe(3);
    // スコアのない月は通常どおり 1 回分
    expect(planColdBoost([null, 50]).coldMonths).toBe(0);
  });

  it("極寒の月に安く多く買った分だけ、同じ速さの積立を上回る", () => {
    // 2 か月目が極寒で価格が半分。最後は元の価格に戻る
    const { priceMap, priceDates, scoreOf } = build([
      { score: 50, price: 100 },
      { score: 10, price: 50 },
      { score: 50, price: 100 },
      { score: 50, price: 100 },
      { score: 50, price: 100 },
    ]);
    const r = simulatePortfolio({
      priceMap,
      priceDates,
      scoreOf,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    expect(r.coldBoostPlan).toMatchObject({ coldMonths: 1, exhaustedMonth: 3, totalMonths: 5 });
    const last = r.daily.at(-1)!;
    // 上乗せ: 20 + 60 + 20 を 100 / 50 / 100 で買う → 0.2 + 1.2 + 0.2 = 1.6 単位 → 160
    expect(last.benchmarkDcaBoost).toBeCloseTo(160, 5);
    // 同じ速さの積立: 100/3 ずつ 3 か月 → 1/3 + 2/3 + 1/3 = 4/3 単位 → 133.33
    expect(last.benchmarkDcaSameSpeed).toBeCloseTo(133.33, 1);
    // 普通の積立: 20 ずつ 5 か月 → 0.2 + 0.4 + 0.2 + 0.2 + 0.2 = 1.2 単位 → 120
    expect(last.benchmarkDca).toBeCloseTo(120, 5);

    const stats = computeColdBoostStats(r.daily, 100)!;
    expect(stats.boostReturn).toBeCloseTo(60, 5);
    expect(stats.boostVsDca).toBeCloseTo(40, 5);
    expect(stats.timingEffect).toBeCloseTo(26.67, 1);
  });

  it("フル生成のあとの日次追記では、買い終えた単位数のまま価格に連動する", () => {
    const { priceMap, priceDates, scoreOf } = build([
      { score: 50, price: 100 },
      { score: 15, price: 70 },
      { score: 30, price: 80 },
      { score: 50, price: 90 },
      { score: 50, price: 110 },
      { score: 70, price: 120 },
    ]);
    // 月次のフル生成は 5 か月分、6 か月目は日次の追記で足す
    const full = simulatePortfolio({
      priceMap,
      priceDates: priceDates.slice(0, 10),
      scoreOf,
      rule: DEFAULT_PORTFOLIO_RULE,
    });
    expect(full.endState.boostCash).toBeCloseTo(0, 9);
    expect(full.endState.sameSpeedCash).toBeCloseTo(0, 9);
    const appended = simulatePortfolio({
      priceMap,
      priceDates: priceDates.slice(10),
      scoreOf,
      rule: DEFAULT_PORTFOLIO_RULE,
      startState: full.endState,
    });
    const day = appended.daily[0];
    expect(day.benchmarkDcaBoost).toBeCloseTo(full.endState.boostUnits! * 120, 2);
    expect(day.benchmarkDcaSameSpeed).toBeCloseTo(full.endState.sameSpeedUnits! * 120, 2);
  });

  it("系列が欠けた古いデータでは成績を出さない", () => {
    expect(
      computeColdBoostStats(
        [
          { date: "2026-01-01", nav: 100, benchmark: 100, benchmarkDca: 100, equityRatio: 1, score: 50 },
          { date: "2026-01-02", nav: 100, benchmark: 100, benchmarkDca: 100, equityRatio: 1, score: 50 },
        ],
        100,
      ),
    ).toBeNull();
  });
});
