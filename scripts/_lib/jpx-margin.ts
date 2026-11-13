/**
 * JPX 信用取引残高 (margin trading balance) 取得ヘルパ
 *
 * 2種類のソースをサポート:
 * 1. 週次 Excel ファイル ({YYYYMMDD}_mtcurrent.xlsx、2026-10 下旬〜) — 直近数週のみ
 * 2. 連結履歴 Excel (margin/05.html「信用取引現在高過去推移表」経由) — 2002 年以降の全週次
 *    - 旧形式 `{YYYYMMDD}_mtsk.xls`: 2002-08 〜 2026-09-18 申込分（更新終了）
 *    - 新形式 `tvdivq*.xlsx`: 2026-09-25 申込分以降（一般信用・制度信用別の列が追加された）
 */

import type { MarginTradingWeek } from "../../src/lib/types/japan-market";
import { JPX_BASE, digitsToIso, firstSheetRows, parseNumberCell } from "./jpx-common";
import { round1 } from "./shared";

export const JPX_MARGIN_WEEKLY_URL = `${JPX_BASE}/markets/statistics-equities/margin/04.html`;
export const JPX_MARGIN_HISTORY_URL = `${JPX_BASE}/markets/statistics-equities/margin/05.html`;

/** 百万円 → 億円（小数第1位） */
function hyakumanYenToOkuYen(hyakumanYen: number): number {
  return round1(hyakumanYen / 100);
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

// --- 週次 (*_mtcurrent.xlsx) ---

/** 04.html から週次ファイル URL と申込日を抽出（日付降順） */
export function extractWeeklyMarginLinks(
  html: string
): { url: string; date: string }[] {
  const regex = /href="([^"]*\/(\d{8})_mtcurrent\.xlsx)"/g;
  const links: { url: string; date: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    links.push({ url: JPX_BASE + match[1], date: digitsToIso(match[2]) });
  }
  links.sort((a, b) => b.date.localeCompare(a.date));
  return links;
}

/**
 * 単週の Excel をパースし MarginTradingWeek を返す。
 * 「信用取引残高合計」行の次 (金額, 百万円) 行の二市場 col 4 = 売残 / col 6 = 買残 を使う。
 */
export function parseWeeklyMarginXls(
  buffer: Buffer,
  date: string
): MarginTradingWeek | null {
  const rows = firstSheetRows(buffer);
  const totalIdx = rows.findIndex((r) =>
    String(r?.[1] ?? "").includes("信用取引残高合計")
  );
  const valueRow = totalIdx >= 0 ? rows[totalIdx + 1] : undefined;
  if (!valueRow || !String(valueRow[3] ?? "").includes("金額")) return null;

  const sellBalance = parseNumberCell(valueRow[4]);
  const buyBalance = parseNumberCell(valueRow[6]);
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

// --- 連結履歴 (05.html) ---

export interface HistoryExcelUrls {
  /** 旧形式の連結履歴（〜2026-09-18 申込分）。`*_mtsk.xls` */
  legacy: string | null;
  /** 新形式の連結履歴（2026-09-25 申込分〜）。ページ先頭の `.xlsx` */
  current: string | null;
}

/**
 * 05.html から連結履歴 Excel の URL を抽出する。
 *
 * ページには 3 本のファイルが並ぶ:
 *   - 信用取引現在高（新形式 .xlsx、毎週追記される）
 *   - 信用取引現在高（一般信用取引・制度信用取引別）`*_mtgk.xls` ← 使わない
 *   - 信用取引現在高 `*_mtsk.xls`（旧形式、2026-09-18 申込分で更新終了）
 * JPX のページ構造に依存するため、見つからないものは null を返す。
 */
export function extractHistoryExcelUrls(html: string): HistoryExcelUrls {
  const linkRe = /href="([^"]*\/margin\/[^"]*\.xlsx?)"/g;
  let legacy: string | null = null;
  let current: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const url = m[1];
    if (/_mtsk\.xls$/.test(url)) {
      legacy ??= JPX_BASE + url;
    } else if (url.endsWith(".xlsx") && !url.includes("_mtcurrent")) {
      current ??= JPX_BASE + url;
    }
  }
  return { legacy, current };
}

/**
 * ヘッダ行から「合計」ブロックの開始列を探す。
 * 旧形式は col 9、新形式（一般信用の列が増えた）は col 13。見つからなければ null。
 */
function findTotalColumn(rows: unknown[][]): number | null {
  for (const row of rows.slice(0, 10)) {
    if (!row) continue;
    for (let i = 1; i < row.length; i++) {
      const cell = String(row[i] ?? "");
      if (cell.startsWith("合計") && /Total/i.test(cell)) return i;
    }
  }
  return null;
}

/**
 * 連結履歴 Excel をパース（旧形式・新形式の両対応）。
 * 「合計 Total」ブロックの並びは共通で、開始列を t とすると:
 *   col 0: Excel シリアル日付 (申込日 = 金曜)
 *   col t: 合計 売残 株数 (千株)
 *   col t+1: 合計 売残 金額 (百万円) ← sellBalance
 *   col t+2: 合計 買残 株数 (千株)
 *   col t+3: 合計 買残 金額 (百万円) ← buyBalance
 * 旧形式は t=9、新形式は t=13。ヘッダから t を特定できない場合は
 * 別の列を黙って読まないよう空配列を返す。
 * データ行は「数値の col 0 (30000 <= serial <= 60000)」で識別。
 */
export function parseHistoryMarginXls(buffer: Buffer): MarginTradingWeek[] {
  const rows = firstSheetRows(buffer);
  const totalCol = findTotalColumn(rows);
  if (totalCol == null) return [];

  const out: MarginTradingWeek[] = [];
  for (const row of rows) {
    const serial = row?.[0];
    if (typeof serial !== "number" || serial < 30000 || serial > 60000) continue;
    const sellMan = parseNumberCell(row[totalCol + 1]);
    const buyMan = parseNumberCell(row[totalCol + 3]);
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
