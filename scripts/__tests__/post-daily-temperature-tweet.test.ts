import { describe, it, expect } from "vitest";
import {
  buildTweetBody,
  estimateWeightedLength,
  findSimilarDays,
  formatJstDateLabel,
  shouldAttachImage,
  type TweetContext,
} from "../post-daily-temperature-tweet";
import type { SimilarDayEntry, SimilarDayMatch } from "../../src/lib/types";

const SITE_URL = "https://kabuonkei.com";

function ctx(overrides: Partial<TweetContext> = {}): TweetContext {
  return {
    dateLabel: "4/19(月)",
    japanScore: 58,
    usScore: 62,
    japanLevel: "平温",
    usLevel: "過熱",
    japanSimilar: null,
    usSimilar: null,
    siteUrl: SITE_URL,
    ...overrides,
  };
}

function makeMatch(partial: Partial<SimilarDayMatch> = {}): SimilarDayMatch {
  return {
    date: "2016-06-24",
    score: 57,
    return1m: 3.4,
    return3m: 11.0,
    return6m: 7.3,
    scoreDiff: 1,
    eventLabel: "Brexit翌日",
    ...partial,
  };
}

describe("buildTweetBody", () => {
  it("日米両方ありの通常ケース — 両方の行が出力される", () => {
    const text = buildTweetBody(
      ctx({
        japanScore: 58,
        japanLevel: "平温",
        usScore: 62,
        usLevel: "過熱",
        japanSimilar: makeMatch(),
      }),
    );
    expect(text).toContain("🌡 4/19(月) 寄り前チェック");
    expect(text).toContain("前営業日引け時点");
    expect(text).toContain("🇯🇵 58 平温 (中立)");
    expect(text).toContain("🇺🇸 62 過熱 (強気)");
    expect(text).toContain("📅 似た日: 2016-06-24 Brexit翌日 (57)");
    expect(text).toContain("1M +3.4% / 3M +11% / 6M +7.3%");
    expect(text).toContain(
      `▶ ${SITE_URL}?utm_source=x&utm_campaign=daily`,
    );
  });

  it("日本版 null のケース — 🇯🇵行はスキップされ 🇺🇸行のみ", () => {
    const text = buildTweetBody(
      ctx({
        japanScore: null,
        japanLevel: null,
        japanSimilar: null,
        usSimilar: makeMatch(),
      }),
    );
    expect(text).not.toContain("🇯🇵");
    expect(text).toContain("🇺🇸");
    // 類似日は US フォールバック
    expect(text).toContain("📅 似た日:");
  });

  it("米国版 null のケース — 🇺🇸行はスキップされ 🇯🇵行のみ", () => {
    const text = buildTweetBody(
      ctx({
        usScore: null,
        usLevel: null,
        japanSimilar: makeMatch(),
      }),
    );
    expect(text).toContain("🇯🇵");
    expect(text).not.toContain("🇺🇸");
  });

  it("類似日が両方 null のケース — 類似日行は出力されない", () => {
    const text = buildTweetBody(ctx());
    expect(text).not.toContain("📅 似た日:");
    expect(text).not.toContain("→ 1M");
  });

  it("極寒アラート（score ≤ 20）で先頭バッジが付く", () => {
    const text = buildTweetBody(
      ctx({ japanScore: 15, japanLevel: "極寒", usScore: 40, usLevel: "冷え込み" }),
    );
    expect(text.startsWith("⚠️ 極寒アラート 4/19(月) 寄り前")).toBe(true);
  });

  it("沸騰アラート（score ≥ 81）で先頭バッジが付く", () => {
    const text = buildTweetBody(
      ctx({ japanScore: 60, japanLevel: "過熱", usScore: 85, usLevel: "沸騰" }),
    );
    expect(text.startsWith("🔥 沸騰アラート 4/19(月) 寄り前")).toBe(true);
  });

  it("スコアちょうど 80 は温度計ゲージと同じ「過熱アラート」", () => {
    const text = buildTweetBody(
      ctx({ japanScore: 60, japanLevel: "過熱", usScore: 80, usLevel: "過熱" }),
    );
    expect(text.startsWith("🔥 過熱アラート 4/19(月) 寄り前")).toBe(true);
  });

  it("通常日は 🌡 プレフィックスで開始", () => {
    const text = buildTweetBody(ctx());
    expect(text.startsWith("🌡 4/19(月) 寄り前チェック")).toBe(true);
  });

  it("日本版類似日があれば US 類似日より優先される", () => {
    const japan = makeMatch({ date: "2020-01-01", eventLabel: undefined });
    const us = makeMatch({ date: "2019-12-31", eventLabel: "Event A" });
    const text = buildTweetBody(ctx({ japanSimilar: japan, usSimilar: us }));
    expect(text).toContain("2020-01-01");
    expect(text).not.toContain("2019-12-31");
  });

  it("加重文字数は 280 以内（典型的なペイロードで）", () => {
    const text = buildTweetBody(
      ctx({
        japanScore: 58,
        japanLevel: "平温",
        usScore: 62,
        usLevel: "過熱",
        japanSimilar: makeMatch(),
      }),
    );
    expect(estimateWeightedLength(text)).toBeLessThanOrEqual(280);
  });
});

describe("shouldAttachImage", () => {
  it("両方 null → false（日米とも欠損）", () => {
    expect(shouldAttachImage(null, null)).toBe(false);
  });
  it("日米とも中庸（通常日）→ true（毎日添付）", () => {
    expect(shouldAttachImage(50, 55)).toBe(true);
  });
  it("日本が極寒(20) → true", () => {
    expect(shouldAttachImage(20, 50)).toBe(true);
  });
  it("米国が沸騰(80) → true", () => {
    expect(shouldAttachImage(50, 80)).toBe(true);
  });
  it("日本のみ定義 → true", () => {
    expect(shouldAttachImage(74, null)).toBe(true);
  });
  it("米国のみ定義 → true", () => {
    expect(shouldAttachImage(null, 68)).toBe(true);
  });
});

describe("estimateWeightedLength", () => {
  it("ASCII は 1 文字 1 カウント", () => {
    expect(estimateWeightedLength("hello world")).toBe(11);
  });
  it("日本語は 1 文字 2 カウント", () => {
    expect(estimateWeightedLength("株温計")).toBe(6);
  });
  it("URL は常に 23", () => {
    expect(estimateWeightedLength("https://kabuonkei.com/")).toBe(23);
  });
  it("URL + テキスト混在", () => {
    expect(estimateWeightedLength("今日 https://kabuonkei.com/ 確認")).toBe(
      2 * 2 + 1 + 23 + 1 + 2 * 2,
    );
  });
});

describe("findSimilarDays (inline)", () => {
  const base = { return1m: 1.0, return3m: 2.0, return6m: 3.0 };

  it("return3m が null は除外", () => {
    const history: SimilarDayEntry[] = [
      { date: "2024-01-01", score: 50, return1m: 1, return3m: null, return6m: null },
      { date: "2023-01-01", score: 50, ...base },
    ];
    const result = findSimilarDays(50, history, {}, 5);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2023-01-01");
  });

  it("スコア差が小さい順に並ぶ", () => {
    const history: SimilarDayEntry[] = [
      { date: "2020-01-01", score: 80, ...base },
      { date: "2021-01-01", score: 55, ...base },
      { date: "2022-01-01", score: 50, ...base },
    ];
    const result = findSimilarDays(50, history, {}, 3);
    expect(result.map((r) => r.date)).toEqual([
      "2022-01-01",
      "2021-01-01",
      "2020-01-01",
    ]);
  });

  it("同率ならイベントラベル付きが優先", () => {
    const history: SimilarDayEntry[] = [
      { date: "2020-01-01", score: 50, ...base },
      { date: "2021-01-01", score: 50, ...base },
    ];
    const events = { "2020-01-01": "重要イベント" };
    const result = findSimilarDays(50, history, events, 2);
    expect(result[0].date).toBe("2020-01-01");
    expect(result[0].eventLabel).toBe("重要イベント");
  });
});

describe("formatJstDateLabel", () => {
  it("UTC 22:30 は JST では翌日 07:30", () => {
    // 2026-04-19 UTC 22:30 = 2026-04-20 JST 07:30（月曜）
    const d = new Date(Date.UTC(2026, 3, 19, 22, 30, 0));
    const label = formatJstDateLabel(d);
    // 2026-04-20 は月曜日
    expect(label).toBe("4/20(月)");
  });

  it("JST 深夜は正しい日付", () => {
    // 2026-04-19 UTC 15:30 = 2026-04-20 JST 00:30
    const d = new Date(Date.UTC(2026, 3, 19, 15, 30, 0));
    expect(formatJstDateLabel(d)).toBe("4/20(月)");
  });
});
