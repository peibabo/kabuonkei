/**
 * 日本版市場温度スナップショットの追記ロジック（純粋関数）。
 * snapshot-japan-fear-greed.ts から I/O と分離してテスト可能にした。
 */

export interface SnapshotEntry {
  date: string; // "YYYY-MM-DD"
  score: number;
  level: string;
  availableCount: number;
  components: {
    nikkeiMa: number;
    foreignFlow: number;
    marginRatio: number;
    arbitrage: number;
    usdJpyMomentum: number;
  };
}

export interface SnapshotFile {
  generatedAt: string;
  method: "full5";
  snapshots: SnapshotEntry[];
}

/** 空のスナップショットファイル（初期化用） */
export function emptySnapshotFile(): SnapshotFile {
  return {
    generatedAt: new Date().toISOString(),
    method: "full5",
    snapshots: [],
  };
}

/**
 * 既存ファイルに新エントリを追加 or 上書き。
 * - 同一日付のエントリが既にあれば置換（手動再実行時に対応）
 * - 結果は日付昇順にソート
 * - generatedAt / method は書き換え後の値にリセット
 */
export function mergeSnapshotEntry(
  existing: SnapshotFile,
  entry: SnapshotEntry,
  now: Date = new Date()
): SnapshotFile {
  const snapshots = [...existing.snapshots];
  const existingIdx = snapshots.findIndex((s) => s.date === entry.date);
  if (existingIdx >= 0) {
    snapshots[existingIdx] = entry;
  } else {
    snapshots.push(entry);
  }
  snapshots.sort((a, b) => a.date.localeCompare(b.date));

  return {
    generatedAt: now.toISOString(),
    method: "full5",
    snapshots,
  };
}
