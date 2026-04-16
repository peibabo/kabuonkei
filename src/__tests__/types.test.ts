import { describe, it, expect } from "vitest";
import { getSentimentLevel, getSentimentColor } from "@/lib/types";

describe("getSentimentLevel", () => {
  it("0-20は極寒（総悲観）を返す", () => {
    expect(getSentimentLevel(0)).toBe("極寒（総悲観）");
    expect(getSentimentLevel(10)).toBe("極寒（総悲観）");
    expect(getSentimentLevel(20)).toBe("極寒（総悲観）");
  });

  it("21-40は冷え込み（弱気）を返す", () => {
    expect(getSentimentLevel(21)).toBe("冷え込み（弱気）");
    expect(getSentimentLevel(30)).toBe("冷え込み（弱気）");
    expect(getSentimentLevel(40)).toBe("冷え込み（弱気）");
  });

  it("41-60は平温（中立）を返す", () => {
    expect(getSentimentLevel(41)).toBe("平温（中立）");
    expect(getSentimentLevel(50)).toBe("平温（中立）");
    expect(getSentimentLevel(60)).toBe("平温（中立）");
  });

  it("61-80は加熱（強気）を返す", () => {
    expect(getSentimentLevel(61)).toBe("加熱（強気）");
    expect(getSentimentLevel(70)).toBe("加熱（強気）");
    expect(getSentimentLevel(80)).toBe("加熱（強気）");
  });

  it("81-100は沸騰（総楽観）を返す", () => {
    expect(getSentimentLevel(81)).toBe("沸騰（総楽観）");
    expect(getSentimentLevel(90)).toBe("沸騰（総楽観）");
    expect(getSentimentLevel(100)).toBe("沸騰（総楽観）");
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
