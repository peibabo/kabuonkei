import { describe, it, expect } from "vitest";
import { computeJapanLevelStreak } from "../level-streak";

const TODAY = "2026-07-16"; // 木曜

function snap(date: string, score: number) {
  return { date, score };
}

describe("computeJapanLevelStreak", () => {
  it("同レベル3連続 + 当日同レベル → 4", () => {
    const result = computeJapanLevelStreak({
      currentScore: 72, // 過熱
      snapshots: [
        snap("2026-07-13", 65),
        snap("2026-07-14", 70),
        snap("2026-07-15", 77),
      ], // すべて過熱
      todayJstKey: TODAY,
    });
    expect(result).toBe(4);
  });

  it("直近でレベルが変わった → 1（当日のみ）", () => {
    const result = computeJapanLevelStreak({
      currentScore: 85, // 沸騰
      snapshots: [snap("2026-07-14", 75), snap("2026-07-15", 78)], // 過熱
      todayJstKey: TODAY,
    });
    expect(result).toBe(1);
  });

  it("途中でレベルが切れたらそこで止まる", () => {
    const result = computeJapanLevelStreak({
      currentScore: 72, // 過熱
      snapshots: [
        snap("2026-07-10", 55), // 平温
        snap("2026-07-13", 65), // 過熱
        snap("2026-07-14", 70), // 過熱
        snap("2026-07-15", 77), // 過熱
      ],
      todayJstKey: TODAY,
    });
    expect(result).toBe(4);
  });

  it("snapshots 空 → 1", () => {
    expect(
      computeJapanLevelStreak({ currentScore: 72, snapshots: [], todayJstKey: TODAY }),
    ).toBe(1);
  });

  it("currentScore null → null", () => {
    expect(
      computeJapanLevelStreak({
        currentScore: null,
        snapshots: [snap("2026-07-15", 77)],
        todayJstKey: TODAY,
      }),
    ).toBeNull();
  });

  it("当日日付のスナップショットは二重カウントしない（17:00 JST 以降の追記済みケース）", () => {
    const result = computeJapanLevelStreak({
      currentScore: 72,
      snapshots: [snap("2026-07-15", 70), snap("2026-07-16", 72)], // 当日分あり
      todayJstKey: TODAY,
    });
    expect(result).toBe(2); // 7/15 + 当日。当日スナップは数えない
  });

  it("直近スナップショットが maxGapDays 超で古い → 1", () => {
    const result = computeJapanLevelStreak({
      currentScore: 72,
      snapshots: [snap("2026-07-08", 70), snap("2026-07-09", 72)], // 7日前
      todayJstKey: TODAY,
    });
    expect(result).toBe(1);
  });

  it("週末ギャップ（金→月）は連続扱い", () => {
    const result = computeJapanLevelStreak({
      currentScore: 72, // 過熱、当日は月曜想定
      snapshots: [snap("2026-07-09", 70), snap("2026-07-10", 75)], // 木・金
      todayJstKey: "2026-07-13", // 月曜
      // 金曜 7/10 → 月曜 7/13 は 3 暦日差 ≤ 既定 4
    });
    expect(result).toBe(3);
  });

  it("レベル境界値: 80(過熱) と 81(沸騰) は別レベル", () => {
    const result = computeJapanLevelStreak({
      currentScore: 81, // 沸騰
      snapshots: [snap("2026-07-15", 80)], // 過熱
      todayJstKey: TODAY,
    });
    expect(result).toBe(1);
  });
});
