import { describe, it, expect } from "vitest";
import {
  getSectorRankingForLevel,
  computeLevelAverages,
  computeGroupAverage,
  DEFENSIVE_SECTOR_CODES,
  CYCLICAL_SECTOR_CODES,
  SENTIMENT_LEVELS,
} from "@/lib/sector-rotation";
import { getJapanSectorHeatmap } from "@/lib/japan-sector-heatmap";

describe("getSectorRankingForLevel", () => {
  it("17 業種を avgReturn 降順で返す", () => {
    const rankings = getSectorRankingForLevel("極寒", "3m");
    expect(rankings).toHaveLength(17);
    for (let i = 1; i < rankings.length; i++) {
      expect(rankings[i - 1].stats.avgReturn).toBeGreaterThanOrEqual(
        rankings[i].stats.avgReturn
      );
    }
  });

  it("全温度帯 × 全期間で空にならない", () => {
    for (const level of SENTIMENT_LEVELS) {
      for (const period of ["1m", "3m", "6m"] as const) {
        expect(
          getSectorRankingForLevel(level, period).length
        ).toBeGreaterThan(0);
      }
    }
  });
});

describe("computeLevelAverages", () => {
  it("5 温度帯を順序どおり返す", () => {
    const averages = computeLevelAverages("3m");
    expect(averages.map((a) => a.level)).toEqual([
      "極寒",
      "冷え込み",
      "平温",
      "過熱",
      "沸騰",
    ]);
  });

  it("全業種平均は個別業種の min-max の範囲内", () => {
    for (const avg of averages3m()) {
      const rankings = getSectorRankingForLevel(avg.level, "3m");
      const max = rankings[0].stats.avgReturn;
      const min = rankings[rankings.length - 1].stats.avgReturn;
      expect(avg.avgAcrossSectors).toBeLessThanOrEqual(max);
      expect(avg.avgAcrossSectors).toBeGreaterThanOrEqual(min);
    }
  });

  it("occurrences は温度帯の日数（>0）", () => {
    for (const avg of averages3m()) {
      expect(avg.occurrences).toBeGreaterThan(0);
    }
  });

  function averages3m() {
    return computeLevelAverages("3m");
  }
});

describe("computeGroupAverage / グループ定義", () => {
  it("グループの業種コードは実データに存在する", () => {
    const codes = new Set(
      getJapanSectorHeatmap().sectors.map((s) => s.code)
    );
    for (const code of [...DEFENSIVE_SECTOR_CODES, ...CYCLICAL_SECTOR_CODES]) {
      expect(codes.has(code)).toBe(true);
    }
  });

  it("グループ平均は構成業種の値の範囲内", () => {
    const rankings = getSectorRankingForLevel("極寒", "3m").filter((r) =>
      DEFENSIVE_SECTOR_CODES.includes(r.sector.code)
    );
    const values = rankings.map((r) => r.stats.avgReturn);
    const avg = computeGroupAverage(DEFENSIVE_SECTOR_CODES, "極寒", "3m");
    expect(avg).toBeLessThanOrEqual(Math.max(...values));
    expect(avg).toBeGreaterThanOrEqual(Math.min(...values));
  });

  it("存在しないコードだけなら 0 を返す", () => {
    expect(computeGroupAverage(["9999"], "極寒", "3m")).toBe(0);
  });
});
