import { describe, it, expect } from "vitest";
import {
  countLessOrEqual,
  getDistributionMeta,
  getScorePercentile,
  type DistributionMarket,
} from "@/lib/score-distribution";

const MARKETS: DistributionMarket[] = ["us", "jp"];

describe("score-distribution", () => {
  describe("countLessOrEqual (binary search)", () => {
    const arr = [0, 1, 3, 3, 5, 7, 9, 9, 9, 10];

    it("配列下限より小さい値は 0", () => {
      expect(countLessOrEqual(arr, -1)).toBe(0);
    });

    it("配列上限以上は配列長", () => {
      expect(countLessOrEqual(arr, 10)).toBe(10);
      expect(countLessOrEqual(arr, 99)).toBe(10);
    });

    it("同じ値が複数ある場合も最後の該当まで数える", () => {
      expect(countLessOrEqual(arr, 3)).toBe(4);
      expect(countLessOrEqual(arr, 9)).toBe(9);
    });

    it("配列に無い中間値は「その値以下の要素数」", () => {
      expect(countLessOrEqual(arr, 4)).toBe(4); // 0,1,3,3
      expect(countLessOrEqual(arr, 8)).toBe(6); // 0,1,3,3,5,7
    });

    it("空配列は常に 0", () => {
      expect(countLessOrEqual([], 50)).toBe(0);
    });
  });

  describe.each(MARKETS)("getScorePercentile(%s)", (market) => {
    it("スコア 0 は percentile が極めて低い", () => {
      const r = getScorePercentile(0, market);
      expect(r).not.toBeNull();
      expect(r!.percentile).toBeGreaterThanOrEqual(0);
      expect(r!.percentile).toBeLessThan(10); // 0 以下は通常 5% 未満
    });

    it("スコア 100 は percentile = 100 (全日数以上)", () => {
      const r = getScorePercentile(100, market);
      expect(r).not.toBeNull();
      expect(r!.percentile).toBe(100);
      expect(r!.rank).toBe(r!.total);
    });

    it("スコア 50 は実分布内（単調性は percentile 比較で保証）", () => {
      // VIX 推定ベース（米）も C1+C5 ベース（日）も分布は一様ではなく、
      // 中央値が 50 付近になるとは限らない。ここは 0-100 の範囲に収まることのみ確認。
      const r = getScorePercentile(50, market);
      expect(r).not.toBeNull();
      expect(r!.percentile).toBeGreaterThanOrEqual(0);
      expect(r!.percentile).toBeLessThanOrEqual(100);
    });

    it("rank は 0 以上 total 以下", () => {
      const r = getScorePercentile(30, market);
      expect(r).not.toBeNull();
      expect(r!.rank).toBeGreaterThanOrEqual(0);
      expect(r!.rank).toBeLessThanOrEqual(r!.total);
    });

    it("percentile は単調非減少（低い score ≤ 高い score）", () => {
      const low = getScorePercentile(10, market)!;
      const mid = getScorePercentile(50, market)!;
      const high = getScorePercentile(90, market)!;
      expect(low.percentile).toBeLessThanOrEqual(mid.percentile);
      expect(mid.percentile).toBeLessThanOrEqual(high.percentile);
    });

    it("dataRange が from/to を持つ", () => {
      const r = getScorePercentile(50, market);
      expect(r!.dataRange.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r!.dataRange.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r!.dataRange.from <= r!.dataRange.to).toBe(true);
    });
  });

  describe("getDistributionMeta", () => {
    it("日米両市場のメタが存在する", () => {
      const meta = getDistributionMeta();
      expect(meta.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(meta.us.count).toBeGreaterThan(1000);
      expect(meta.jp.count).toBeGreaterThan(1000);
    });
  });
});
