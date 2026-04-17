import { describe, it, expect } from "vitest";
import {
  getSentimentLevel,
  getSentimentDescription,
  getSentimentColor,
} from "@/lib/sentiment";

describe("getSentimentLevel", () => {
  it("0-20は極寒を返す", () => {
    expect(getSentimentLevel(0)).toBe("極寒");
    expect(getSentimentLevel(10)).toBe("極寒");
    expect(getSentimentLevel(20)).toBe("極寒");
  });

  it("21-40は冷え込みを返す", () => {
    expect(getSentimentLevel(21)).toBe("冷え込み");
    expect(getSentimentLevel(30)).toBe("冷え込み");
    expect(getSentimentLevel(40)).toBe("冷え込み");
  });

  it("41-60は平温を返す", () => {
    expect(getSentimentLevel(41)).toBe("平温");
    expect(getSentimentLevel(50)).toBe("平温");
    expect(getSentimentLevel(60)).toBe("平温");
  });

  it("61-80は過熱を返す", () => {
    expect(getSentimentLevel(61)).toBe("過熱");
    expect(getSentimentLevel(70)).toBe("過熱");
    expect(getSentimentLevel(80)).toBe("過熱");
  });

  it("81-100は沸騰を返す", () => {
    expect(getSentimentLevel(81)).toBe("沸騰");
    expect(getSentimentLevel(90)).toBe("沸騰");
    expect(getSentimentLevel(100)).toBe("沸騰");
  });
});

describe("getSentimentDescription", () => {
  it("0-20は総悲観を返す", () => {
    expect(getSentimentDescription(0)).toBe("総悲観");
    expect(getSentimentDescription(20)).toBe("総悲観");
  });

  it("21-40は弱気を返す", () => {
    expect(getSentimentDescription(21)).toBe("弱気");
    expect(getSentimentDescription(40)).toBe("弱気");
  });

  it("41-60は中立を返す", () => {
    expect(getSentimentDescription(41)).toBe("中立");
    expect(getSentimentDescription(60)).toBe("中立");
  });

  it("61-80は強気を返す", () => {
    expect(getSentimentDescription(61)).toBe("強気");
    expect(getSentimentDescription(80)).toBe("強気");
  });

  it("81-100は総楽観を返す", () => {
    expect(getSentimentDescription(81)).toBe("総楽観");
    expect(getSentimentDescription(100)).toBe("総楽観");
  });
});

describe("getSentimentColor", () => {
  it("スコアに応じた色コードを返す", () => {
    expect(getSentimentColor(10)).toBe("#2563eb");
    expect(getSentimentColor(30)).toBe("#0ea5e9");
    expect(getSentimentColor(50)).toBe("#ca8a04");
    expect(getSentimentColor(70)).toBe("#ea580c");
    expect(getSentimentColor(90)).toBe("#dc2626");
  });
});
