import { describe, it, expect } from "vitest";
import {
  formatJstDateLabel,
  labelFromIsoDate,
  parseScore,
} from "@/app/api/og/daily/_lib/params";

describe("parseScore", () => {
  it("null を受けたら null", () => {
    expect(parseScore(null)).toBeNull();
  });

  it("数値として無効な文字列は null", () => {
    expect(parseScore("abc")).toBeNull();
    expect(parseScore("NaN")).toBeNull();
  });

  it("空文字は Number('') = 0 として扱われる", () => {
    // 挙動維持: 既存実装は Number(raw) ベースのため空文字は 0 に帰着する
    expect(parseScore("")).toBe(0);
  });

  it("0-100 範囲外は null", () => {
    expect(parseScore("-1")).toBeNull();
    expect(parseScore("101")).toBeNull();
    expect(parseScore("200")).toBeNull();
  });

  it("整数はそのまま返す", () => {
    expect(parseScore("0")).toBe(0);
    expect(parseScore("50")).toBe(50);
    expect(parseScore("100")).toBe(100);
  });

  it("小数は丸める", () => {
    expect(parseScore("49.4")).toBe(49);
    expect(parseScore("49.5")).toBe(50);
    expect(parseScore("49.6")).toBe(50);
  });
});

describe("labelFromIsoDate", () => {
  it("正しい ISO 日付を M/D(曜) に変換する", () => {
    // 2026-04-20 は UTC 月曜
    expect(labelFromIsoDate("2026-04-20")).toBe("4/20(月)");
    // 2026-04-19 は UTC 日曜
    expect(labelFromIsoDate("2026-04-19")).toBe("4/19(日)");
  });

  it("形式不正なら null", () => {
    expect(labelFromIsoDate("2026/04/20")).toBeNull();
    expect(labelFromIsoDate("abc")).toBeNull();
    expect(labelFromIsoDate("")).toBeNull();
    expect(labelFromIsoDate("2026-4-20")).toBeNull();
  });
});

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
});
