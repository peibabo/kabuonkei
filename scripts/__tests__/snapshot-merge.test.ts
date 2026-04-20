import { describe, it, expect } from "vitest";
import {
  emptySnapshotFile,
  mergeSnapshotEntry,
  type SnapshotEntry,
  type SnapshotFile,
} from "../_lib/snapshot-merge";

function makeEntry(date: string, score = 50): SnapshotEntry {
  return {
    date,
    score,
    level: "平温",
    availableCount: 5,
    components: {
      nikkeiMa: 50,
      foreignFlow: 50,
      marginRatio: 50,
      arbitrage: 50,
      usdJpyMomentum: 50,
    },
  };
}

describe("mergeSnapshotEntry", () => {
  it("空ファイルに初回エントリを追加できる", () => {
    const base = emptySnapshotFile();
    const entry = makeEntry("2026-04-20");
    const merged = mergeSnapshotEntry(base, entry);
    expect(merged.snapshots).toHaveLength(1);
    expect(merged.snapshots[0].date).toBe("2026-04-20");
    expect(merged.method).toBe("full5");
  });

  it("新規日付は追加される（昇順ソート）", () => {
    const base: SnapshotFile = {
      generatedAt: "2026-04-18T08:00:00Z",
      method: "full5",
      snapshots: [makeEntry("2026-04-18", 40), makeEntry("2026-04-19", 45)],
    };
    const merged = mergeSnapshotEntry(base, makeEntry("2026-04-20", 55));
    expect(merged.snapshots).toHaveLength(3);
    expect(merged.snapshots.map((s) => s.date)).toEqual([
      "2026-04-18",
      "2026-04-19",
      "2026-04-20",
    ]);
  });

  it("同一日付のエントリは上書きされ、件数は変わらない", () => {
    const base: SnapshotFile = {
      generatedAt: "2026-04-18T08:00:00Z",
      method: "full5",
      snapshots: [makeEntry("2026-04-19", 40), makeEntry("2026-04-20", 45)],
    };
    const replacement = makeEntry("2026-04-20", 80);
    replacement.level = "過熱";
    const merged = mergeSnapshotEntry(base, replacement);
    expect(merged.snapshots).toHaveLength(2);
    const updated = merged.snapshots.find((s) => s.date === "2026-04-20");
    expect(updated?.score).toBe(80);
    expect(updated?.level).toBe("過熱");
  });

  it("挿入後は日付昇順で並ぶ（途中日付の追加）", () => {
    const base: SnapshotFile = {
      generatedAt: "2026-04-18T08:00:00Z",
      method: "full5",
      snapshots: [makeEntry("2026-04-10"), makeEntry("2026-04-20")],
    };
    const merged = mergeSnapshotEntry(base, makeEntry("2026-04-15"));
    expect(merged.snapshots.map((s) => s.date)).toEqual([
      "2026-04-10",
      "2026-04-15",
      "2026-04-20",
    ]);
  });

  it("generatedAt は引数の now で上書きされる", () => {
    const base = emptySnapshotFile();
    const fixedNow = new Date("2026-04-20T10:00:00Z");
    const merged = mergeSnapshotEntry(
      base,
      makeEntry("2026-04-20"),
      fixedNow
    );
    expect(merged.generatedAt).toBe(fixedNow.toISOString());
  });

  it("元の入力配列は変更されない（イミュータブル）", () => {
    const originalEntries = [makeEntry("2026-04-18"), makeEntry("2026-04-19")];
    const base: SnapshotFile = {
      generatedAt: "2026-04-18T08:00:00Z",
      method: "full5",
      snapshots: originalEntries,
    };
    mergeSnapshotEntry(base, makeEntry("2026-04-20"));
    expect(originalEntries).toHaveLength(2);
    expect(base.snapshots).toBe(originalEntries);
  });
});
