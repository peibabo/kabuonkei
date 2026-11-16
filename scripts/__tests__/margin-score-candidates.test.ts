// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  RANGE_WEEKS,
  computeCandidateRows,
  quantile,
  rangePosition,
  rowAvailableOn,
  totalWithMarginScore,
  withAvailability,
  type MarginWeek,
} from "../_lib/margin-score-candidates";
import type { SnapshotEntry } from "../_lib/snapshot-merge";

/** 金曜始まりで n 週分。買残・売残は関数で与える */
function buildWeeks(
  n: number,
  buy: (i: number) => number,
  sell: (i: number) => number,
): MarginWeek[] {
  const start = new Date("2024-01-05T00:00:00Z");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i * 7);
    const buyBalance = buy(i);
    const sellBalance = sell(i);
    return {
      date: d.toISOString().slice(0, 10),
      buyBalance,
      sellBalance,
      ratio: Math.round((buyBalance / sellBalance) * 100) / 100,
    };
  });
}

describe("rangePosition", () => {
  it("最小で 0、最大で 100、中間は線形", () => {
    expect(rangePosition(2, [2, 4, 6])).toBe(0);
    expect(rangePosition(6, [2, 4, 6])).toBe(100);
    expect(rangePosition(3, [2, 4, 6])).toBe(25);
  });

  it("幅がなければ 50", () => {
    expect(rangePosition(5, [5, 5, 5])).toBe(50);
  });
});

describe("quantile", () => {
  it("並び順に依存せず分位点を返す", () => {
    const v = [5, 1, 4, 2, 3];
    expect(quantile(v, 0)).toBe(1);
    expect(quantile(v, 0.5)).toBe(3);
    expect(quantile(v, 1)).toBe(5);
  });
});

describe("computeCandidateRows", () => {
  it("52 週レンジが取れる週から始まる", () => {
    const weeks = buildWeeks(60, () => 30000, () => 10000);
    const rows = computeCandidateRows(weeks);
    expect(rows).toHaveLength(60 - RANGE_WEEKS + 1);
    expect(rows[0].date).toBe(weeks[RANGE_WEEKS - 1].date);
  });

  it("横ばいなら変化系・レンジ系はすべて 50、旧定義は水準で決まる", () => {
    // 倍率 6.0 → 旧定義は (6-2)/(10-2) = 50
    const rows = computeCandidateRows(buildWeeks(53, () => 60000, () => 10000));
    expect(rows.at(-1)!.scores).toEqual({
      old: 50,
      ratioRange: 50,
      ratioWow: 50,
      buyRange: 50,
      buyChange4w: 50,
    });
  });

  it("買残が 4 週で 15% 減ると D は 0、買残は 52 週の最安値で C も 0", () => {
    const weeks = buildWeeks(
      56,
      (i) => (i < 52 ? 60000 : 60000 * (1 - 0.0375 * (i - 51))),
      () => 10000,
    );
    const last = computeCandidateRows(weeks).at(-1)!;
    expect(last.buyChange4wPct).toBeCloseTo(-15, 5);
    expect(last.scores.buyChange4w).toBe(0);
    expect(last.scores.buyRange).toBe(0);
  });

  it("売残の買い戻しで倍率が上がる週は、倍率系（A・B）が過熱側、買残系（C・D）は動かない", () => {
    // 急落初週の典型: 買残は横ばい、売残だけ 20% 減る
    const weeks = buildWeeks(
      53,
      () => 60000,
      (i) => (i === 52 ? 8000 : 10000),
    );
    const last = computeCandidateRows(weeks).at(-1)!;
    expect(last.scores.ratioRange).toBe(100);
    expect(last.scores.ratioWow).toBe(100);
    expect(last.scores.buyRange).toBe(50);
    expect(last.scores.buyChange4w).toBe(50);
  });

  it("先読みしない（後ろに週を足しても過去の行は変わらない）", () => {
    const base = buildWeeks(56, (i) => 50000 + i * 100, () => 10000);
    const extended = [
      ...base,
      ...buildWeeks(60, () => 10000, () => 10000).slice(56),
    ];
    const before = computeCandidateRows(base);
    const after = computeCandidateRows(extended);
    expect(after.slice(0, before.length)).toEqual(before);
  });
});

describe("rowAvailableOn", () => {
  /** 2026-10-26〜11-13 の営業日（11/3 は祝日） */
  const TRADING_DAYS = [
    "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30",
    "2026-11-02", "2026-11-04", "2026-11-05", "2026-11-06",
    "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13",
  ];
  const row = (date: string) => ({
    date,
    ratio: 9,
    ratioWowPct: 0,
    buyChange4wPct: 0,
    scores: { old: 0, ratioRange: 0, ratioWow: 0, buyRange: 0, buyChange4w: 0 },
  });
  const rows = withAvailability(
    [row("2026-10-23"), row("2026-10-30"), row("2026-11-06")],
    TRADING_DAYS,
  );

  it("急落当日（11/6）に反映済みなのは 1 週前（10/30 週）の値", () => {
    expect(rowAvailableOn("2026-11-06", rows)?.date).toBe("2026-10-30");
  });

  it("11/6 週の値は翌週水曜（11/11）から反映される", () => {
    expect(rowAvailableOn("2026-11-10", rows)?.date).toBe("2026-10-30");
    expect(rowAvailableOn("2026-11-11", rows)?.date).toBe("2026-11-06");
  });

  it("祝日を挟むと公表が 1 営業日遅れる（10/30 週は 11/5 から）", () => {
    expect(rowAvailableOn("2026-11-04", rows)?.date).toBe("2026-10-23");
    expect(rowAvailableOn("2026-11-05", rows)?.date).toBe("2026-10-30");
  });

  it("反映済みの週がなければ null", () => {
    expect(rowAvailableOn("2026-10-26", rows)).toBeNull();
  });
});

describe("totalWithMarginScore", () => {
  // 2026-11-06 の記録値
  const entry: SnapshotEntry = {
    date: "2026-11-06",
    score: 65,
    level: "過熱",
    availableCount: 5,
    components: {
      nikkeiMa: 7,
      foreignFlow: 100,
      marginRatio: 100,
      arbitrage: 79,
      usdJpyMomentum: 38,
    },
  };

  it("記録済みの C3 を渡すと記録済みの総合スコアになる", () => {
    expect(totalWithMarginScore(entry, 100)).toBe(65);
  });

  it("C3 を 0 にしても 45 までしか下がらない", () => {
    expect(totalWithMarginScore(entry, 0)).toBe(45);
  });
});
