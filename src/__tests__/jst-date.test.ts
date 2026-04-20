import { describe, it, expect } from "vitest";
import { formatJstDateLabel } from "@/lib/jst-date";

describe("formatJstDateLabel", () => {
  it("JST 2026-04-20 月曜 10:00 を '4/20(月)' と返す", () => {
    // JST 10:00 = UTC 01:00
    const utc = new Date("2026-04-20T01:00:00Z");
    expect(formatJstDateLabel(utc)).toBe("4/20(月)");
  });

  it("UTC 23:00 が JST では翌日になる", () => {
    // UTC 2026-04-19T23:00:00 → JST 2026-04-20T08:00:00 月曜
    const utc = new Date("2026-04-19T23:00:00Z");
    expect(formatJstDateLabel(utc)).toBe("4/20(月)");
  });

  it("引数省略時は現在時刻（new Date()）を使う", () => {
    const result = formatJstDateLabel();
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\([日月火水木金土]\)$/);
  });
});
