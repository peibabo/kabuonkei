import { describe, it, expect } from "vitest";
import { getIssueNumber, RELEASE_DATE_UTC } from "../issue-number";

describe("getIssueNumber", () => {
  it("リリース日 (2026-04-19 JST) は第 1 号", () => {
    // 2026-04-19 12:00 JST = 2026-04-19 03:00 UTC
    const ms = Date.UTC(2026, 3, 19, 3, 0, 0);
    expect(getIssueNumber(ms)).toBe(1);
  });

  it("リリース日 0:00 JST も第 1 号", () => {
    expect(getIssueNumber(RELEASE_DATE_UTC)).toBe(1);
  });

  it("リリース日 23:59 JST も第 1 号 (日跨ぎ前)", () => {
    // 2026-04-19 23:59 JST = 2026-04-19 14:59 UTC
    const ms = Date.UTC(2026, 3, 19, 14, 59, 59);
    expect(getIssueNumber(ms)).toBe(1);
  });

  it("リリース翌日 0:00 JST = 第 2 号", () => {
    // 2026-04-20 00:00 JST = 2026-04-19 15:00 UTC
    const ms = Date.UTC(2026, 3, 19, 15, 0, 0);
    expect(getIssueNumber(ms)).toBe(2);
  });

  it("2026-04-25 (リリースから 6 日後) は第 7 号", () => {
    const ms = Date.UTC(2026, 3, 25, 3, 0, 0); // 2026-04-25 12:00 JST
    expect(getIssueNumber(ms)).toBe(7);
  });

  it("リリース 1 年後は第 366 号 (2026 はうるう年でないので)", () => {
    // 2026 は平年。365 日後 → 第 366 号
    const ms = Date.UTC(2027, 3, 19, 3, 0, 0);
    expect(getIssueNumber(ms)).toBe(366);
  });

  it("リリース日より前は 0 を返す", () => {
    const ms = Date.UTC(2026, 3, 18, 3, 0, 0); // 2026-04-18
    expect(getIssueNumber(ms)).toBe(0);
  });

  it("Date オブジェクトでも数値でも同じ結果", () => {
    const ms = Date.UTC(2026, 3, 25, 3, 0, 0);
    expect(getIssueNumber(ms)).toBe(getIssueNumber(new Date(ms)));
  });
});
