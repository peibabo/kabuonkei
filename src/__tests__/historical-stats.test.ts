import { describe, it, expect } from "vitest";
import {
  getHistoricalStats,
  getStatsForLevel,
  getStatsForScore,
  hasJpIndex,
  type Market,
} from "@/lib/historical-stats";

const MARKETS: Market[] = ["us", "jp"];

describe("historical-stats", () => {
  describe.each(MARKETS)("getHistoricalStats(%s)", (market) => {
    it("全5レベルのデータを含む", () => {
      const stats = getHistoricalStats(market);
      expect(stats.levels).toHaveLength(5);
      expect(stats.market).toBe(market);
    });

    it("メタデータが存在する", () => {
      const stats = getHistoricalStats(market);
      expect(stats.generatedAt).toBeTruthy();
      expect(stats.dataRange.from).toBeTruthy();
      expect(stats.dataRange.to).toBeTruthy();
    });

    it("各レベルに必要なフィールドが全て存在する", () => {
      const stats = getHistoricalStats(market);
      const expectedLevels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
      const periods = ["1m", "3m", "6m"] as const;

      stats.levels.forEach((level, i) => {
        expect(level.level).toBe(expectedLevels[i]);
        expect(level.occurrences).toBeGreaterThan(0);
        expect(level.scoreRange).toHaveLength(2);

        for (const p of periods) {
          const periodStats = level.stats[p];
          expect(periodStats.avgReturn).toBeDefined();
          expect(periodStats.medianReturn).toBeDefined();
          expect(periodStats.winRate).toBeGreaterThanOrEqual(0);
          expect(periodStats.winRate).toBeLessThanOrEqual(100);
          expect(periodStats.sampleSize).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("日本版のみ note を持つ", () => {
    it("us には note が無い", () => {
      const stats = getHistoricalStats("us");
      expect(stats.note).toBeUndefined();
    });

    it("jp は note を持つ", () => {
      const stats = getHistoricalStats("jp");
      expect(stats.note).toBeTruthy();
    });
  });

  describe.each(MARKETS)("getStatsForLevel(%s)", (market) => {
    it("指定レベルの統計を返す", () => {
      const stats = getStatsForLevel("極寒", market);
      expect(stats).toBeDefined();
      expect(stats!.level).toBe("極寒");
    });

    it("存在しないレベルはundefinedを返す", () => {
      // @ts-expect-error: テスト用に不正な値を渡す
      const stats = getStatsForLevel("存在しない", market);
      expect(stats).toBeUndefined();
    });
  });

  describe.each(MARKETS)("getStatsForScore(%s)", (market) => {
    it("スコア10は極寒を返す", () => {
      const stats = getStatsForScore(10, market);
      expect(stats).toBeDefined();
      expect(stats!.level).toBe("極寒");
    });

    it("スコア50は平温を返す", () => {
      const stats = getStatsForScore(50, market);
      expect(stats).toBeDefined();
      expect(stats!.level).toBe("平温");
    });

    it("スコア90は沸騰を返す", () => {
      const stats = getStatsForScore(90, market);
      expect(stats).toBeDefined();
      expect(stats!.level).toBe("沸騰");
    });
  });

  describe("日本版の TOPIX 切替", () => {
    it("TOPIX キーは JSON に存在する", () => {
      expect(hasJpIndex("topix")).toBe(true);
    });

    it("nikkei225 は常に true", () => {
      expect(hasJpIndex("nikkei225")).toBe(true);
    });

    it("indexKey 省略時は日経225（既存互換）", () => {
      const defaultStats = getHistoricalStats("jp");
      const nikkeiStats = getHistoricalStats("jp", "nikkei225");
      expect(defaultStats.levels[0].stats).toEqual(nikkeiStats.levels[0].stats);
    });

    it("indexKey=topix で TOPIX データを返す", () => {
      const nikkeiStats = getHistoricalStats("jp", "nikkei225");
      const topixStats = getHistoricalStats("jp", "topix");
      // TOPIX と日経225 は同スコアマップで集計しているが、指数特性が異なるためリターンは一致しない
      expect(topixStats.levels).toHaveLength(5);
      const cherryTopix = topixStats.levels[0].stats["3m"].avgReturn;
      const cherryNikkei = nikkeiStats.levels[0].stats["3m"].avgReturn;
      expect(cherryTopix).not.toBe(cherryNikkei);
    });

    it("米国市場では indexKey を指定しても S&P500 が返る", () => {
      const plain = getHistoricalStats("us");
      // 型システム上は JpIndexKey だが、ランタイムでは無視されることを確認
      const withKey = getHistoricalStats("us", "topix" as never);
      expect(withKey.levels[0].stats).toEqual(plain.levels[0].stats);
    });
  });
});
