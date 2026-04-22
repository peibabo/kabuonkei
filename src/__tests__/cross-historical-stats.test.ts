import { describe, it, expect } from "vitest";
import {
  CROSS_DIRECTION_META,
  getCrossHistoricalStats,
  getCrossStatsForLevel,
  getCrossStatsForScore,
  type CrossDirection,
} from "@/lib/cross-historical-stats";

const DIRECTIONS: CrossDirection[] = ["usTempJpIdx", "jpTempUsIdx"];

describe("cross-historical-stats", () => {
  describe.each(DIRECTIONS)(
    "getCrossHistoricalStats(%s)",
    (direction) => {
      it("全5レベルのデータを含む", () => {
        const stats = getCrossHistoricalStats(direction);
        expect(stats.levels).toHaveLength(5);
      });

      it("メタデータが存在する", () => {
        const stats = getCrossHistoricalStats(direction);
        expect(stats.generatedAt).toBeTruthy();
        expect(stats.dataRange.from).toBeTruthy();
        expect(stats.dataRange.to).toBeTruthy();
        expect(stats.note).toBeTruthy();
      });

      it("各レベルに必要なフィールドが全て存在する", () => {
        const stats = getCrossHistoricalStats(direction);
        const expectedLevels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
        const periods = ["1m", "3m", "6m"] as const;

        stats.levels.forEach((level, i) => {
          expect(level.level).toBe(expectedLevels[i]);
          expect(level.scoreRange).toHaveLength(2);
          for (const p of periods) {
            const ps = level.stats[p];
            expect(ps.avgReturn).toBeDefined();
            expect(ps.medianReturn).toBeDefined();
            expect(ps.winRate).toBeGreaterThanOrEqual(0);
            expect(ps.winRate).toBeLessThanOrEqual(100);
          }
        });
      });
    }
  );

  describe("2方向の結果は異なる", () => {
    it("usTempJpIdx と jpTempUsIdx は独立して返される", () => {
      const a = getCrossHistoricalStats("usTempJpIdx");
      const b = getCrossHistoricalStats("jpTempUsIdx");
      // 温度ソースも対象市場も異なるため、同一温度帯の平均リターンは一致しないはず
      expect(a.levels[0].stats["3m"].avgReturn).not.toBe(
        b.levels[0].stats["3m"].avgReturn
      );
    });
  });

  describe.each(DIRECTIONS)(
    "getCrossStatsForLevel(%s)",
    (direction) => {
      it("極寒レベルの統計を返す", () => {
        const stats = getCrossStatsForLevel("極寒", direction);
        expect(stats).toBeDefined();
        expect(stats!.level).toBe("極寒");
      });
    }
  );

  describe.each(DIRECTIONS)(
    "getCrossStatsForScore(%s)",
    (direction) => {
      it("スコア10 は極寒", () => {
        const stats = getCrossStatsForScore(10, direction);
        expect(stats?.level).toBe("極寒");
      });
      it("スコア50 は平温", () => {
        const stats = getCrossStatsForScore(50, direction);
        expect(stats?.level).toBe("平温");
      });
      it("スコア90 は沸騰", () => {
        const stats = getCrossStatsForScore(90, direction);
        expect(stats?.level).toBe("沸騰");
      });
    }
  );

  describe("CROSS_DIRECTION_META", () => {
    it("両方向にラベル/見出しが定義されている", () => {
      for (const d of DIRECTIONS) {
        const meta = CROSS_DIRECTION_META[d];
        expect(meta.label).toBeTruthy();
        expect(meta.title).toBeTruthy();
        expect(meta.temperatureLabel).toMatch(/温度/);
        expect(meta.indexLabel).toBeTruthy();
      }
    });
  });
});
