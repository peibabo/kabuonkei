/**
 * JPX 裁定取引に係る現物ポジション（日次）取得ヘルパ
 */

import type { ArbitrageBalanceDay } from "../../src/lib/types/japan-market";
import { JPX_BASE, digitsToIso, firstSheetRows, parseNumberCell } from "./jpx-common";
import { round1 } from "./shared";

export const JPX_ARBITRAGE_URL = `${JPX_BASE}/markets/statistics-equities/program/index.html`;

/** program ページから裁定残 Excel（YYMMDD.xls）の URL と日付を抽出（日付降順） */
export function extractArbitrageLinks(html: string): { url: string; date: string }[] {
  const regex = /href="([^"]*\/(\d{6})\.xls)"/g;
  const links: { url: string; date: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    const yymmdd = match[2];
    const century = parseInt(yymmdd.slice(0, 2)) > 50 ? "19" : "20";
    links.push({ url: JPX_BASE + match[1], date: digitsToIso(century + yymmdd) });
  }
  links.sort((a, b) => b.date.localeCompare(a.date));
  return links;
}

/**
 * 裁定残 Excel をパース。
 * 「裁定取引に係る現物ポジション」見出しの後に最初に現れる「株数」行から
 * 売りポジション合計 (col 6) / 買いポジション合計 (col 12) を千株で取り、百万株に変換する。
 */
export function parseArbitrageXls(
  buffer: Buffer,
  date: string
): ArbitrageBalanceDay | null {
  const rows = firstSheetRows(buffer);

  const sectionIdx = rows.findIndex((r) =>
    String(r?.[1] ?? "").includes("裁定取引に係る現物ポジション")
  );
  if (sectionIdx < 0) return null;
  const positionRow = rows
    .slice(sectionIdx + 1)
    .find((r) => String(r?.[1] ?? "").includes("株"));
  if (!positionRow) return null;

  const sellBalance = parseNumberCell(positionRow[6]);
  const buyBalance = parseNumberCell(positionRow[12]);
  if (buyBalance === 0 && sellBalance === 0) return null;

  return {
    date,
    buyBalance: round1(buyBalance / 1_000),
    sellBalance: round1(sellBalance / 1_000),
  };
}
