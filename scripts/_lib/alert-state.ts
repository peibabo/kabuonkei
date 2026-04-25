import type { AlertKind, AlertMarket, AlertVariant } from "../../src/lib/types";

export function variantOf(market: AlertMarket, kind: AlertKind): AlertVariant {
  return `${market}_${kind}` as AlertVariant;
}

/** 現在の JST 時刻を YYYY-MM-DD に丸める */
export function jstIsoDate(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/** "2026/04/24(金)" 形式のラベル */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
export function formatJstFullDateLabel(date: Date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const w = WEEKDAYS[jst.getUTCDay()];
  return `${y}/${m}/${d}(${w})`;
}
