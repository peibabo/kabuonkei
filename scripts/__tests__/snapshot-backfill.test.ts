// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  INVESTOR_PUBLISH_LAG,
  MARGIN_PUBLISH_LAG,
  availableFrom,
  firstRefreshDayOnOrAfter,
  nthBusinessDayAfter,
  recomputeEntry,
  weeksAvailableOn,
} from "../_lib/snapshot-backfill";
import type { SnapshotEntry } from "../_lib/snapshot-merge";

/** 2026-09-14〜10-09 の営業日（9/21〜23 は連休） */
const TRADING_DAYS = [
  "2026-09-14", "2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18",
  "2026-09-24", "2026-09-25",
  "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02",
  "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09",
];

describe("nthBusinessDayAfter", () => {
  it("counts trading days and skips holidays", () => {
    expect(nthBusinessDayAfter("2026-09-11", 3, TRADING_DAYS)).toBe("2026-09-16");
    expect(nthBusinessDayAfter("2026-09-18", 3, TRADING_DAYS)).toBe("2026-09-28");
  });

  it("returns null when the calendar does not reach that far", () => {
    expect(nthBusinessDayAfter("2026-10-08", 2, TRADING_DAYS)).toBeNull();
  });
});

describe("firstRefreshDayOnOrAfter", () => {
  it("keeps Wednesday and Thursday, and moves other days forward to Wednesday", () => {
    expect(firstRefreshDayOnOrAfter("2026-09-16")).toBe("2026-09-16"); // 水
    expect(firstRefreshDayOnOrAfter("2026-09-17")).toBe("2026-09-17"); // 木
    expect(firstRefreshDayOnOrAfter("2026-09-18")).toBe("2026-09-23"); // 金 → 翌週水（祝日でも可）
    expect(firstRefreshDayOnOrAfter("2026-09-28")).toBe("2026-09-30"); // 月 → 水
  });
});

describe("availableFrom", () => {
  it("reflects margin data on Wednesday and investor data on Thursday in a normal week", () => {
    expect(availableFrom("2026-09-11", MARGIN_PUBLISH_LAG, TRADING_DAYS)).toBe("2026-09-16");
    expect(availableFrom("2026-09-11", INVESTOR_PUBLISH_LAG, TRADING_DAYS)).toBe("2026-09-17");
  });

  it("delays to the next refresh day when holidays push the publication back", () => {
    // 9/18 週末分: 3 営業日後は 9/28（月）→ 反映は 9/30（水）
    expect(availableFrom("2026-09-18", MARGIN_PUBLISH_LAG, TRADING_DAYS)).toBe("2026-09-30");
    // 4 営業日後は 9/29（火）→ 反映は 9/30（水）
    expect(availableFrom("2026-09-18", INVESTOR_PUBLISH_LAG, TRADING_DAYS)).toBe("2026-09-30");
  });
});

describe("weeksAvailableOn", () => {
  const weeks = [
    { endDate: "2026-09-25", value: 3 },
    { endDate: "2026-09-11", value: 1 },
    { endDate: "2026-09-18", value: 2 },
  ];

  it("returns only the weeks already reflected, in ascending order", () => {
    expect(
      weeksAvailableOn("2026-09-29", weeks, MARGIN_PUBLISH_LAG, TRADING_DAYS).map((w) => w.value)
    ).toEqual([1]);
    expect(
      weeksAvailableOn("2026-09-30", weeks, MARGIN_PUBLISH_LAG, TRADING_DAYS).map((w) => w.value)
    ).toEqual([1, 2, 3]);
  });
});

describe("recomputeEntry", () => {
  const entry: SnapshotEntry = {
    date: "2026-10-07",
    score: 60,
    level: "平温",
    availableCount: 3,
    components: {
      nikkeiMa: 77,
      foreignFlow: 50,
      marginRatio: 50,
      arbitrage: 81,
      usdJpyMomentum: 18,
    },
  };
  const foreignFlowWeeks = [
    { endDate: "2026-08-28", value: 99999 }, // 5 週前なので使われない
    { endDate: "2026-09-04", value: 6000 },
    { endDate: "2026-09-11", value: -2000 },
    { endDate: "2026-09-18", value: 1000 },
    { endDate: "2026-09-25", value: 3000 },
    { endDate: "2026-10-02", value: 99999 }, // 10/8（木）から反映なので使われない
  ];
  const marginRatioWeeks = [
    { endDate: "2026-09-25", value: 6.0 },
    { endDate: "2026-10-02", value: 8.0 }, // 10/7（水）から反映
  ];
  const calendar = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04",
    "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11", ...TRADING_DAYS];

  it("recomputes C2/C3 from data published by that date and keeps C1/C4/C5", () => {
    const next = recomputeEntry(entry, {
      foreignFlowWeeks,
      marginRatioWeeks,
      tradingDays: calendar,
    });
    // C2: 直近 4 週 = 6000 - 2000 + 1000 + 3000 = 8000 億円 → (8000+20000)/40000 = 70
    // C3: 8.0 倍 → (8-2)/(10-2) = 75
    expect(next).toEqual({
      date: "2026-10-07",
      score: 64, // (77 + 70 + 75 + 81 + 18) / 5 = 64.2
      level: "過熱",
      availableCount: 5,
      components: {
        nikkeiMa: 77,
        foreignFlow: 70,
        marginRatio: 75,
        arbitrage: 81,
        usdJpyMomentum: 18,
      },
    });
  });

  it("returns null when fewer than four investor weeks or no margin week is available", () => {
    expect(
      recomputeEntry(entry, {
        foreignFlowWeeks: foreignFlowWeeks.slice(2),
        marginRatioWeeks,
        tradingDays: calendar,
      })
    ).toBeNull();
    expect(
      recomputeEntry(entry, { foreignFlowWeeks, marginRatioWeeks: [], tradingDays: calendar })
    ).toBeNull();
  });
});
