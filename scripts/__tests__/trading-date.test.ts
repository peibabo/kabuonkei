import { describe, it, expect } from "vitest";
import { resolveTradingDate, toJstIsoDate } from "../_lib/trading-date";

/** JST の日時文字列から Date を作る */
function jst(s: string): Date {
  return new Date(`${s}:00+09:00`);
}

describe("toJstIsoDate", () => {
  it("UTC では前日でも JST の日付を返す", () => {
    expect(toJstIsoDate(new Date("2026-11-05T16:00:00Z"))).toBe("2026-11-06");
  });
});

describe("resolveTradingDate", () => {
  it("定刻（当日 17:00 JST）の実行は当日の日付", () => {
    const r = resolveTradingDate(jst("2026-11-06T15:45"), jst("2026-11-06T17:00"));
    expect(r).toEqual({ date: "2026-11-06", marketClosed: false, fallback: false });
  });

  it("遅延して翌日未明に走っても取引日の日付のまま", () => {
    const r = resolveTradingDate(jst("2026-11-05T15:45"), jst("2026-11-06T00:56"));
    expect(r.date).toBe("2026-11-05");
    expect(r.marketClosed).toBe(false);
  });

  it("金曜分が土曜未明に走っても金曜の日付（土曜にならない）", () => {
    const r = resolveTradingDate(jst("2026-11-06T15:45"), jst("2026-11-07T00:29"));
    expect(r.date).toBe("2026-11-06");
    expect(r.marketClosed).toBe(false);
  });

  it("祝日の実行は前営業日の日付 + 休場扱い", () => {
    // 2026-11-03（火・文化の日）17:00 JST。最終取引は 11-02（月）の引け
    const r = resolveTradingDate(jst("2026-11-02T15:45"), jst("2026-11-03T17:00"));
    expect(r.date).toBe("2026-11-02");
    expect(r.marketClosed).toBe(true);
  });

  it("場中の手動実行は当日の日付", () => {
    const r = resolveTradingDate(jst("2026-11-13T10:07"), jst("2026-11-13T10:08"));
    expect(r.date).toBe("2026-11-13");
    expect(r.marketClosed).toBe(false);
  });

  it("最終取引時刻が無ければ「翌朝 9:00 JST までは前日分」で推定する", () => {
    expect(resolveTradingDate(null, jst("2026-11-06T17:00"))).toEqual({
      date: "2026-11-06",
      marketClosed: false,
      fallback: true,
    });
    expect(resolveTradingDate(null, jst("2026-11-07T02:30")).date).toBe("2026-11-06");
    expect(resolveTradingDate(undefined, jst("2026-11-09T09:30")).date).toBe("2026-11-09");
  });

  it("不正な日時・未来の日時はフォールバック", () => {
    const now = jst("2026-11-06T17:00");
    expect(resolveTradingDate(new Date("invalid"), now).fallback).toBe(true);
    expect(resolveTradingDate(jst("2026-11-08T17:00"), now).fallback).toBe(true);
  });
});
