import { describe, it, expect } from "vitest";
import {
  formatJstFullDateLabel,
  jstIsoDate,
  variantOf,
} from "../_lib/alert-state";

describe("variantOf", () => {
  it("market + kind を variant 文字列に結合", () => {
    expect(variantOf("us", "cold")).toBe("us_cold");
    expect(variantOf("us", "hot")).toBe("us_hot");
    expect(variantOf("jp", "cold")).toBe("jp_cold");
    expect(variantOf("jp", "hot")).toBe("jp_hot");
  });
});

describe("jstIsoDate", () => {
  it("UTC 00:00 の直前でも JST では翌日扱い", () => {
    // 2026-04-23T23:00 UTC = 2026-04-24T08:00 JST
    const d = new Date(Date.UTC(2026, 3, 23, 23, 0, 0));
    expect(jstIsoDate(d)).toBe("2026-04-24");
  });

  it("UTC 正午は JST の同日 21 時", () => {
    const d = new Date(Date.UTC(2026, 3, 24, 12, 0, 0));
    expect(jstIsoDate(d)).toBe("2026-04-24");
  });
});

describe("formatJstFullDateLabel", () => {
  it("YYYY/MM/DD(曜) 形式", () => {
    // 2026-04-24 金曜日
    const d = new Date(Date.UTC(2026, 3, 24, 0, 0, 0));
    expect(formatJstFullDateLabel(d)).toBe("2026/04/24(金)");
  });

  it("JST 日付境界を跨ぐ UTC 時刻でも JST の日付を返す", () => {
    // 2026-04-23T23:00 UTC = 2026-04-24T08:00 JST
    const d = new Date(Date.UTC(2026, 3, 23, 23, 0, 0));
    expect(formatJstFullDateLabel(d)).toBe("2026/04/24(金)");
  });
});
