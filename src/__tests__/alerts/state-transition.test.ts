import { describe, it, expect } from "vitest";
import {
  computeCurrentState,
  parseStoredState,
  shouldFire,
} from "@/lib/alerts/state-transition";

describe("computeCurrentState", () => {
  it("score が 20 以下なら cold", () => {
    expect(computeCurrentState("neutral", 20)).toBe("cold");
    expect(computeCurrentState("neutral", 10)).toBe("cold");
    expect(computeCurrentState("neutral", 0)).toBe("cold");
  });

  it("score が 80 以上なら hot", () => {
    expect(computeCurrentState("neutral", 80)).toBe("hot");
    expect(computeCurrentState("neutral", 95)).toBe("hot");
  });

  it("20 < score < 80 かつ前回 neutral なら neutral", () => {
    expect(computeCurrentState("neutral", 21)).toBe("neutral");
    expect(computeCurrentState("neutral", 50)).toBe("neutral");
    expect(computeCurrentState("neutral", 79)).toBe("neutral");
  });

  it("前回 cold で score が 25 未満なら cold を維持（ヒステリシス）", () => {
    expect(computeCurrentState("cold", 21)).toBe("cold");
    expect(computeCurrentState("cold", 24)).toBe("cold");
  });

  it("前回 cold でも score が 25 以上なら neutral に戻る", () => {
    expect(computeCurrentState("cold", 25)).toBe("neutral");
    expect(computeCurrentState("cold", 30)).toBe("neutral");
  });

  it("前回 hot で score が 75 超なら hot を維持", () => {
    expect(computeCurrentState("hot", 79)).toBe("hot");
    expect(computeCurrentState("hot", 76)).toBe("hot");
  });

  it("前回 hot でも score が 75 以下なら neutral に戻る", () => {
    expect(computeCurrentState("hot", 75)).toBe("neutral");
    expect(computeCurrentState("hot", 60)).toBe("neutral");
  });
});

describe("shouldFire", () => {
  it("neutral → cold/hot で発火", () => {
    expect(shouldFire("neutral", "cold")).toEqual({ fire: true, kind: "cold" });
    expect(shouldFire("neutral", "hot")).toEqual({ fire: true, kind: "hot" });
  });

  it("cold → cold, hot → hot は発火しない（連続防止）", () => {
    expect(shouldFire("cold", "cold")).toEqual({ fire: false, kind: null });
    expect(shouldFire("hot", "hot")).toEqual({ fire: false, kind: null });
  });

  it("cold → hot, hot → cold は発火（直接反転）", () => {
    expect(shouldFire("cold", "hot")).toEqual({ fire: true, kind: "hot" });
    expect(shouldFire("hot", "cold")).toEqual({ fire: true, kind: "cold" });
  });

  it("cold/hot → neutral は発火しない（解消アラートなし）", () => {
    expect(shouldFire("cold", "neutral")).toEqual({ fire: false, kind: null });
    expect(shouldFire("hot", "neutral")).toEqual({ fire: false, kind: null });
  });

  it("neutral → neutral は発火しない", () => {
    expect(shouldFire("neutral", "neutral")).toEqual({ fire: false, kind: null });
  });
});

describe("parseStoredState", () => {
  it("known values はそのまま", () => {
    expect(parseStoredState("cold")).toBe("cold");
    expect(parseStoredState("neutral")).toBe("neutral");
    expect(parseStoredState("hot")).toBe("hot");
  });

  it("unknown / null / undefined は neutral", () => {
    expect(parseStoredState(null)).toBe("neutral");
    expect(parseStoredState(undefined)).toBe("neutral");
    expect(parseStoredState("")).toBe("neutral");
    expect(parseStoredState("warm")).toBe("neutral");
  });
});
