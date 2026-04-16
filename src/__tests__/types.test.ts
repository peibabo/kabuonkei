import { describe, it, expect } from "vitest";
import { getSentimentLevel, getSentimentColor } from "@/lib/types";

describe("getSentimentLevel", () => {
  it("0-20は極度の恐怖を返す", () => {
    expect(getSentimentLevel(0)).toBe("極度の恐怖");
    expect(getSentimentLevel(10)).toBe("極度の恐怖");
    expect(getSentimentLevel(20)).toBe("極度の恐怖");
  });

  it("21-40は恐怖を返す", () => {
    expect(getSentimentLevel(21)).toBe("恐怖");
    expect(getSentimentLevel(30)).toBe("恐怖");
    expect(getSentimentLevel(40)).toBe("恐怖");
  });

  it("41-60は中立を返す", () => {
    expect(getSentimentLevel(41)).toBe("中立");
    expect(getSentimentLevel(50)).toBe("中立");
    expect(getSentimentLevel(60)).toBe("中立");
  });

  it("61-80は欲望を返す", () => {
    expect(getSentimentLevel(61)).toBe("欲望");
    expect(getSentimentLevel(70)).toBe("欲望");
    expect(getSentimentLevel(80)).toBe("欲望");
  });

  it("81-100は極度の欲望を返す", () => {
    expect(getSentimentLevel(81)).toBe("極度の欲望");
    expect(getSentimentLevel(90)).toBe("極度の欲望");
    expect(getSentimentLevel(100)).toBe("極度の欲望");
  });
});

describe("getSentimentColor", () => {
  it("スコアに応じた色コードを返す", () => {
    expect(getSentimentColor(10)).toBe("#dc2626");
    expect(getSentimentColor(30)).toBe("#ea580c");
    expect(getSentimentColor(50)).toBe("#ca8a04");
    expect(getSentimentColor(70)).toBe("#65a30d");
    expect(getSentimentColor(90)).toBe("#16a34a");
  });
});
