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
  const today = "2026-07-09";

  it("最新エントリが今日ならスコアを採用", () => {
    const snapshots = [
      { date: "2026-07-08", score: 68 },
      { date: "2026-07-09", score: 67 },
    ];
    expect(pickFreshJpScore(snapshots, today)).toEqual({ ok: true, score: 67 });
  });

  it("最新エントリが前日なら不採用（snapshot job 遅延/失敗の想定）", () => {
    const snapshots = [{ date: "2026-07-08", score: 68 }];
    const result = pickFreshJpScore(snapshots, today);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("2026-07-08");
      expect(result.reason).toContain("2026-07-09");
    }
  });

  it("スコア 0 は有効値として採用（falsy 判定に巻き込まない）", () => {
    const snapshots = [{ date: today, score: 0 }];
    expect(pickFreshJpScore(snapshots, today)).toEqual({ ok: true, score: 0 });
  });

  it("snapshots が空 / undefined なら不採用", () => {
    expect(pickFreshJpScore([], today).ok).toBe(false);
    expect(pickFreshJpScore(undefined, today).ok).toBe(false);
  });

  it("score が数値でない最新エントリは不採用", () => {
    const snapshots = [
      { date: today, score: "67" as unknown as number },
    ];
    expect(pickFreshJpScore(snapshots, today).ok).toBe(false);
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
