import { describe, it, expect } from "vitest";
import {
  formatJstFullDateLabel,
  jstIsoDate,
  missingSendEnv,
  pickFreshJpScore,
  variantOf,
} from "../_lib/alert-state";

describe("variantOf", () => {
  it("market + kind を variant 文字列に結合", () => {
    expect(variantOf("us", "cold")).toBe("us_cold");
    expect(variantOf("us", "hot")).toBe("us_hot");
    expect(variantOf("jp", "cold")).toBe("jp_cold");
    expect(variantOf("jp", "hot")).toBe("jp_hot");
  });
});

describe("jstIsoDate", () => {
  it("UTC 00:00 の直前でも JST では翌日扱い", () => {
    // 2026-04-23T23:00 UTC = 2026-04-24T08:00 JST
    const d = new Date(Date.UTC(2026, 3, 23, 23, 0, 0));
    expect(jstIsoDate(d)).toBe("2026-04-24");
  });

  it("UTC 正午は JST の同日 21 時", () => {
    const d = new Date(Date.UTC(2026, 3, 24, 12, 0, 0));
    expect(jstIsoDate(d)).toBe("2026-04-24");
  });
});

describe("pickFreshJpScore", () => {
  // 直近営業日（日経225 の最終取引日）
  const today = "2026-07-09";
  /** C1・C5 を指定してスナップショットを作る（総合スコアは別の値にしておく） */
  const snap = (date: string, nikkeiMa: number, usdJpyMomentum: number, score = 67) => ({
    date,
    score,
    components: { nikkeiMa, foreignFlow: 100, marginRatio: 100, arbitrage: 79, usdJpyMomentum },
  });

  it("最新エントリが直近営業日なら、株価ベース（C1・C5 の平均）を判定スコアとして採用", () => {
    const snapshots = [snap("2026-07-08", 60, 60, 68), snap(today, 30, 50, 67)];
    expect(pickFreshJpScore(snapshots, today)).toEqual({
      ok: true,
      score: 40,
      overallScore: 67,
    });
  });

  it("2026-11-06 の実値: 総合 65 でも判定スコアは 23", () => {
    const snapshots = [snap("2026-11-06", 7, 38, 65)];
    expect(pickFreshJpScore(snapshots, "2026-11-06")).toEqual({
      ok: true,
      score: 23,
      overallScore: 65,
    });
  });

  it("最新エントリが直近営業日より古ければ不採用（snapshot job 遅延/失敗の想定）", () => {
    const snapshots = [snap("2026-07-08", 60, 60)];
    const result = pickFreshJpScore(snapshots, today);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("2026-07-08");
      expect(result.reason).toContain("2026-07-09");
    }
  });

  it("翌日未明の実行でも、直近営業日（前日）のエントリなら採用", () => {
    // 呼び出し側は実行日ではなく日経225 の最終取引日を渡す
    const snapshots = [snap("2026-07-08", 70, 66, 68)];
    expect(pickFreshJpScore(snapshots, "2026-07-08")).toEqual({
      ok: true,
      score: 68,
      overallScore: 68,
    });
  });

  it("スコア 0 は有効値として採用（falsy 判定に巻き込まない）", () => {
    const snapshots = [snap(today, 0, 0, 0)];
    expect(pickFreshJpScore(snapshots, today)).toEqual({
      ok: true,
      score: 0,
      overallScore: 0,
    });
  });

  it("snapshots が空 / undefined なら不採用", () => {
    expect(pickFreshJpScore([], today).ok).toBe(false);
    expect(pickFreshJpScore(undefined, today).ok).toBe(false);
  });

  it("score が数値でない最新エントリは不採用", () => {
    const snapshots = [{ ...snap(today, 30, 50), score: "67" as unknown as number }];
    expect(pickFreshJpScore(snapshots, today).ok).toBe(false);
  });

  it("株価系の要素（C1・C5）が欠けた最新エントリは不採用（総合スコアで代用しない）", () => {
    expect(pickFreshJpScore([{ date: today, score: 15 }], today).ok).toBe(false);
    const result = pickFreshJpScore(
      [{ date: today, score: 15, components: { nikkeiMa: 10 } }],
      today
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("usdJpyMomentum");
  });
});

describe("missingSendEnv", () => {
  it("両方設定済みなら空配列", () => {
    expect(
      missingSendEnv({ RESEND_API_KEY: "re_x", RESEND_FROM_EMAIL: "alerts@kabuonkei.com" })
    ).toEqual([]);
  });

  it("未設定・空文字のキーを列挙する", () => {
    expect(missingSendEnv({ RESEND_API_KEY: "re_x" })).toEqual(["RESEND_FROM_EMAIL"]);
    expect(missingSendEnv({ RESEND_API_KEY: "re_x", RESEND_FROM_EMAIL: "" })).toEqual([
      "RESEND_FROM_EMAIL",
    ]);
    expect(missingSendEnv({})).toEqual(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]);
  });
});

describe("formatJstFullDateLabel", () => {
  it("YYYY/MM/DD(曜) 形式", () => {
    // 2026-04-24 金曜日
    const d = new Date(Date.UTC(2026, 3, 24, 0, 0, 0));
    expect(formatJstFullDateLabel(d)).toBe("2026/04/24(金)");
  });

  it("JST 日付境界を跨ぐ UTC 時刻でも JST の日付を返す", () => {
    // 2026-04-23T23:00 UTC = 2026-04-24T08:00 JST
    const d = new Date(Date.UTC(2026, 3, 23, 23, 0, 0));
    expect(formatJstFullDateLabel(d)).toBe("2026/04/24(金)");
  });
});
