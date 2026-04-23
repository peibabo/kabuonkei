/**
 * JPX 信用取引残高 (margin trading balance) 取得ヘルパ
 *
 * 2種類のソースをサポート:
 * 1. 週次 Excel ファイル (mtseisan{YYYYMMDD}00.xls) — 直近数週のみ
 * 2. 連結履歴 Excel (margin/06.html 経由 tvdivq00000*.xls) — 2002 年以降の全週次
 */

import * as XLSX from "xlsx";
import type { MarginTradingWeek } from "../../src/lib/types/japan-market";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const JPX_BASE = "https://www.jpx.co.jp";
export const JPX_MARGIN_WEEKLY_URL = `${JPX_BASE}/markets/statistics-equities/margin/04.html`;
export const JPX_MARGIN_HISTORY_URL = `${JPX_BASE}/markets/statistics-equities/margin/06.html`;

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

function parseNumberCell(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/▲/g, "-").trim();
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** 百万円 → 億円（小数第1位） */
function hyakumanYenToOkuYen(hyakumanYen: number): number {
  return Math.round((hyakumanYen / 100) * 10) / 10;
}

/** Excel シリアル日付 (1900-01-01 = 1) を ISO YYYY-MM-DD に変換 */
export function excelSerialToIso(serial: number): string {
  const epoch = Date.UTC(1899, 11, 30);
  const ms = epoch + serial * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

function computeRatio(buyOku: number, sellOku: number): number {
  return sellOku > 0 ? Math.round((buyOku / sellOku) * 100) / 100 : 0;
}

// --- 週次 (mtseisan*.xls) ---

/** 04.html から mtseisan*.xls URL と 申込日を抽出 */
export function extractWeeklyMarginLinks(
  html: string
): { url: string; date: string }[] {
  const regex = /href="([^"]*mtseisan(\d{10})\.xls)"/g;
  const links: { url: string; date: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const digits = match[2];
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    const dd = digits.slice(6, 8);
    links.push({
      url: JPX_BASE + match[1],
      date: `${yyyy}-${mm}-${dd}`,
    });
  }
  links.sort((a, b) => b.date.localeCompare(a.date));
  return links;
}

/** 単週の Excel をパースし MarginTradingWeek を返す */
export function parseWeeklyMarginXls(
  buffer: Buffer,
  date: string
): MarginTradingWeek | null {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  let valueRow: unknown[] | null = null;
  for (let i = 0; i < rows.length; i++) {
    const cellStr = String(rows[i]?.[1] ?? "");
    if (cellStr.includes("二市場計")) {
      if (i + 1 < rows.length) valueRow = rows[i + 1];
      break;
    }
  }
  if (!valueRow) return null;

  const sellBalance = parseNumberCell(valueRow[11]);
  const buyBalance = parseNumberCell(valueRow[13]);
  if (buyBalance === 0 && sellBalance === 0) return null;

  const sellOku = hyakumanYenToOkuYen(sellBalance);
  const buyOku = hyakumanYenToOkuYen(buyBalance);
  return {
    date,
    buyBalance: buyOku,
    sellBalance: sellOku,
    ratio: computeRatio(buyOku, sellOku),
  };
}

// --- 連結履歴 (06.html) ---

/**
 * 06.html から「信用取引現在高」本体の Excel URL を動的に抽出。
 * 2本 (合計 / 一般信用・制度信用別) あるので「信用取引現在高」本体を第2位置から取得。
 * JPX のページ構造に依存するため、失敗時は null を返す。
 */
export function extractHistoryExcelUrl(html: string): string | null {
  // "信用取引現在高" を含む th と、その後の .xls リンクをペアで探す
  // 簡易実装: <th>...信用取引現在高</th> 以降で最初に出る xls リンクを採用
  // ただし一般信用取引・制度信用取引別の方が先に出るので、
  // 2 つの .xls を取得して 2 番目 (= 合計) を使う
  const linkRe = /href="([^"]*\/margin\/[^"]*\.xls)"/g;
  const links: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (url.includes("/mtseisan")) continue; // 週次ファイルは除外
    links.push(JPX_BASE + url);
  }
  if (links.length < 2) return null;
  return links[1]; // 2 番目が合計
}

/**
 * 連結履歴 Excel をパース。
 * 列仕様 (row index 0-based):
 *   col 0: Excel シリアル日付 (申込日 = 金曜)
 *   col 9: 合計 売残 株数 (千株)
 *   col 10: 合計 売残 金額 (百万円) ← sellBalance
 *   col 11: 合計 買残 株数 (千株)
 *   col 12: 合計 買残 金額 (百万円) ← buyBalance
 * データ行は「数値の col 0 (30000 <= serial <= 60000)」で識別。
 */
export function parseHistoryMarginXls(buffer: Buffer): MarginTradingWeek[] {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const out: MarginTradingWeek[] = [];
  for (const row of rows) {
    const serial = row?.[0];
    if (typeof serial !== "number" || serial < 30000 || serial > 60000) continue;
    const sellMan = parseNumberCell(row[10]);
    const buyMan = parseNumberCell(row[12]);
    if (sellMan <= 0 && buyMan <= 0) continue;
    const sellOku = hyakumanYenToOkuYen(sellMan);
    const buyOku = hyakumanYenToOkuYen(buyMan);
    out.push({
      date: excelSerialToIso(serial),
      buyBalance: buyOku,
      sellBalance: sellOku,
      ratio: computeRatio(buyOku, sellOku),
    });
  }
  return out;
}
