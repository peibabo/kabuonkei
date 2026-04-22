import { describe, it, expect } from "vitest";
import {
  PERSONA_HINTS,
  PERSONA_META,
  PERSONA_ORDER,
  getPersonaHint,
  isExtremeScore,
  type Persona,
} from "@/lib/persona-hints";

const PERSONAS: Persona[] = [
  "nisa-tsumitate",
  "short-term-trader",
  "fire-long-term",
];

describe("persona-hints", () => {
  describe("データ完全性", () => {
    it("全ペルソナ × 全温度帯のヒントが存在する", () => {
      const expectedLevels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
      for (const p of PERSONAS) {
        for (const level of expectedLevels) {
          const h = PERSONA_HINTS[p][level as keyof (typeof PERSONA_HINTS)[typeof p]];
          expect(h, `${p} × ${level}`).toBeDefined();
          expect(h.headline.length, `${p} × ${level} headline`).toBeGreaterThan(0);
          expect(h.body.length, `${p} × ${level} body`).toBeGreaterThan(0);
        }
      }
    });

    it("PERSONA_ORDER に 3 ペルソナが含まれる", () => {
      expect(PERSONA_ORDER).toHaveLength(3);
      for (const p of PERSONAS) {
        expect(PERSONA_ORDER).toContain(p);
      }
    });

    it("PERSONA_META の slug が /guide/[slug] と一致する", () => {
      expect(PERSONA_META["nisa-tsumitate"].slug).toBe("nisa-tsumitate");
      expect(PERSONA_META["short-term-trader"].slug).toBe("short-term-trader");
      expect(PERSONA_META["fire-long-term"].slug).toBe("fire-long-term");
    });
  });

  describe("getPersonaHint", () => {
    it.each(PERSONAS)("%s: スコア 10 は極寒のヒント", (p) => {
      expect(getPersonaHint(p, 10)).toBe(PERSONA_HINTS[p]["極寒"]);
    });

    it.each(PERSONAS)("%s: スコア 50 は平温のヒント", (p) => {
      expect(getPersonaHint(p, 50)).toBe(PERSONA_HINTS[p]["平温"]);
    });

    it.each(PERSONAS)("%s: スコア 90 は沸騰のヒント", (p) => {
      expect(getPersonaHint(p, 90)).toBe(PERSONA_HINTS[p]["沸騰"]);
    });
  });

  describe("isExtremeScore", () => {
    it("スコア 10（極寒）は extreme", () => {
      expect(isExtremeScore(10)).toBe(true);
    });
    it("スコア 50（平温）は not extreme", () => {
      expect(isExtremeScore(50)).toBe(false);
    });
    it("スコア 70（過熱）は not extreme", () => {
      expect(isExtremeScore(70)).toBe(false);
    });
    it("スコア 90（沸騰）は extreme", () => {
      expect(isExtremeScore(90)).toBe(true);
    });
    it("境界値 20 は極寒扱い（extreme）", () => {
      expect(isExtremeScore(20)).toBe(true);
    });
    it("境界値 21 は冷え込み（not extreme）", () => {
      expect(isExtremeScore(21)).toBe(false);
    });
    it("境界値 80 は過熱（not extreme）", () => {
      expect(isExtremeScore(80)).toBe(false);
    });
    it("境界値 81 は沸騰（extreme）", () => {
      expect(isExtremeScore(81)).toBe(true);
    });
  });
});
