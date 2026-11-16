import { describe, expect, it } from "vitest";
import {
  computeJpAlertScore,
  jpAlertScoreFromComponents,
} from "@/lib/alerts/jp-score";
import type { JapanFearGreedComponent } from "@/lib/types";

describe("computeJpAlertScore", () => {
  it("C1・C5 の平均（四捨五入）", () => {
    expect(computeJpAlertScore({ nikkeiMa: 7, usdJpyMomentum: 38 })).toBe(23);
    expect(computeJpAlertScore({ nikkeiMa: 0, usdJpyMomentum: 0 })).toBe(0);
    expect(computeJpAlertScore({ nikkeiMa: 100, usdJpyMomentum: 60 })).toBe(80);
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

  it("需給 3 要素は無視して C1・C5 だけで決まる", () => {
    const components = [
      comp("nikkeiMa", 10),
      comp("foreignFlow", 100),
      comp("marginRatio", 100),
      comp("arbitrage", 100),
      comp("usdJpyMomentum", 20),
    ];
    expect(jpAlertScoreFromComponents(components)).toBe(15);
  });

  it("C1・C5 のどちらかが欠損なら null（欠損値 50 を混ぜない）", () => {
    expect(
      jpAlertScoreFromComponents([
        comp("nikkeiMa", 10),
        comp("usdJpyMomentum", 50, false),
      ]),
    ).toBeNull();
    expect(jpAlertScoreFromComponents([comp("usdJpyMomentum", 20)])).toBeNull();
  });

  it("データなしなら null", () => {
    expect(jpAlertScoreFromComponents(null)).toBeNull();
    expect(jpAlertScoreFromComponents(undefined)).toBeNull();
  });
});
