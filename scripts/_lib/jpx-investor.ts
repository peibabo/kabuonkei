/**
 * JPX 投資部門別売買状況（週次）取得ヘルパ
 *
 * 2026-10 下旬に JPX がファイル形式を変更:
 *   旧: stock_val_1_*.xls（市場別シート、主体ごとに縦持ち）
 *   新: stock_1_w_{開始YYYYMMDD}_{終了YYYYMMDD}.xlsx（1 シート、主体ごとに横持ち）
 * 毎週の取得（japan-market-data）は新形式の東証プライムを読む。
 * 旧形式は過去の推移（update-investor-flow-history.ts、年ごとの一覧ページ 00-00-archives-NN.html にある）にだけ使い、
 * 東証一部 → プライムの区分変更をまたいで比べられるよう、旧新どちらも二市場（東証・名証の合計）を読む。
 */

import type {
  InvestorTradingEntity,
  InvestorTradingWeek,
} from "../../src/lib/types/japan-market";
import * as XLSX from "xlsx";
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

/**
 * 新形式 xlsx から指定した市場の主体別差引（金額）を抽出。
 * market は市場の行の見出しに含まれる語（既定は東証プライム、過去の推移には「二市場」= 東証・名証の合計を使う）
 */
export function parseInvestorXlsx(
  buffer: Buffer,
  link: Pick<InvestorLink, "startDate" | "endDate">,
  market: "プライム" | "二市場" = "プライム"
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

  // 市場の行が株数、その次の行が金額。週コードは表の最初の市場（東証プライム）の行にだけ入っている
  const marketIdx = rows.findIndex((r) => String(r?.[1] ?? "").includes(market));
  if (marketIdx < 0) {
    console.warn(`  ${market}の行が見つかりません`);
    return null;
  }
  const valueRow = rows[marketIdx + 1];
  if (!valueRow || !String(valueRow[2] ?? "").includes("金額")) {
    console.warn(`  ${market}の金額行が見つかりません`);
    return null;
  }

  const primeRow = rows.find((r) => String(r?.[1] ?? "").includes("プライム"));
  const weekLabel = parseWeekCode(primeRow?.[0]);
  if (!weekLabel) {
    console.warn("  週コードをパースできません:", primeRow?.[0]);
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

// --- 旧形式（〜2026 年 9 月第 2 週）: 過去の推移の取得用 ---

/** 週次の過去ファイルの一覧ページ（00 が今年、01 が去年 … と年ごと） */
export function investorArchiveUrl(index: number): string {
  return `${JPX_INVESTOR_TYPE_URL}00-00-archives-${String(index).padStart(2, "0")}.html`;
}

/** 旧形式（stock_val_1_YYMMW.xls）の週次ファイルの URL を抽出（重複は除く） */
export function extractLegacyInvestorLinks(html: string): string[] {
  const regex = /href="([^"]*stock_val_1_\d{6}\.xls)"/g;
  const urls = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) urls.add(JPX_BASE + match[1]);
  return [...urls];
}

/** 週ラベルの日付範囲を ISO 日付に。範囲が年をまたぐ場合はラベルの月から年を決める */
export function parseLegacyWeekLabel(
  label: string
): { weekLabel: string; startDate: string; endDate: string } | null {
  const head = label.match(/(\d{4})年(\d{1,2})月第(\d)週/);
  const range = label.match(/\(\s*(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})\s*\)/);
  if (!head || !range) return null;
  const year = Number(head[1]);
  const month = Number(head[2]);
  // ラベルの月から半年以上離れた月は前の年（12 月 → 1 月第 1 週）か次の年（1 月 → 12 月第 5 週）
  const yearOf = (m: number) => (m - month > 6 ? year - 1 : month - m > 6 ? year + 1 : year);
  const iso = (m: number, d: number) =>
    `${yearOf(m)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  return {
    weekLabel: `${year}年${month}月第${head[3]}週`,
    startDate: iso(Number(range[1]), Number(range[2])),
    endDate: iso(Number(range[3]), Number(range[4])),
  };
}

/** 旧形式の行ラベル（全角スペース入り）→ 名前 */
const LEGACY_ENTITIES = [
  { label: "海外投資家", name: "海外投資家" },
  { label: "個　人", name: "個人" },
] as const;

/**
 * 当週の列。左側（列 3〜6）は前の週。見出しの「金額」はセル結合のため値より 1 列左（列 7）に入っている
 */
const LEGACY_VALUE_HEADER_COL = 7;
const LEGACY_VALUE_COL = 8;
const LEGACY_BALANCE_COL = 10;

/**
 * 旧形式 xls の「Tokyo & Nagoya」（東証・名証の合計）シートから、海外投資家と個人の当週の差引（金額）を抽出。
 * 差引は売越なら「売り」行、買越なら「買い」行に入っているので、買 − 売 で計算し、差引の欄とも照合する。
 */
export function parseLegacyInvestorXls(buffer: Buffer): InvestorTradingWeek | null {
  const wb = XLSX.read(buffer);
  const sheetName = wb.SheetNames.find((n) => n.includes("Nagoya"));
  if (!sheetName) {
    console.warn("  Tokyo & Nagoya のシートがありません:", wb.SheetNames.join(", "));
    return null;
  }
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });

  const week = parseLegacyWeekLabel(String(rows[3]?.[0] ?? ""));
  if (!week) {
    console.warn("  週ラベルをパースできません:", rows[3]?.[0]);
    return null;
  }
  const header = rows[11] ?? [];
  if (
    !String(header[LEGACY_VALUE_HEADER_COL] ?? "").includes("金額") ||
    !String(header[LEGACY_BALANCE_COL] ?? "").includes("差引")
  ) {
    console.warn("  当週の金額・差引きの列が想定と違います");
    return null;
  }

  const entities: InvestorTradingEntity[] = [];
  for (const { label, name } of LEGACY_ENTITIES) {
    const i = rows.findIndex((r) => String(r?.[0] ?? "") === label);
    if (i < 0 || String(rows[i]?.[1] ?? "") !== "売り" || String(rows[i + 1]?.[1] ?? "") !== "買い") {
      console.warn(`  ${name}の売り・買いの行が見つかりません`);
      return null;
    }
    const sell = parseNumberCell(rows[i][LEGACY_VALUE_COL]);
    const buy = parseNumberCell(rows[i + 1][LEGACY_VALUE_COL]);
    const balance =
      parseNumberCell(rows[i][LEGACY_BALANCE_COL]) + parseNumberCell(rows[i + 1][LEGACY_BALANCE_COL]);
    if (sell <= 0 || buy <= 0 || Math.abs(buy - sell - balance) > BALANCE_TOLERANCE) {
      console.warn(`  ${name}: 差引き（${balance}）が 買 − 売（${buy - sell}）と一致しません`);
      return null;
    }
    entities.push({ name, netAmount: senYenToOkuYen(buy - sell) });
  }
  return { ...week, entities };
}
