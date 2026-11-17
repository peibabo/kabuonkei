import { describe, expect, it } from "vitest";
import {
  computeJpAlertScore,
  jpAlertScoreFromComponents,
} from "@/lib/alerts/jp-score";
import type { JapanFearGreedComponent } from "@/lib/types";

describe("computeJpAlertScore", () => {
  it("C1（日経225 モメンタム）をそのまま返す", () => {
    expect(computeJpAlertScore({ nikkeiMa: 7 })).toBe(7);
    expect(computeJpAlertScore({ nikkeiMa: 0 })).toBe(0);
    expect(computeJpAlertScore({ nikkeiMa: 100 })).toBe(100);
  });
});

describe("jpAlertScoreFromComponents", () => {
  const comp = (
    id: JapanFearGreedComponent["id"],
    score: number,
    available = true,
  ): JapanFearGreedComponent => ({
    id,
    label: id,
    score,
    rawValue: available ? 0 : null,
    available,
  });

  it("C1 だけで決まる（需給 3 要素とドル円は無視）", () => {
    const components = [
      comp("nikkeiMa", 10),
      comp("foreignFlow", 100),
      comp("marginRatio", 100),
      comp("arbitrage", 100),
      comp("usdJpyMomentum", 90),
    ];
    expect(jpAlertScoreFromComponents(components)).toBe(10);
  });

  it("C1 が欠損なら null（欠損値 50 を使わない）", () => {
    expect(
      jpAlertScoreFromComponents([
        comp("nikkeiMa", 50, false),
        comp("usdJpyMomentum", 20),
      ]),
    ).toBeNull();
    expect(jpAlertScoreFromComponents([comp("usdJpyMomentum", 20)])).toBeNull();
  });

  it("データなしなら null", () => {
    expect(jpAlertScoreFromComponents(null)).toBeNull();
    expect(jpAlertScoreFromComponents(undefined)).toBeNull();
  });
});
