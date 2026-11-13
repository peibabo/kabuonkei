/** 温度差の表示: +3 / -2 / ±0 / —（null） */
export function formatScoreDiff(diff: number | null): string {
  if (diff == null) return "—";
  if (diff === 0) return "±0";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/**
 * 温度差の符号に応じた文字色クラス（日本式: 上昇=赤 / 低下=緑、format.ts の
 * returnColorClass と同じ色）。変化なし・null はグレー
 */
export function scoreDiffColorClass(diff: number | null): string {
  if (diff == null || diff === 0) return "text-gray-500";
  return diff > 0 ? "text-red-500" : "text-green-500";
}

/** "2026-11-12" → "2026年11月12日"（year: false で "11月12日"） */
export function formatJaDate(iso: string, opts: { year?: boolean } = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  const md = `${m}月${d}日`;
  return opts.year === false ? md : `${y}年${md}`;
}
