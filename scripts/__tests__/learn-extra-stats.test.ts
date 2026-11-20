import { describe, it, expect } from "vitest";
import {
  computeSqWeekGroups,
  realizedVolSeries,
  sqDateOfMonth,
  usdJpyMomentumOnNikkeiDates,
  computeLearnExtraStats,
  computeInvestorFlowStats,
  LEARN_HORIZONS,
} from "../_lib/learn-extra-stats";

/** start から平日だけを n 日並べた終値（値は closeAt(i)） */
function weekdays(start: string, n: number, closeAt: (i: number) => number) {
  const out: Array<{ date: string; close: number }> = [];
  const d = new Date(`${start}T00:00:00Z`);
  while (out.length < n) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push({ date: d.toISOString().slice(0, 10), close: closeAt(out.length) });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

describe("realizedVolSeries", () => {
  it("最初の window 日は null、一定の上昇率なら 0", () => {
    const closes = weekdays("2024-01-01", 30, (i) => 100 * 1.01 ** i);
    const vol = realizedVolSeries(closes, 20);
    expect(vol.slice(0, 20).every((v) => v === null)).toBe(true);
    expect(vol[20]).toBeCloseTo(0, 6);
  });

  it("上下 1% を交互に繰り返すと年率でおよそ 16%", () => {
    const closes = weekdays("2024-01-01", 30, (i) => (i % 2 === 0 ? 100 : 101));
    const vol = realizedVolSeries(closes, 20)[25]!;
    // 日次の対数リターン ±0.995% → 標準偏差 ≒1.02% × √250 ≒ 16
    expect(vol).toBeGreaterThan(15);
    expect(vol).toBeLessThan(17);
  });
});

describe("sqDateOfMonth", () => {
  it("第 2 金曜が営業日ならその日", () => {
    const dates = weekdays("2026-11-01", 25, () => 1).map((c) => c.date);
    expect(sqDateOfMonth("2026-11", dates)).toBe("2026-11-13");
  });

  it("第 2 金曜が休場なら直前の営業日に繰り上がる", () => {
    const dates = weekdays("2026-11-01", 25, () => 1)
      .map((c) => c.date)
      .filter((d) => d !== "2026-11-13");
    expect(sqDateOfMonth("2026-11", dates)).toBe("2026-11-12");
  });

  it("第 2 金曜がデータの最終日より後なら、まだ来ていないので null", () => {
    const dates = weekdays("2026-12-01", 8, () => 1).map((c) => c.date); // 12/1〜12/10
    expect(dates[dates.length - 1]).toBe("2026-12-10");
    expect(sqDateOfMonth("2026-12", dates)).toBeNull();
  });
});

describe("computeSqWeekGroups", () => {
  it("3 月の SQ 週はメジャー、それ以外の SQ 週・SQ のない週に分け、最後の週は数えない", () => {
    // 2026-02-23（月）から 6 週。3/13 が第 2 金曜。毎週 +1% ずつ上げる
    const closes = weekdays("2026-02-23", 30, (i) => 100 * 1.01 ** Math.floor(i / 5));
    const groups = computeSqWeekGroups(closes);
    const major = groups.find((g) => g.label === "メジャー SQ の週")!;
    const none = groups.find((g) => g.label === "SQ のない週")!;
    expect(major.weeks).toBe(1);
    expect(major.avgReturn).toBeCloseTo(1, 1);
    // 6 週のうち、前の週が必要な最初の週と、終わっていないかもしれない最後の週を除く 4 週
    expect(none.weeks).toBe(3);
    expect(groups.reduce((s, g) => s + g.weeks, 0)).toBe(4);
  });

  it("from より前に終わる週は数えない", () => {
    const closes = weekdays("2026-02-23", 30, (i) => 100 + i);
    const groups = computeSqWeekGroups(closes, "2026-03-16");
    expect(groups.reduce((s, g) => s + g.weeks, 0)).toBe(2);
  });
});

describe("usdJpyMomentumOnNikkeiDates", () => {
  it("日経225 の日付より前のドル円だけを使い、5 日より古ければ null", () => {
    const usd = weekdays("2024-01-01", 60, (i) => 100 + i);
    const nikkei = [
      { date: usd[55].date, close: 1 },
      { date: "2024-12-31", close: 1 },
    ];
    const m = usdJpyMomentumOnNikkeiDates(nikkei, usd, 50);
    // 同じ日付（index 55）ではなく前の日（index 54）の変化率
    expect(m[0]).toBeCloseTo((154 / 104 - 1) * 100, 6);
    expect(m[1]).toBeNull();
  });
});

describe("computeLearnExtraStats", () => {
  it("帯ごとの日数の合計は、計算できた日数と一致し、from より前は数えない", () => {
    const n = 400;
    const nikkei = new Map(weekdays("2020-01-01", n, (i) => 100 + 10 * Math.sin(i / 7)).map((c) => [c.date, c.close]));
    const usd = new Map(weekdays("2020-01-01", n, (i) => 100 + 5 * Math.cos(i / 11)).map((c) => [c.date, c.close]));
    const from = [...nikkei.keys()][100];
    const stats = computeLearnExtraStats(nikkei, usd, { from, generatedAt: "2026-11-19" });
    expect(stats.dataRange.from).toBe(from);
    expect(stats.baseline.occurrences).toBe(n - 100);
    const volTotal = stats.realizedVol.bands.reduce((s, b) => s + b.occurrences, 0);
    const momTotal = stats.usdJpyMomentum.bands.reduce((s, b) => s + b.occurrences, 0);
    expect(stats.sqWeeks.groups.reduce((s, g) => s + g.weeks, 0)).toBeGreaterThan(0);
    expect(volTotal).toBe(n - 100);
    expect(momTotal).toBe(n - 100);
  });
});

/** 月曜 start から n 週ぶんの投資部門別（foreignAt(k) / individualAt(k) 億円） */
function flowWeeks(
  start: string,
  n: number,
  foreignAt: (k: number) => number,
  individualAt: (k: number) => number = (k) => -foreignAt(k)
) {
  return Array.from({ length: n }, (_, k) => {
    const s = new Date(`${start}T00:00:00Z`);
    s.setUTCDate(s.getUTCDate() + 7 * k);
    const e = new Date(s);
    e.setUTCDate(e.getUTCDate() + 4);
    return {
      startDate: s.toISOString().slice(0, 10),
      endDate: e.toISOString().slice(0, 10),
      foreign: foreignAt(k),
      individual: individualAt(k),
    };
  });
}

describe("computeInvestorFlowStats", () => {
  // 2026-01-05（月）から毎日 +0.1% 上がる日経225
  const nikkei = weekdays("2026-01-05", 120, (i) => 100 * 1.001 ** i);

  it("4 週累計で帯に分け、その後の日経225 は週の最終日の 7 日後（公表翌日）の終値から数える", () => {
    const weeks = flowWeeks("2026-01-05", 10, () => 3000); // 4 週累計 12,000 億円
    const stats = computeInvestorFlowStats(weeks, nikkei);
    const big = stats.bands.find((b) => b.band === "1 兆円以上の買い越し")!;
    // 累計が計算できるのは 4 週目から（7 週）。すべて公表翌日の日経225 がある
    expect(big.occurrences).toBe(7);
    expect(big.episodes).toBe(1);
    expect(stats.baseline.occurrences).toBe(7);
    // 4 週目は 1/26〜1/30 → 2/6（金）の終値から。2/6 は 25 営業日目（index 24）
    // 毎日 +0.1% なので、1M は LEARN_HORIZONS["1m"] 営業日ぶんの上昇
    expect(big.returns["1m"].avgReturn).toBeCloseTo((1.001 ** LEARN_HORIZONS["1m"] - 1) * 100, 1);
    expect(stats.latest).toEqual({ endDate: weeks[9].endDate, foreign4w: 12000 });
  });

  it("翌週に休場があると公表（第 4 営業日）がずれ、その次の営業日から数える", () => {
    // 2/2（月）を休場にする。4 週目（1/26〜1/30）は 2/3 から数えて第 4 営業日 = 2/6（金）に公表 → 2/9（月）から
    const holiday = nikkei.filter((c) => c.date !== "2026-02-02");
    const weeks = flowWeeks("2026-01-05", 4, () => 3000);
    const withHoliday = computeInvestorFlowStats(weeks, holiday);
    const i = holiday.findIndex((c) => c.date === "2026-02-09");
    const h = LEARN_HORIZONS["1m"];
    expect(withHoliday.bands[3].returns["1m"].avgReturn).toBeCloseTo(
      (holiday[i + h].close / holiday[i].close - 1) * 100,
      1
    );
    expect(withHoliday.baseline.occurrences).toBe(1);
  });

  it("週が抜けているところをまたいで累計せず、またいだ帯は別の回として数える", () => {
    const weeks = flowWeeks("2026-01-05", 12, () => 3000).filter((_, k) => k !== 5);
    const stats = computeInvestorFlowStats(weeks, nikkei);
    const big = stats.bands.find((b) => b.band === "1 兆円以上の買い越し")!;
    // 抜けの前: 週 3,4 の 2 回分。抜けの後: 週 9,10,11（6,7,8 は抜けをまたぐ）
    expect(big.occurrences).toBe(5);
    expect(big.episodes).toBe(2);
    // 抜けの前は 4 週目（k=3）、後は k=9 の週から
    expect(big.episodeStarts).toEqual([weeks[3].endDate, weeks[8].endDate]);
  });

  it("売買の向きと日経225 の向きの一致率、海外投資家と個人が逆向きの割合", () => {
    // 海外は交互に買い越し / 売り越し。株価は毎日上がる → 同じ週の一致は半分。
    // 最初の週にも「前の週の終値」があるよう、日経225 より 1 週あとから始める
    const weeks = flowWeeks(
      "2026-01-12",
      10,
      (k) => (k % 2 === 0 ? 1000 : -1000),
      (k) => (k < 5 ? -1 : 1) * (k % 2 === 0 ? 1000 : -1000)
    );
    const stats = computeInvestorFlowStats(weeks, nikkei);
    expect(stats.sameWeek.weeks).toBe(10);
    expect(stats.sameWeek.matchRate).toBe(50);
    expect(stats.afterPublish.matchRate).toBe(50);
    expect(stats.foreignVsIndividual).toEqual({ weeks: 10, oppositeRate: 50 });
  });

  it("公表翌日の日経225 がまだない最後の週は、その後の成績に数えない", () => {
    const short = nikkei.slice(0, 45); // 3/6 まで
    const weeks = flowWeeks("2026-01-05", 9, () => 3000); // 最終週 3/2〜3/6 → 3/13 はまだない
    const stats = computeInvestorFlowStats(weeks, short);
    // 累計が計算できる 4 週目（k=3）以降のうち、公表翌日（3/6 まで）がある k=3〜7 の 5 週
    expect(stats.baseline.occurrences).toBe(5);
  });
});
