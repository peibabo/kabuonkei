import { describe, expect, it } from "vitest";
import { parseVariants } from "@/lib/alerts/subscribers";

describe("parseVariants", () => {
  it("undefined / null / 空文字 → []", () => {
    expect(parseVariants(undefined)).toEqual([]);
    expect(parseVariants(null)).toEqual([]);
    expect(parseVariants("")).toEqual([]);
  });

  it("JSON 文字列を配列にパース", () => {
    expect(parseVariants('["jp_hot","us_cold"]')).toEqual(["jp_hot", "us_cold"]);
  });

  it("配列入力（Upstash SDK が auto-deserialize 済み）も受け付ける", () => {
    // verifySubscriber が壊れていた本番バグの再現ケース。
    // Upstash Redis SDK は hset で保存した JSON 文字列を hgetall 時に
    // 自動でパースして配列として返すため、parseVariants は配列入力も
    // 処理できなければならない。
    expect(parseVariants(["jp_hot", "jp_cold", "us_cold", "us_hot"])).toEqual([
      "jp_hot",
      "jp_cold",
      "us_cold",
      "us_hot",
    ]);
  });

  it("不正な variant はフィルタされる", () => {
    expect(parseVariants(["jp_hot", "invalid", "us_cold"])).toEqual([
      "jp_hot",
      "us_cold",
    ]);
    expect(parseVariants('["jp_hot","invalid"]')).toEqual(["jp_hot"]);
  });

  it("非配列の JSON 文字列 → []", () => {
    expect(parseVariants('"jp_hot"')).toEqual([]);
    expect(parseVariants("{}")).toEqual([]);
  });

  it("壊れた JSON 文字列 → []", () => {
    expect(parseVariants("not json")).toEqual([]);
  });

  it("数値・オブジェクトなど想定外の型 → []", () => {
    expect(parseVariants(123 as unknown)).toEqual([]);
    expect(parseVariants({ jp_hot: true } as unknown)).toEqual([]);
  });
});
