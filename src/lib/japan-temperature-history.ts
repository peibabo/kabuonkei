import simpleData from "@/data/japan-temperature-history.json";
import snapshotData from "@/data/japan-fg-snapshots.json";

export type JapanTempMethod = "simple2" | "full5";

/** 日本版温度スコアの1日分。method で由来を区別する。 */
export interface JapanTempPoint {
  date: string; // "YYYY-MM-DD"
  score: number; // 0-100
  method: JapanTempMethod;
  // method === "simple2" のみ
  c1?: number;
  c5?: number;
  nikkei?: number;
  usdjpy?: number;
  // method === "full5" のみ
  level?: string;
  availableCount?: number;
  components?: {
    nikkeiMa: number;
    foreignFlow: number;
    marginRatio: number;
    arbitrage: number;
    usdJpyMomentum: number;
  };
}

interface SimpleHistoryFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  method: "simple2";
  note: string;
  daily: Array<{
    date: string;
    score: number;
    c1?: number;
    c5?: number;
    nikkei?: number;
    usdjpy?: number;
  }>;
}

interface SnapshotFile {
  generatedAt: string;
  method: "full5";
  snapshots: Array<{
    date: string;
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
  }>;
}

/** 静的JSONから10年簡易版の時系列を取得 */
export function getSimpleHistory(): JapanTempPoint[] {
  const file = simpleData as SimpleHistoryFile;
  return file.daily.map((d) => ({
    date: d.date,
    score: d.score,
    method: "simple2",
    c1: d.c1,
    c5: d.c5,
    nikkei: d.nikkei,
    usdjpy: d.usdjpy,
  }));
}

/** 静的JSONから5要素フル版のスナップショット時系列を取得 */
export function getFullSnapshots(): JapanTempPoint[] {
  const file = snapshotData as SnapshotFile;
  return file.snapshots.map((s) => ({
    date: s.date,
    score: s.score,
    method: "full5",
    level: s.level,
    availableCount: s.availableCount,
    components: s.components,
  }));
}

/**
 * 簡易版とフル版スナップショットを統合。
 * 2つは別系列として描画されるため、同日付が両方にあっても両方残す。
 * 結果は日付昇順、method内でも昇順。
 */
export function mergeJapanTemperatureData(
  simple: JapanTempPoint[],
  snapshots: JapanTempPoint[]
): JapanTempPoint[] {
  const all = [...simple, ...snapshots];
  all.sort((a, b) => {
    const c = a.date.localeCompare(b.date);
    if (c !== 0) return c;
    // 同日ならフル版を後ろに（描画で上に重なる）
    return a.method === "full5" ? 1 : -1;
  });
  return all;
}

/**
 * 指定日数分だけ末尾を切り出す。
 * 日付ベース（カレンダー日数）で絞り込む。
 */
export function sliceByDays(
  points: JapanTempPoint[],
  days: number
): JapanTempPoint[] {
  if (points.length === 0) return [];
  const lastDate = points[points.length - 1].date;
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return points.filter((p) => p.date >= cutoffStr);
}

/**
 * 中心日 centerDate の前後 days 日（カレンダー日）に入るポイントを切り出す。
 * イベント詳細ページで「イベント前後 ±90日」の温度推移を描画するのに使う。
 * 中心日が履歴の先頭より前 / 末尾より後でも、重なる範囲があればその部分だけ返す。
 * `date: string` プロパティさえ持てば型は自由（日米両方の温度履歴で共有できるよう汎用化）。
 */
export function sliceByDaysAround<T extends { date: string }>(
  points: readonly T[],
  centerDate: string,
  days: number
): T[] {
  if (points.length === 0) return [];
  const center = new Date(centerDate);
  const start = new Date(center);
  start.setDate(center.getDate() - days);
  const end = new Date(center);
  end.setDate(center.getDate() + days);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  return points.filter((p) => p.date >= startStr && p.date <= endStr);
}
