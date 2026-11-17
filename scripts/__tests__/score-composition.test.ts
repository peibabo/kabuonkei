// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  AD_WINDOW,
  MA_LONG,
  advanceDeclineRatio,
  buildElementRows,
  candidateScore,
  countAdvancesDeclines,
  forwardReturn,
  maxDrawdownAfter,
  summarizeReturns,
  walkStates,
  type ElementRow,
} from "../_lib/score-composition";

/** 2024-01-01 から n 日分の連続した日付（休日は考えない） */
function days(n: number): string[] {
  const start = new Date("2024-01-01T00:00:00Z");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

describe("countAdvancesDeclines", () => {
  it("前日と当日の両方に終値がある銘柄だけ数え、変わらずは除く", () => {
    const dates = ["2024-01-04", "2024-01-05"];
    const stocks = [
      new Map([["2024-01-04", 100], ["2024-01-05", 110]]), // 値上がり
      new Map([["2024-01-04", 100], ["2024-01-05", 90]]), // 値下がり
      new Map([["2024-01-04", 100], ["2024-01-05", 100]]), // 変わらず
      new Map([["2024-01-05", 100]]), // 前日なし（上場前）
    ];
    expect(countAdvancesDeclines(dates, stocks)).toEqual([
      { adv: 0, dec: 0, total: 0 },
      { adv: 1, dec: 1, total: 3 },
    ]);
  });
});

describe("advanceDeclineRatio", () => {
  const flat = (adv: number, dec: number, n: number) =>
    Array.from({ length: n }, () => ({ adv, dec, total: adv + dec }));

  it("窓の合計どうしの比 × 100", () => {
    const ratios = advanceDeclineRatio(flat(120, 100, 30), AD_WINDOW, 100);
    expect(ratios[AD_WINDOW - 1]).toBeNull();
    expect(ratios[AD_WINDOW]).toBeCloseTo(120, 5);
  });

  it("窓の中に銘柄数が足りない日があれば null", () => {
    const counts = flat(120, 100, 30);
    counts[20] = { adv: 10, dec: 10, total: 20 };
    expect(advanceDeclineRatio(counts, AD_WINDOW, 100)[29]).toBeNull();
  });
});

describe("buildElementRows", () => {
  const n = MA_LONG + 30;
  const dates = days(n);

  it("横ばいなら C1・C5・25日乖離は 50、騰落レシオは値動きがないので欠損", () => {
    const rows = buildElementRows({
      nikkei: new Map(dates.map((d) => [d, 30000])),
      usdJpy: new Map(dates.map((d) => [d, 150])),
      stocks: [],
    });
    expect(rows).toHaveLength(n - MA_LONG);
    expect(rows.at(-1)!.elements).toEqual({ c1: 50, c5: 50, ad: null, ma25: 50 });
  });

  it("最終日だけ 15% 下げると C1 と 25日乖離は 0（当日は平均に含めない）", () => {
    const rows = buildElementRows({
      nikkei: new Map(dates.map((d, i) => [d, i === n - 1 ? 25500 : 30000])),
      usdJpy: new Map(dates.map((d) => [d, 150])),
      stocks: [],
    });
    const last = rows.at(-1)!;
    expect(last.ret).toBeCloseTo(-15, 5);
    expect(last.elements.c1).toBe(0);
    expect(last.elements.ma25).toBe(0);
  });

  it("ドル円が欠けている日は C5 が null", () => {
    const rows = buildElementRows({
      nikkei: new Map(dates.map((d) => [d, 30000])),
      usdJpy: new Map(dates.slice(0, n - 1).map((d) => [d, 150])),
      stocks: [],
    });
    expect(rows.at(-1)!.elements.c5).toBeNull();
    expect(rows.at(-2)!.elements.c5).toBe(50);
  });
});

describe("candidateScore", () => {
  const row = {
    elements: { c1: 10, c5: 40, ad: null, ma25: 20 },
  } as ElementRow;

  it("利用可能な要素だけで平均する", () => {
    expect(candidateScore(row, { id: "a", label: "a", elements: ["c1", "c5"] })).toBe(25);
    expect(candidateScore(row, { id: "b", label: "b", elements: ["c1", "ad"] })).toBe(10);
  });

  it("全要素が欠損なら null", () => {
    expect(candidateScore(row, { id: "c", label: "c", elements: ["ad"] })).toBeNull();
  });
});

describe("walkStates", () => {
  it("平温 → 極寒に入った日だけ通知し、ヒステリシス内（<25）では再通知しない", () => {
    const walk = walkStates([50, 20, 24, 18, 30, 19]);
    expect(walk.coldFires).toEqual([1, 5]);
    expect(walk.states).toEqual(["neutral", "cold", "cold", "cold", "neutral", "cold"]);
  });

  it("過熱側も同様。スコア欠損日は直前の状態を引き継ぐ", () => {
    const walk = walkStates([50, 80, null, 76, 70, 85]);
    expect(walk.hotFires).toEqual([1, 5]);
    expect(walk.states[2]).toBe("hot");
  });
});

describe("forwardReturn / maxDrawdownAfter", () => {
  const dates = days(60);
  const closes = dates.map((_, i) => 100 + i);

  it("カレンダー日数後の最初の取引日までのリターン", () => {
    expect(forwardReturn(dates, closes, 0, 30)).toBeCloseTo(30, 5);
  });

  it("データの終わりを超える場合は null", () => {
    expect(forwardReturn(dates, closes, 40, 30)).toBeNull();
  });

  it("目標日から 7 日以内に取引日がなければ null", () => {
    const sparse = [...dates.slice(0, 10), ...dates.slice(50)];
    const sparseCloses = sparse.map(() => 100);
    expect(forwardReturn(sparse, sparseCloses, 0, 30)).toBeNull();
  });

  it("期間内の最安値までの下落率（下がらなければ 0）", () => {
    expect(maxDrawdownAfter(dates, closes, 0, 30)).toBe(0);
    const dip = [100, 95, 80, 90, 120];
    expect(maxDrawdownAfter(dates.slice(0, 5), dip, 0, 30)).toBeCloseTo(-20, 5);
  });
});

describe("summarizeReturns", () => {
  it("null を除いて平均・中央値・勝率を出す", () => {
    expect(summarizeReturns([10, -2, null, 4])).toEqual({
      n: 3,
      avg: 4,
      median: 4,
      winRate: (2 / 3) * 100,
    });
  });

  it("空なら n=0", () => {
    expect(summarizeReturns([null]).n).toBe(0);
  });
});
