/**
 * JPX「東証上場銘柄一覧」(data_j.xlsx、月次更新) 取得ヘルパ。
 * 銘柄名と東証33業種を得るために使う。
 */

import { JPX_BASE, firstSheetRows } from "./jpx-common";

export const JPX_LISTED_URL = `${JPX_BASE}/markets/statistics-equities/misc/01.html`;

export interface ListedIssue {
  code: string;
  name: string;
  sector33: string;
}

/** 01.html から data_j.xls(x) の URL を抽出 */
export function extractListedFileUrl(html: string): string | null {
  const m = html.match(/href="([^"]*\/data_j\.xlsx?)"/);
  return m ? JPX_BASE + m[1] : null;
}

/**
 * 列: 0 日付 / 1 コード / 2 銘柄名 / 3 市場・商品区分 / 4 33業種コード / 5 33業種区分 ...
 * 見出しで列位置を検証し、ずれていれば空 Map を返す。
 * 銘柄名は全角英数を NFKC で半角に寄せる（"ＬＩＮＥヤフー" → "LINEヤフー"）。
 */
export function parseListedXlsx(buffer: Buffer): Map<string, ListedIssue> {
  const rows = firstSheetRows(buffer);
  const out = new Map<string, ListedIssue>();
  const header = rows[0] ?? [];
  if (header[1] !== "コード" || header[2] !== "銘柄名" || header[5] !== "33業種区分") {
    return out;
  }
  for (const row of rows.slice(1)) {
    const code = String(row?.[1] ?? "").trim();
    const sector33 = String(row?.[5] ?? "").trim();
    if (!code || !sector33 || sector33 === "-") continue;
    out.set(code, {
      code,
      name: String(row[2] ?? "").normalize("NFKC").trim(),
      sector33,
    });
  }
  return out;
}
