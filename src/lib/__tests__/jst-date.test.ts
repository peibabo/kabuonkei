import { describe, it, expect } from "vitest";
import {
  formatJstDateLabel,
  formatJstDateTimeLabel,
  formatJstFullDateLabel,
} from "../jst-date";

describe("formatJstDateLabel", () => {
  it("UTC 日付を JST の M/D(曜) に整形する", () => {
    const utc = new Date(Date.UTC(2026, 3, 20, 1, 0, 0)); // JST 月 10:00
    expect(formatJstDateLabel(utc)).toBe("4/20(月)");
  });

  it("日跨ぎ: UTC 23:00 が JST 翌日になる", () => {
    const utc = new Date(Date.UTC(2026, 3, 19, 23, 0, 0));
    expect(formatJstDateLabel(utc)).toBe("4/20(月)");
  });
});

describe("formatJstDateTimeLabel", () => {
  it("UTC 07:15 を JST 16:15 に変換する", () => {
    const ms = Date.UTC(2026, 3, 21, 7, 15, 0);
    expect(formatJstDateTimeLabel(ms)).toBe("4/21 16:15 JST");
  });

  it("分が 1 桁の場合も 2 桁ゼロ埋め", () => {
    const ms = Date.UTC(2026, 3, 21, 0, 5, 0); // JST 09:05
    expect(formatJstDateTimeLabel(ms)).toBe("4/21 09:05 JST");
  });

  it("時が 1 桁の場合も 2 桁ゼロ埋め", () => {
    const ms = Date.UTC(2026, 3, 21, 23, 30, 0); // JST 翌 08:30
    expect(formatJstDateTimeLabel(ms)).toBe("4/22 08:30 JST");
  });

  it("null / undefined / NaN は '—' を返す", () => {
    expect(formatJstDateTimeLabel(null)).toBe("—");
    expect(formatJstDateTimeLabel(undefined)).toBe("—");
    expect(formatJstDateTimeLabel(NaN)).toBe("—");
  });
});

describe("formatJstFullDateLabel", () => {
  it("UTC 日付を JST の YYYY年M月D日(曜) に整形する", () => {
    const utc = new Date(Date.UTC(2026, 3, 25, 1, 0, 0)); // JST 土 10:00
    expect(formatJstFullDateLabel(utc)).toBe("2026年4月25日(土)");
  });

  it("数値 (UTC ms) でも受け取れる", () => {
    const ms = Date.UTC(2026, 3, 19, 3, 0, 0);
    expect(formatJstFullDateLabel(ms)).toBe("2026年4月19日(日)");
  });

  it("日跨ぎ: UTC 23:00 が JST 翌日になる", () => {
    const utc = new Date(Date.UTC(2026, 3, 19, 23, 0, 0));
    expect(formatJstFullDateLabel(utc)).toBe("2026年4月20日(月)");
  });
});
