/** 温度差の表示: +3 / -2 / ±0 / —（null） */
export function formatScoreDiff(diff: number | null): string {
  if (diff == null) return "—";
  if (diff === 0) return "±0";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/** "2026-11-12" → "2026年11月12日"（year: false で "11月12日"） */
export function formatJaDate(iso: string, opts: { year?: boolean } = {}): string {
  const [y, m, d] = iso.split("-").map(Number);
  const md = `${m}月${d}日`;
  return opts.year === false ? md : `${y}年${md}`;
}

/** ISO 日時 → "2026年11月12日 18:39"（JST） */
export function formatJaDateTimeJst(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${formatJaDate(jst.toISOString().slice(0, 10))} ${hh}:${mm}`;
}
