// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  SCORE_BANDS,
  bandOf,
  buildSupplyDays,
  episodeStarts,
  returnStats,
  spearman,
  type FlowHistoryWeek,
  type MarginHistoryWeek,
  type SupplyDay,
} from "../_lib/supply-temperature-analysis";

/** 2024-01-01（月）から平日だけ n 日。終値は close(i) */
function buildNikkei(n: number, close: (i: number) => number): Map<string, number> {
  const map = new Map<string, number>();
  const d = new Date("2024-01-01T00:00:00Z");
  let i = 0;
  while (map.size < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) {
      map.set(d.toISOString().slice(0, 10), close(i));
      i++;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return map;
}

/** 2024-01-05（金）から n 週分の金曜日 */
function fridays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date("2024-01-05T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

describe("buildSupplyDays", () => {
  const nikkei = buildNikkei(400, (i) => 30000 + i * 10);
  const margin: MarginHistoryWeek[] = fridays(70).map((date, i) => ({
    date,
    buyBalance: i < 40 ? 40000 : 34000, // 40 週目から 15% 減
  }));
  const flow: FlowHistoryWeek[] = fridays(70).map((endDate) => ({
    startDate: endDate,
    endDate,
    foreign: -5000, // 4 週で -2 兆円 → 0
  }));
  const days = buildSupplyDays(nikkei, margin, flow);

  it("C1 は先頭 125 日より後から", () => {
    expect(days.length).toBe(400 - 125);
    expect(days[0].date).toBe([...nikkei.keys()][125]);
  });

  it("需給は両方そろったときだけ平均を持つ", () => {
    const d = days.find((x) => x.flowScore != null && x.marginScore != null)!;
    expect(d.supplyScore).toBe(Math.round((d.flowScore! + d.marginScore!) / 2));
    expect(d.flowScore).toBe(0);
    expect(d.flow4w).toBe(-20000);
  });

  it("買残の減少は公表日（週末の 3 営業日後＝翌週水曜）の翌営業日から使う", () => {
    const dropWeek = margin[40].date; // 金曜
    // 水曜 15 時の公表は大引け後なので、翌日の木曜から
    const thu = new Date(`${dropWeek}T00:00:00Z`);
    thu.setUTCDate(thu.getUTCDate() + 6);
    const thuStr = thu.toISOString().slice(0, 10);
    const before = days.filter((d) => d.date < thuStr && d.date > dropWeek);
    expect(before.length).toBe(3);
    const on = days.find((d) => d.date === thuStr)!;
    expect(before.every((d) => d.marginChange4w === 0)).toBe(true);
    expect(on.marginChange4w).toBeCloseTo(-15, 5);
    expect(on.marginScore).toBe(0);
  });

  it("前方リターンは営業日ベースで、未経過なら null", () => {
    const keys = [...nikkei.keys()];
    const first = days[0];
    const i = keys.indexOf(first.date);
    expect(first.forward["1m"]).toBeCloseTo(
      (nikkei.get(keys[i + 21])! / nikkei.get(first.date)! - 1) * 100,
      10,
    );
    expect(days.at(-1)!.forward["1m"]).toBeNull();
  });

  it("4 週の窓が長く欠けていれば計算しない", () => {
    const gappy = flow.filter((_, i) => i !== 30 && i !== 31);
    const res = buildSupplyDays(nikkei, margin, gappy);
    expect(res.some((d) => d.flowScore == null && d.date > flow[33].endDate && d.date < flow[34].endDate)).toBe(
      true,
    );
  });
});

describe("bandOf / returnStats / spearman", () => {
  it("帯の境界", () => {
    expect(bandOf(20, SCORE_BANDS).key).toBe("≤20");
    expect(bandOf(21, SCORE_BANDS).key).toBe("21-40");
    expect(bandOf(100, SCORE_BANDS).key).toBe("≥81");
  });

  it("平均と上昇割合", () => {
    expect(returnStats([2, -1, 5])).toEqual({ n: 3, avg: 2, winRate: (2 / 3) * 100 });
    expect(returnStats([])).toEqual({ n: 0, avg: null, winRate: null });
  });

  it("単調なら ±1、同値ばかりなら null", () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1, 10);
    expect(spearman([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull();
  });
});

describe("episodeStarts", () => {
  const mk = (flags: boolean[]): SupplyDay[] =>
    flags.map((f, i) => ({
      date: `d${String(i).padStart(3, "0")}`,
      nikkei: 1,
      c1: f ? 10 : 50,
      flow4w: null,
      flowScore: null,
      marginChange4w: null,
      marginScore: null,
      supplyScore: null,
      forward: { "1m": null, "3m": null, "6m": null },
    }));

  it("20 営業日以内の該当日は同じ回にまとめる", () => {
    const flags = Array.from({ length: 60 }, (_, i) => i === 0 || i === 15 || i === 36 || i === 57);
    const starts = episodeStarts(mk(flags), (d) => d.c1 <= 20);
    // 0 と 15 は同じ回、36 は 15 から 21 日空いて別の回、57 は 36 から 21 日で別の回
    expect(starts.map((d) => d.date)).toEqual(["d000", "d036", "d057"]);
  });
});
