import { describe, it, expect } from "vitest";
import {
  computeSqWeekGroups,
  realizedVolSeries,
  sqDateOfMonth,
  usdJpyMomentumOnNikkeiDates,
  computeLearnExtraStats,
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
