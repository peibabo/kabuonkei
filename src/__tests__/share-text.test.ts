import { describe, it, expect } from "vitest";
import { buildShareText } from "@/lib/share-text";

const baseInput = {
  dateLabel: "4/21(火)",
  siteUrl: "https://kabuonkei.com",
} as const;

describe("buildShareText", () => {
  it("日米両スコアありの平温ケース: ヘッダーは通常、JP→US 順（market=jp）", () => {
    const text = buildShareText({
      ...baseInput,
      market: "jp",
      japanScore: 55,
      usScore: 48,
      japanLevel: "平温",
      usLevel: "平温",
    });
    const lines = text.split("\n");
    expect(lines[0]).toBe("🌡 今日の市場温度（4/21(火)）");
    expect(lines[2]).toContain("🇯🇵 日本 55 平温");
    expect(lines[3]).toContain("🇺🇸 米国 48 平温");
    expect(text).toContain(
      "▶ https://kabuonkei.com/?ref=share&utm_source=x&utm_campaign=share_card",
    );
  });

  it("market=us の場合は US 行が先に来る", () => {
    const text = buildShareText({
      ...baseInput,
      market: "us",
      japanScore: 55,
      usScore: 48,
      japanLevel: "平温",
      usLevel: "平温",
    });
    const lines = text.split("\n");
    expect(lines[2]).toContain("🇺🇸 米国 48");
    expect(lines[3]).toContain("🇯🇵 日本 55");
  });

  it("JP スコアが 85（沸騰）なら沸騰アラートヘッダーが付く", () => {
    const text = buildShareText({
      ...baseInput,
      market: "jp",
      japanScore: 85,
      usScore: 60,
      japanLevel: "沸騰",
      usLevel: "平温",
    });
    expect(text.split("\n")[0]).toBe("🔥 沸騰アラート 4/21(火)");
  });

  it("スコアちょうど 80 は温度計ゲージと同じ「過熱アラート」（沸騰は 81 以上）", () => {
    const text = buildShareText({
      ...baseInput,
      market: "jp",
      japanScore: 80,
      usScore: 60,
      japanLevel: "過熱",
      usLevel: "平温",
    });
    expect(text.split("\n")[0]).toBe("🔥 過熱アラート 4/21(火)");
  });

  it("US スコアが 15（極寒）なら極寒アラートヘッダーが付く", () => {
    const text = buildShareText({
      ...baseInput,
      market: "us",
      japanScore: 40,
      usScore: 15,
      japanLevel: "冷え込み",
      usLevel: "極寒",
    });
    expect(text.split("\n")[0]).toBe("⚠️ 極寒アラート 4/21(火)");
  });

  it("片方だけ欠損しても崩れず、欠損行だけ省略される", () => {
    const text = buildShareText({
      ...baseInput,
      market: "jp",
      japanScore: 70,
      usScore: null,
      japanLevel: "過熱",
      usLevel: null,
    });
    expect(text).toContain("🇯🇵 日本 70 過熱");
    expect(text).not.toContain("🇺🇸 米国");
  });

  it("siteUrl 末尾にスラッシュがあっても二重にならない", () => {
    const text = buildShareText({
      ...baseInput,
      siteUrl: "https://kabuonkei.com/",
      market: "jp",
      japanScore: 50,
      usScore: 50,
      japanLevel: "平温",
      usLevel: "平温",
    });
    expect(text).toContain("▶ https://kabuonkei.com/?ref=share");
    expect(text).not.toContain("kabuonkei.com//");
  });
});
