import { describe, it, expect } from "vitest";
import {
  formatGa4Date,
  jstDateNDaysAgo,
  padLabel,
} from "../report-analytics";

describe("formatGa4Date", () => {
  it("YYYYMMDD を MM/DD に変換する", () => {
    expect(formatGa4Date("20260703")).toBe("07/03");
  });

  it("形式外の値はそのまま返す", () => {
    expect(formatGa4Date("(other)")).toBe("(other)");
  });
});

describe("jstDateNDaysAgo", () => {
  it("JST 基準で n 日前を YYYY-MM-DD で返す", () => {
    // UTC 2026-07-03 20:00 = JST 2026-07-04 05:00
    const now = new Date("2026-07-03T20:00:00Z");
    expect(jstDateNDaysAgo(0, now)).toBe("2026-07-04");
    expect(jstDateNDaysAgo(3, now)).toBe("2026-07-01");
    expect(jstDateNDaysAgo(10, now)).toBe("2026-06-24");
  });

  it("UTC 日付と JST 日付がずれる時間帯でも JST を採用する", () => {
    // UTC 2026-07-03 10:00 = JST 2026-07-03 19:00 → 同日
    const now = new Date("2026-07-03T10:00:00Z");
    expect(jstDateNDaysAgo(0, now)).toBe("2026-07-03");
  });
});

describe("padLabel", () => {
  it("半角は幅1、全角は幅2で計算して揃える", () => {
    expect(padLabel("abc", 6)).toBe("abc   ");
    expect(padLabel("あい", 6)).toBe("あい  ");
  });

  it("幅を超えるラベルはそのまま返す", () => {
    expect(padLabel("abcdefgh", 4)).toBe("abcdefgh");
  });
});
