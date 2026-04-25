import { describe, it, expect } from "vitest";
import { buildHeroCopy } from "../headline";

describe("buildHeroCopy - 主見出し（25 パターン）", () => {
  // 各レベルの中心スコア
  const COLD_X = 10;
  const COLD = 30;
  const NEUTRAL = 50;
  const HOT = 70;
  const HOT_X = 90;

  it("両国とも沸騰 → 「二大市場、同時に沸騰。」", () => {
    expect(
      buildHeroCopy({ jp: HOT_X, us: HOT_X, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("二大市場、同時に沸騰。");
  });

  it("両国とも過熱 → 「日米そろって、過熱気味。」", () => {
    expect(
      buildHeroCopy({ jp: HOT, us: HOT, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日米そろって、過熱気味。");
  });

  it("両国とも平温 → 「日米とも、平温で凪。」", () => {
    expect(
      buildHeroCopy({ jp: NEUTRAL, us: NEUTRAL, jpDelta: 0, usDelta: 0 })
        .headline,
    ).toBe("日米とも、平温で凪。");
  });

  it("両国とも冷え込み → 「日米とも、冷え込み中。」", () => {
    expect(
      buildHeroCopy({ jp: COLD, us: COLD, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日米とも、冷え込み中。");
  });

  it("両国とも極寒 → 「世界が冷え切っている。」", () => {
    expect(
      buildHeroCopy({ jp: COLD_X, us: COLD_X, jpDelta: 0, usDelta: 0 })
        .headline,
    ).toBe("世界が冷え切っている。");
  });

  it("JP 沸騰 × US 平温 → 「日本だけ、沸騰している。」", () => {
    expect(
      buildHeroCopy({ jp: HOT_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 })
        .headline,
    ).toBe("日本だけ、沸騰している。");
  });

  it("US 沸騰 × JP 平温 → 「米国だけ、沸騰している。」", () => {
    expect(
      buildHeroCopy({ jp: NEUTRAL, us: HOT_X, jpDelta: 0, usDelta: 0 })
        .headline,
    ).toBe("米国だけ、沸騰している。");
  });

  it("JP 極寒 × US 平温 → 「日本だけ、凍えている。」", () => {
    expect(
      buildHeroCopy({ jp: COLD_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 })
        .headline,
    ).toBe("日本だけ、凍えている。");
  });

  it("JP 過熱 × US 平温 → 「日本だけが、熱い。」", () => {
    expect(
      buildHeroCopy({ jp: HOT, us: NEUTRAL, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日本だけが、熱い。");
  });

  it("US 過熱 × JP 平温 → 「米国だけが、熱い。」", () => {
    expect(
      buildHeroCopy({ jp: NEUTRAL, us: HOT, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("米国だけが、熱い。");
  });

  it("JP 冷え × US 平温 → 「日本だけが、冷えている。」", () => {
    expect(
      buildHeroCopy({ jp: COLD, us: NEUTRAL, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日本だけが、冷えている。");
  });

  it("JP 過熱 × US 冷え → 「日米でねじれ。」見出し", () => {
    expect(
      buildHeroCopy({ jp: HOT, us: COLD, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日米でねじれ。日本が熱く、米国が冷えている。");
  });

  it("JP 冷え × US 過熱 → 「日米でねじれ。」（米国が熱く）", () => {
    expect(
      buildHeroCopy({ jp: COLD, us: HOT, jpDelta: 0, usDelta: 0 }).headline,
    ).toBe("日米でねじれ。米国が熱く、日本が冷えている。");
  });
});

describe("buildHeroCopy - サブテキスト（昨日比方向）", () => {
  it("両国とも上昇 (Δ ≥ +5) → 動詞 2 つ", () => {
    const r = buildHeroCopy({ jp: 60, us: 55, jpDelta: 6, usDelta: 7 });
    expect(r.subline).toContain("日本は熱を強め");
    expect(r.subline).toContain("米国は熱を強め");
  });

  it("両国とも下降 (Δ ≤ -5) → 冷えた", () => {
    const r = buildHeroCopy({ jp: 50, us: 50, jpDelta: -6, usDelta: -8 });
    expect(r.subline).toContain("日本は冷え");
    expect(r.subline).toContain("米国は冷え");
  });

  it("変化が小さい (|Δ| < 5) → 動詞なし", () => {
    const r = buildHeroCopy({ jp: 50, us: 50, jpDelta: 1, usDelta: -2 });
    expect(r.subline).not.toContain("熱を強め");
    expect(r.subline).not.toContain("冷えた");
  });

  it("similarCount + winRate3m が与えられたらサブに含まれる", () => {
    const r = buildHeroCopy(
      { jp: 50, us: 50, jpDelta: 0, usDelta: 0 },
      { similarCount: 18, winRate3m: 61 },
    );
    expect(r.subline).toContain("過去 18 回");
    expect(r.subline).toContain("61%");
  });
});

describe("buildHeroCopy - CTA", () => {
  it("極端値なし → primary = similar-days, secondary = hints", () => {
    const r = buildHeroCopy({ jp: 50, us: 50, jpDelta: 0, usDelta: 0 });
    expect(r.ctaPrimary).toBe("similar-days");
    expect(r.ctaSecondary).toBe("hints");
  });

  it("US 沸騰 (≥80) → primary = alert", () => {
    const r = buildHeroCopy({ jp: 50, us: 85, jpDelta: 0, usDelta: 0 });
    expect(r.ctaPrimary).toBe("alert");
  });

  it("JP 極寒 (≤20) → primary = alert", () => {
    const r = buildHeroCopy({ jp: 15, us: 50, jpDelta: 0, usDelta: 0 });
    expect(r.ctaPrimary).toBe("alert");
  });

  it("US 沸騰時の secondary は similar-days", () => {
    const r = buildHeroCopy({ jp: 50, us: 90, jpDelta: 0, usDelta: 0 });
    expect(r.ctaSecondary).toBe("similar-days");
  });
});

describe("buildHeroCopy - JP データ欠損", () => {
  it("jp が null → US 主体の見出し", () => {
    const r = buildHeroCopy({ jp: null, us: 60, jpDelta: null, usDelta: 0 });
    expect(r.headline).toContain("米国は");
    expect(r.headline).toContain("日本データ取得待ち");
  });

  it("jp が null でもサブに US 表示は出る", () => {
    const r = buildHeroCopy({ jp: null, us: 70, jpDelta: null, usDelta: 0 });
    expect(r.subline).toContain("米国 70°");
  });
});
