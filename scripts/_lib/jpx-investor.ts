/**
 * JPX 投資部門別売買状況（週次）取得ヘルパ
 *
 * 2026-10 下旬に JPX がファイル形式を変更:
 *   旧: stock_val_1_*.xls（市場別シート、主体ごとに縦持ち）
 *   新: stock_1_w_{開始YYYYMMDD}_{終了YYYYMMDD}.xlsx（1 シート、主体ごとに横持ち）
 * 旧形式のファイルは investor-type ページから消えているため新形式のみ対応する。
 */

import type {
  InvestorTradingEntity,
  InvestorTradingWeek,
} from "../../src/lib/types/japan-market";
import { JPX_BASE, digitsToIso, firstSheetRows, parseNumberCell } from "./jpx-common";
import { round1 } from "./shared";

export const JPX_INVESTOR_TYPE_URL = `${JPX_BASE}/markets/statistics-equities/investor-type/`;

export interface InvestorLink {
  url: string;
  startDate: string;
  endDate: string;
}

/** investor-type ページから週次 xlsx の URL と期間を抽出（終了日降順） */
export function extractInvestorLinks(html: string): InvestorLink[] {
  const regex = /href="([^"]*stock_1_w_(\d{8})_(\d{8})\.xlsx)"/g;
  const links: InvestorLink[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    links.push({
      url: JPX_BASE + match[1],
      startDate: digitsToIso(match[2]),
      endDate: digitsToIso(match[3]),
    });
  }
  links.sort((a, b) => b.endDate.localeCompare(a.endDate));
  return links;
}

/** 千円 → 億円（小数第1位） */
function senYenToOkuYen(senYen: number): number {
  return round1(senYen / 100_000);
}

/**
 * 横持ちレイアウトの列定義。各区分は「売 / 買 / 差引 / 合計」の 4 列で、
 * col は区分見出しが入っている列（= 売の列）。差引は col + 2。
 * 海外投資家は「法人」「個人」、個人は「現金」「信用」に分かれているので合算する。
 * labels は、その列の見出し行のどこかに含まれているはずの語。読む前にすべて検証する。
 */
interface EntityColumn {
  col: number;
  labels: string[];
}

const ENTITY_COLUMNS: { name: string; columns: EntityColumn[] }[] = [
  {
    name: "海外投資家",
    columns: [
      { col: 19, labels: ["海外投資家", "法人"] },
      { col: 23, labels: ["個人"] },
    ],
  },
  {
    name: "個人",
    columns: [
      { col: 11, labels: ["個人", "現金"] },
      { col: 15, labels: ["信用"] },
    ],
  },
  { name: "信託銀行", columns: [{ col: 51, labels: ["信託銀行"] }] },
  { name: "投資信託", columns: [{ col: 31, labels: ["投資信託"] }] },
  { name: "事業法人", columns: [{ col: 35, labels: ["事業法人"] }] },
];

const HEADER_ROWS = 7;
/** 差引 = 買 − 売 の照合で許容する誤差（千円）。丸めの差だけを吸収する */
const BALANCE_TOLERANCE = 1;

function headerContains(rows: unknown[][], col: number, keyword: string): boolean {
  for (let i = 0; i < Math.min(HEADER_ROWS, rows.length); i++) {
    if (String(rows[i]?.[col] ?? "").includes(keyword)) return true;
  }
  return false;
}

/** "2026104" → "2026年10月第4週"（月は 1〜2 桁、週は 1 桁） */
function parseWeekCode(code: unknown): string | null {
  const m = String(code ?? "").trim().match(/^(\d{4})(\d{1,2})(\d)$/);
  if (!m) return null;
  return `${m[1]}年${parseInt(m[2])}月第${m[3]}週`;
}

/** 新形式 xlsx から東証プライムの主体別差引（金額）を抽出 */
export function parseInvestorXlsx(
  buffer: Buffer,
  link: Pick<InvestorLink, "startDate" | "endDate">
): InvestorTradingWeek | null {
  const rows = firstSheetRows(buffer);

  // 列配置が想定どおりか見出しで検証（レイアウト再変更の検知用）。
  // 合算する 2 列目以降と、差引の列（col + 2）の見出しも確かめる
  for (const { name, columns } of ENTITY_COLUMNS) {
    for (const { col, labels } of columns) {
      for (const label of labels) {
        if (!headerContains(rows, col, label)) {
          console.warn(`  ${name}: 見出し「${label}」が列 ${col} にありません`);
          return null;
        }
      }
      if (!headerContains(rows, col + 2, "差引")) {
        console.warn(`  ${name}: 列 ${col + 2} が「差引」ではありません`);
        return null;
      }
    }
  }

  // 「東証プライム」の行が株数、その次の行が金額
  const primeIdx = rows.findIndex((r) => String(r?.[1] ?? "").includes("プライム"));
  if (primeIdx < 0) {
    console.warn("  東証プライムの行が見つかりません");
    return null;
  }
  const valueRow = rows[primeIdx + 1];
  if (!valueRow || !String(valueRow[2] ?? "").includes("金額")) {
    console.warn("  東証プライムの金額行が見つかりません");
    return null;
  }

  const weekLabel = parseWeekCode(rows[primeIdx][0]);
  if (!weekLabel) {
    console.warn("  週コードをパースできません:", rows[primeIdx][0]);
    return null;
  }

  // 見出しが合っていても値の列だけずれることがあるため、差引 = 買 − 売 を数値でも照合する
  for (const { name, columns } of ENTITY_COLUMNS) {
    for (const { col } of columns) {
      const sell = parseNumberCell(valueRow[col]);
      const buy = parseNumberCell(valueRow[col + 1]);
      const balance = parseNumberCell(valueRow[col + 2]);
      if (Math.abs(buy - sell - balance) > BALANCE_TOLERANCE) {
        console.warn(
          `  ${name}: 列 ${col + 2} の差引（${balance}）が 買 − 売（${buy - sell}）と一致しません`
        );
        return null;
      }
    }
  }

  const entities: InvestorTradingEntity[] = ENTITY_COLUMNS.map(
    ({ name, columns }) => {
      const net = columns.reduce(
        (sum, { col }) => sum + parseNumberCell(valueRow[col + 2]),
        0
      );
      return { name, netAmount: senYenToOkuYen(net) };
    }
  );

  return {
    weekLabel,
    startDate: link.startDate,
    endDate: link.endDate,
    entities,
  };
}
