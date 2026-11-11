/**
 * JPX 統計ページ取得・Excel パースの共通ヘルパ。
 * jpx-investor / jpx-margin / jpx-arbitrage から利用する。
 */

import * as XLSX from "xlsx";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const JPX_BASE = "https://www.jpx.co.jp";

export async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/** 先頭シートを行配列（ヘッダーなし）で返す */
export function firstSheetRows(buffer: Buffer): unknown[][] {
  const wb = XLSX.read(buffer);
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
}

/** 数値セルをパース（カンマ除去、▲ はマイナス扱い）。数値化できなければ 0 */
export function parseNumberCell(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/▲/g, "-").trim();
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** "20261030" → "2026-10-30" */
export function digitsToIso(yyyymmdd: string): string {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}
