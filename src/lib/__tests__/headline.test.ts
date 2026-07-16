import { describe, it, expect } from "vitest";
import {
  buildHeroCopy,
  getHeadlineStateKey,
  pickHeadlineVariant,
  resolveNearBoundary,
  HEADLINE_POOLS,
  NEAR_POOLS,
  type HeadlineStateKey,
  type NearBoundaryKey,
} from "../headline";

// 各レベルの中心スコア
const COLD_X = 10;
const COLD = 30;
const NEUTRAL = 50;
const HOT = 70;
const HOT_X = 90;

/** レベル組み合わせ → 期待する状態キー（v1 の 25 パターン決定木と同一の写像） */
const STATE_CASES: Array<{ jp: number | null; us: number; key: HeadlineStateKey }> = [
  { jp: HOT_X, us: HOT_X, key: "both-boiling" },
  { jp: HOT, us: HOT, key: "both-hot" },
  { jp: NEUTRAL, us: NEUTRAL, key: "both-neutral" },
  { jp: COLD, us: COLD, key: "both-cold" },
  { jp: COLD_X, us: COLD_X, key: "both-frozen" },
  { jp: HOT_X, us: NEUTRAL, key: "jp-boiling-solo" },
  { jp: HOT_X, us: COLD_X, key: "jp-boiling-solo" }, // 沸騰は極寒より先に判定
  { jp: NEUTRAL, us: HOT_X, key: "us-boiling-solo" },
  { jp: COLD_X, us: NEUTRAL, key: "jp-frozen-solo" },
  { jp: NEUTRAL, us: COLD_X, key: "us-frozen-solo" },
  { jp: HOT, us: COLD, key: "twist-jp-hot" },
  { jp: COLD, us: HOT, key: "twist-us-hot" },
  { jp: HOT, us: NEUTRAL, key: "jp-hot-solo" },
  { jp: NEUTRAL, us: HOT, key: "us-hot-solo" },
  { jp: COLD, us: NEUTRAL, key: "jp-cold-solo" },
  { jp: NEUTRAL, us: COLD, key: "us-cold-solo" },
  { jp: null, us: NEUTRAL, key: "us-only" },
];

import { getSentimentLevel } from "../sentiment";

function stateKeyOf(jp: number | null, us: number): HeadlineStateKey {
  return getHeadlineStateKey(
    jp != null ? getSentimentLevel(jp) : null,
    getSentimentLevel(us),
  );
}

describe("getHeadlineStateKey - 状態キー判定", () => {
  for (const c of STATE_CASES) {
    it(`JP ${c.jp ?? "null"} × US ${c.us} → ${c.key}`, () => {
      expect(stateKeyOf(c.jp, c.us)).toBe(c.key);
    });
  }
});

describe("buildHeroCopy - 主見出しはプール候補から選ばれる", () => {
  for (const c of STATE_CASES) {
    if (c.key === "us-only") continue;
    it(`${c.key} の headline は base プールのいずれか（Δ0・streak なし）`, () => {
      const pool = HEADLINE_POOLS[c.key as keyof typeof HEADLINE_POOLS];
      // 全 dayNumber で base 候補内に収まることを確認
      for (let day = 0; day < pool.base.length * 2; day++) {
        const r = buildHeroCopy(
          { jp: c.jp, us: c.us, jpDelta: 0, usDelta: 0 },
          { dayNumber: day },
        );
        expect(pool.base).toContain(r.headline);
      }
    });
  }
});

describe("buildHeroCopy - 日付ローテーション", () => {
  const inputs = { jp: HOT_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 };

  it("同一 dayNumber なら常に同一文言（リロード安全）", () => {
    const a = buildHeroCopy(inputs, { dayNumber: 20643 }).headline;
    const b = buildHeroCopy(inputs, { dayNumber: 20643 }).headline;
    expect(a).toBe(b);
  });

  it("連続する dayNumber で文言が変わる", () => {
    const a = buildHeroCopy(inputs, { dayNumber: 100 }).headline;
    const b = buildHeroCopy(inputs, { dayNumber: 101 }).headline;
    expect(a).not.toBe(b);
  });

  it("プール長日でプール全文言が一巡する", () => {
    const pool = HEADLINE_POOLS["jp-boiling-solo"].base;
    const seen = new Set<string>();
    for (let day = 0; day < pool.length; day++) {
      seen.add(buildHeroCopy(inputs, { dayNumber: day }).headline);
    }
    expect(seen.size).toBe(pool.length);
  });

  it("dayNumber 省略時は 0 として決定的", () => {
    const a = buildHeroCopy(inputs).headline;
    const b = buildHeroCopy(inputs, { dayNumber: 0 }).headline;
    expect(a).toBe(b);
  });
});

describe("buildHeroCopy - トレンド候補", () => {
  const pool = HEADLINE_POOLS["jp-boiling-solo"];

  function collectHeadlines(jpDelta: number, days: number): Set<string> {
    const seen = new Set<string>();
    for (let day = 0; day < days; day++) {
      seen.add(
        buildHeroCopy(
          { jp: HOT_X, us: NEUTRAL, jpDelta, usDelta: 0 },
          { dayNumber: day },
        ).headline,
      );
    }
    return seen;
  }

  it("jpDelta >= +5 のとき up 候補が出現し得る", () => {
    const seen = collectHeadlines(6, 30);
    expect(pool.up!.some((h) => seen.has(h))).toBe(true);
  });

  it("jpDelta <= -5 のとき down 候補が出現し得る", () => {
    const seen = collectHeadlines(-6, 30);
    expect(pool.down!.some((h) => seen.has(h))).toBe(true);
  });

  it("|Δ| < 5 では up/down 候補が混ざらない", () => {
    const seen = collectHeadlines(3, 30);
    for (const h of [...pool.up!, ...pool.down!]) {
      expect(seen.has(h)).toBe(false);
    }
  });

  it("both 系は日米が同方向のときのみトレンド候補が混ざる", () => {
    const bothPool = HEADLINE_POOLS["both-hot"];
    // 逆方向 → base のみ
    for (let day = 0; day < 30; day++) {
      const r = buildHeroCopy(
        { jp: HOT, us: HOT, jpDelta: 6, usDelta: -6 },
        { dayNumber: day },
      );
      expect(bothPool.base).toContain(r.headline);
    }
    // 同方向 up → up 候補が出現し得る
    const seen = new Set<string>();
    for (let day = 0; day < 30; day++) {
      seen.add(
        buildHeroCopy(
          { jp: HOT, us: HOT, jpDelta: 6, usDelta: 7 },
          { dayNumber: day },
        ).headline,
      );
    }
    expect(bothPool.up!.some((h) => seen.has(h))).toBe(true);
  });
});

describe("buildHeroCopy - streak 候補", () => {
  it("jpStreak >= 3 で「N日目」を含む文言が出現し得る", () => {
    const seen = new Set<string>();
    for (let day = 0; day < 30; day++) {
      seen.add(
        buildHeroCopy(
          { jp: HOT_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 },
          { dayNumber: day, jpStreak: 5 },
        ).headline,
      );
    }
    expect([...seen].some((h) => h.includes("5日"))).toBe(true);
  });

  it("jpStreak 未指定なら streak 文言は出ない", () => {
    for (let day = 0; day < 30; day++) {
      const r = buildHeroCopy(
        { jp: HOT_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 },
        { dayNumber: day },
      );
      expect(r.headline).not.toMatch(/日目|日続く/);
    }
  });

  it("jpStreak = 2（閾値未満）でも streak 文言は出ない", () => {
    for (let day = 0; day < 30; day++) {
      const r = buildHeroCopy(
        { jp: HOT_X, us: NEUTRAL, jpDelta: 0, usDelta: 0 },
        { dayNumber: day, jpStreak: 2 },
      );
      expect(r.headline).not.toMatch(/日目|日続く/);
    }
  });
});

describe("resolveNearBoundary", () => {
  const CASES: Array<{
    jp: number; us: number; key: NearBoundaryKey; hi: "日本" | "米国";
  }> = [
    { jp: 75, us: 81, key: "boiling-hot", hi: "米国" },
    { jp: 85, us: 78, key: "boiling-hot", hi: "日本" },
    { jp: 61, us: 60, key: "hot-neutral", hi: "日本" },
    { jp: 55, us: 62, key: "hot-neutral", hi: "米国" },
    { jp: 38, us: 45, key: "neutral-cold", hi: "米国" },
    { jp: 44, us: 39, key: "neutral-cold", hi: "日本" },
    { jp: 18, us: 25, key: "cold-frozen", hi: "米国" },
    { jp: 22, us: 15, key: "cold-frozen", hi: "日本" },
  ];
  for (const c of CASES) {
    it(`JP ${c.jp} × US ${c.us} → ${c.key}（高い側: ${c.hi}）`, () => {
      const r = resolveNearBoundary(c.jp, c.us);
      expect(r).not.toBeNull();
      expect(r!.key).toBe(c.key);
      expect(r!.hi).toBe(c.hi);
      expect(r!.lo).toBe(c.hi === "日本" ? "米国" : "日本");
    });
  }

  it("差がちょうど 10 は非該当", () => {
    expect(resolveNearBoundary(71, 81)).toBeNull();
  });

  it("レベルが同じなら差が小さくても null", () => {
    expect(resolveNearBoundary(75, 78)).toBeNull();
  });

  it("jp null → null", () => {
    expect(resolveNearBoundary(null, 81)).toBeNull();
  });
});

describe("buildHeroCopy - 接近オーバーライド", () => {
  function nearCandidates(key: NearBoundaryKey, hi: "日本" | "米国"): string[] {
    const lo = hi === "日本" ? "米国" : "日本";
    return NEAR_POOLS[key].map((fn) => fn(hi, lo));
  }

  it("JP 75 × US 81（差6）→ boiling-hot の接近見出し。「だけ」は出ない", () => {
    for (let day = 0; day < 6; day++) {
      const r = buildHeroCopy(
        { jp: 75, us: 81, jpDelta: 0, usDelta: 0 },
        { dayNumber: day },
      );
      expect(nearCandidates("boiling-hot", "米国")).toContain(r.headline);
      expect(r.headline).not.toContain("だけ");
    }
  });

  it("JP 61 × US 60（差1）→ hot-neutral の接近見出し", () => {
    const r = buildHeroCopy({ jp: 61, us: 60, jpDelta: 0, usDelta: 0 });
    expect(nearCandidates("hot-neutral", "日本")).toContain(r.headline);
  });

  it("JP 70 × US 81（差11）→ 従来の us-boiling-solo プール", () => {
    for (let day = 0; day < 6; day++) {
      const r = buildHeroCopy(
        { jp: 70, us: 81, jpDelta: 0, usDelta: 0 },
        { dayNumber: day },
      );
      expect(HEADLINE_POOLS["us-boiling-solo"].base).toContain(r.headline);
    }
  });

  it("JP 75 × US 78（同レベル・差3）→ near にならず both-hot プール", () => {
    const r = buildHeroCopy({ jp: 75, us: 78, jpDelta: 0, usDelta: 0 });
    expect(HEADLINE_POOLS["both-hot"].base).toContain(r.headline);
  });

  it("接近見出しにも dayNumber ローテーションが効く", () => {
    const inputs = { jp: 75, us: 81, jpDelta: 0, usDelta: 0 };
    const a = buildHeroCopy(inputs, { dayNumber: 100 }).headline;
    const b = buildHeroCopy(inputs, { dayNumber: 101 }).headline;
    expect(a).not.toBe(b);
    // 同一日は同一文言
    expect(buildHeroCopy(inputs, { dayNumber: 100 }).headline).toBe(a);
  });

  it("接近時は streak・トレンド候補が混ざらない（near プールのみ）", () => {
    for (let day = 0; day < 10; day++) {
      const r = buildHeroCopy(
        { jp: 75, us: 81, jpDelta: 8, usDelta: 8 },
        { dayNumber: day, jpStreak: 18 },
      );
      expect(nearCandidates("boiling-hot", "米国")).toContain(r.headline);
    }
  });
});

describe("HEADLINE_POOLS - solo 文言の妥当性", () => {
  it("boiling-solo 系に相手側を「落ち着き」「静か」と断定する文言がない", () => {
    for (const key of ["jp-boiling-solo", "us-boiling-solo"] as const) {
      const pool = HEADLINE_POOLS[key];
      const all = [
        ...pool.base,
        ...(pool.up ?? []),
        ...(pool.down ?? []),
        ...(pool.streak ?? []).map((fn) => fn(5)),
      ];
      for (const text of all) {
        expect(text).not.toContain("落ち着き");
        expect(text).not.toContain("静か");
      }
    }
  });
});

describe("buildHeroCopy - サブテキスト（数値昨日比）", () => {
  it("スコア・レベル・符号付き前日比を含む", () => {
    const r = buildHeroCopy({ jp: 72, us: 55, jpDelta: 6, usDelta: -3 });
    expect(r.subline).toContain("日本 72°(過熱・前日比+6)");
    expect(r.subline).toContain("米国 55°(平温・前日比-3)");
  });

  it("変化ゼロは ±0 表記", () => {
    const r = buildHeroCopy({ jp: 50, us: 50, jpDelta: 0, usDelta: 0 });
    expect(r.subline).toContain("前日比±0");
  });

  it("jpDelta null → 日本側の前日比表記なし", () => {
    const r = buildHeroCopy({ jp: 50, us: 50, jpDelta: null, usDelta: 0 });
    expect(r.subline).toContain("日本 50°(平温)");
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
  it("jp が null → US 主体の見出し（バリエーションいずれか）", () => {
    for (let day = 0; day < 4; day++) {
      const r = buildHeroCopy(
        { jp: null, us: 60, jpDelta: null, usDelta: 0 },
        { dayNumber: day },
      );
      expect([
        "米国は 平温。日本データ取得待ち。",
        "米国の温度は 平温。日本分は集計中。",
      ]).toContain(r.headline);
    }
  });

  it("jp が null でもサブに US 表示は出る", () => {
    const r = buildHeroCopy({ jp: null, us: 70, jpDelta: null, usDelta: 0 });
    expect(r.subline).toContain("米国 70°");
  });
});

describe("pickHeadlineVariant", () => {
  it("空配列 → null", () => {
    expect(pickHeadlineVariant("both-hot", [], 5)).toBeNull();
  });

  it("負の dayNumber でも範囲内のインデックスを返す", () => {
    const candidates = ["a", "b", "c"];
    const picked = pickHeadlineVariant("both-hot", candidates, -7);
    expect(candidates).toContain(picked);
  });
});
