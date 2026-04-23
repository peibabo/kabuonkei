import { describe, it, expect } from "vitest";
import {
  getJapanSectorHeatmap,
  getSectorStatsForScore,
  getTopSectorsForScore,
} from "@/lib/japan-sector-heatmap";

describe("japan-sector-heatmap", () => {
  describe("getJapanSectorHeatmap", () => {
    it("メタデータが存在する", () => {
      const heatmap = getJapanSectorHeatmap();
      expect(heatmap.generatedAt).toBeTruthy();
      expect(heatmap.dataRange.from).toBeTruthy();
      expect(heatmap.dataRange.to).toBeTruthy();
      expect(heatmap.note).toBeTruthy();
    });

    it("17 セクター分のデータを含む", () => {
      const heatmap = getJapanSectorHeatmap();
      expect(heatmap.sectors).toHaveLength(17);
    });

    it("各セクターに5温度帯の統計が存在する", () => {
      const heatmap = getJapanSectorHeatmap();
      const expectedLevels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
      for (const sector of heatmap.sectors) {
        expect(sector.code).toMatch(/^16(1[7-9]|2\d|3[0-3])$/);
        expect(sector.symbol).toBe(`${sector.code}.T`);
        expect(sector.name).toBeTruthy();
        expect(sector.levels).toHaveLength(5);
        sector.levels.forEach((l, i) => {
          expect(l.level).toBe(expectedLevels[i]);
          expect(l.occurrences).toBeGreaterThan(0);
          for (const p of ["1m", "3m", "6m"] as const) {
            expect(l.stats[p].sampleSize).toBeGreaterThan(0);
            expect(l.stats[p].winRate).toBeGreaterThanOrEqual(0);
            expect(l.stats[p].winRate).toBeLessThanOrEqual(100);
          }
        });
      }
    });
  });

  describe("getSectorStatsForScore", () => {
    it("存在するセクターコードで PeriodStats を返す", () => {
      const stats = getSectorStatsForScore(10, "1617", "3m");
      expect(stats).not.toBeNull();
      expect(stats!.sampleSize).toBeGreaterThan(0);
    });

    it("存在しないセクターコードで null を返す", () => {
      const stats = getSectorStatsForScore(10, "9999", "3m");
      expect(stats).toBeNull();
    });
  });

  describe("getTopSectorsForScore", () => {
    it("avgReturn 降順で上位を返す", () => {
      const top = getTopSectorsForScore(10, "3m", 5);
      expect(top.length).toBe(5);
      for (let i = 1; i < top.length; i++) {
        expect(top[i - 1].stats.avgReturn).toBeGreaterThanOrEqual(
          top[i].stats.avgReturn
        );
      }
    });

    it("limit を尊重する", () => {
      const top = getTopSectorsForScore(50, "1m", 3);
      expect(top.length).toBe(3);
    });

    it("各エントリが sector と stats を含む", () => {
      const top = getTopSectorsForScore(50, "6m", 1);
      expect(top[0].sector.code).toBeTruthy();
      expect(top[0].sector.name).toBeTruthy();
      expect(top[0].stats.avgReturn).toBeDefined();
      expect(top[0].stats.sampleSize).toBeGreaterThan(0);
    });
  });
});
