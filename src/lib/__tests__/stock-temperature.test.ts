import { describe, it, expect } from "vitest";
import {
  STOCK_MA_WINDOW,
  STOCK_SIGMA_WINDOW,
  computeStockTemperatureSeries,
  type TemperaturePoint,
} from "../stock-temperature/score";
import {
  buildRankings,
  computeChanges,
  computeRangeStats,
  countByLevel,
  groupBySector,
  historySpanDays,
  isoDaysAgo,
  rankOf,
  ranksWithTies,
  recentHistory,
  sortByScoreDesc,
  summarize,
  topPercent,
  type StockSummary,
} from "../stock-temperature/stats";
import { formatJaDate, formatScoreDiff } from "../stock-temperature/format";

function dates(n: number, start = "2024-01-01"): string[] {
  const d = new Date(`${start}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const x = new Date(d);
    x.setUTCDate(d.getUTCDate() + i);
    return x.toISOString().slice(0, 10);
  });
}

describe("computeStockTemperatureSeries", () => {
  const warmup = STOCK_MA_WINDOW + STOCK_SIGMA_WINDOW - 1;

  it("MA と σ が確定する日から出力する", () => {
    const ds = dates(warmup + 10);
    const closes = ds.map((date, i) => ({ date, close: 100 + Math.sin(i / 5) * 10 }));
    const series = computeStockTemperatureSeries(closes);
    expect(series).toHaveLength(11);
    expect(series[0][0]).toBe(ds[warmup - 1]);
  });

  it("履歴が足りなければ空", () => {
    const closes = dates(warmup - 1).map((date) => ({ date, close: 100 }));
    expect(computeStockTemperatureSeries(closes)).toEqual([]);
  });

  it("値動きゼロなら 50（平常）", () => {
    const closes = dates(warmup + 5).map((date) => ({ date, close: 100 }));
    const series = computeStockTemperatureSeries(closes);
    expect(series.every(([, s]) => s === 50)).toBe(true);
  });

  it("振れ幅で割るので、同じ形の値動きなら振幅が違っても同じ温度になる", () => {
    const ds = dates(warmup + 30);
    const wave = (amp: number) =>
      ds.map((date, i) => ({ date, close: 1000 * (1 + amp * Math.sin(i / 7)) }));
    const small = computeStockTemperatureSeries(wave(0.01));
    const large = computeStockTemperatureSeries(wave(0.05));
    const diff = small.map(([, s], i) => Math.abs(s - large[i][1]));
    expect(Math.max(...diff)).toBeLessThanOrEqual(2);
  });

  it("移動平均を大きく上回る急騰は 100 側に振れる", () => {
    const ds = dates(warmup + 1);
    const closes = ds.map((date, i) => ({
      date,
      close: i === ds.length - 1 ? 130 : 100 + Math.sin(i / 3),
    }));
    const series = computeStockTemperatureSeries(closes);
    expect(series[series.length - 1][1]).toBe(100);
  });
});

const H: TemperaturePoint[] = [
  ["2026-10-01", 40],
  ["2026-10-13", 50],
  ["2026-11-02", 60],
  ["2026-11-05", 70],
  ["2026-11-06", 80],
  ["2026-11-09", 75],
];

describe("computeChanges", () => {
  it("前営業日・7日前以前・30日前以前の直近値との差", () => {
    // 最新 11-09: 前日 80 / 11-02 以前の直近 60 / 10-10 以前の直近 40
    expect(computeChanges(H)).toEqual({ d1: -5, w1: 15, m1: 35 });
  });

  it("比較対象がなければ null", () => {
    expect(computeChanges([["2026-11-09", 50]])).toEqual({ d1: null, w1: null, m1: null });
    expect(computeChanges([])).toEqual({ d1: null, w1: null, m1: null });
  });
});

describe("recentHistory / computeRangeStats", () => {
  it("最新日から N 日以内に絞り、最高・最低・平均を出す", () => {
    const recent = recentHistory(H, 10);
    expect(recent.map(([d]) => d)).toEqual(["2026-11-02", "2026-11-05", "2026-11-06", "2026-11-09"]);
    expect(computeRangeStats(recent)).toEqual({
      max: ["2026-11-06", 80],
      min: ["2026-11-02", 60],
      avg: 71.3,
    });
    expect(computeRangeStats([])).toBeNull();
  });
});

describe("isoDaysAgo / historySpanDays", () => {
  it("月・年をまたいで日付を戻す", () => {
    expect(isoDaysAgo("2026-11-09", 7)).toBe("2026-11-02");
    expect(isoDaysAgo("2026-01-05", 30)).toBe("2025-12-06");
  });

  it("最初の日から最新日までの暦日数", () => {
    expect(historySpanDays(H)).toBe(39);
    expect(historySpanDays([])).toBe(0);
  });
});

describe("topPercent / countByLevel", () => {
  it("最新値以上だった日の割合（最低 1%）", () => {
    expect(topPercent(H)).toBe(33); // 75 以上は 80 と当日 75 の 2/6 日
    expect(topPercent([["2026-11-09", 10]])).toBe(100);
    expect(topPercent([])).toBeNull();
  });

  it("温度帯の境界（20/40/60/80 は下側の帯）", () => {
    const pts: TemperaturePoint[] = [0, 20, 21, 40, 60, 61, 80, 81, 100].map((s, i) => [
      `2026-01-${String(i + 1).padStart(2, "0")}`,
      s,
    ]);
    expect(countByLevel(pts)).toEqual({ 極寒: 2, 冷え込み: 2, 平温: 1, 過熱: 2, 沸騰: 2 });
  });
});

function s(code: string, score: number, d1: number | null, sector = "電気機器"): StockSummary {
  return { code, name: `銘柄${code}`, sector, score, d1 };
}

describe("ランキング系", () => {
  const list = [s("1001", 70, 5), s("1002", 90, -3), s("1003", 70, null, "銀行業"), s("1004", 10, 0, "銀行業")];

  it("温度の高い順、同点はコード順。順位は同点同順位", () => {
    const sorted = sortByScoreDesc(list);
    expect(sorted.map((x) => x.code)).toEqual(["1002", "1001", "1003", "1004"]);
    expect(rankOf(sorted, "1003")).toBe(2);
    expect(rankOf(sorted, "1004")).toBe(4);
    expect(rankOf(sorted, "9999")).toBeNull();
  });

  it("上昇・下落は d1 の符号で分け、0 と null は除く", () => {
    const r = buildRankings(list, 2, 2);
    expect(r.hottest.map((x) => x.code)).toEqual(["1002", "1001"]);
    expect(r.coldest.map((x) => x.code)).toEqual(["1004", "1003"]);
    expect(r.risers.map((x) => x.code)).toEqual(["1001"]);
    expect(r.fallers.map((x) => x.code)).toEqual(["1002"]);
  });

  it("ranksWithTies: 同じ値は同順位、次は件数ぶん飛ぶ", () => {
    const sorted = [s("1", 100, 3), s("2", 100, 3), s("3", 90, 1), s("4", 90, null), s("5", 10, null)];
    expect(ranksWithTies(sorted, (x) => x.score)).toEqual([1, 1, 3, 3, 5]);
    expect(ranksWithTies(sorted, (x) => x.d1)).toEqual([1, 1, 3, 4, 4]);
    // 銘柄ページの順位（rankOf）と一致する
    expect(sorted.map((x) => rankOf(sorted, x.code))).toEqual([1, 1, 3, 3, 5]);
  });

  it("summarize: 最新の温度と前営業日比", () => {
    expect(summarize("7203", { name: "トヨタ自動車", sector: "輸送用機器", history: H })).toEqual({
      code: "7203",
      name: "トヨタ自動車",
      sector: "輸送用機器",
      score: 75,
      d1: -5,
    });
    expect(summarize("7203", { name: "x", sector: "y", history: [] })).toBeNull();
  });

  it("業種ごとにまとめる", () => {
    const g = groupBySector(list);
    expect(g.map(([sector, items]) => [sector, items.map((x) => x.code)])).toEqual([
      ["銀行業", ["1003", "1004"]],
      ["電気機器", ["1001", "1002"]],
    ]);
  });
});

describe("format", () => {
  it("formatScoreDiff", () => {
    expect(formatScoreDiff(3)).toBe("+3");
    expect(formatScoreDiff(-2)).toBe("-2");
    expect(formatScoreDiff(0)).toBe("±0");
    expect(formatScoreDiff(null)).toBe("—");
  });

  it("formatJaDate", () => {
    expect(formatJaDate("2026-11-09")).toBe("2026年11月9日");
    expect(formatJaDate("2026-11-09", { year: false })).toBe("11月9日");
  });
});
