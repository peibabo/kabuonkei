import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractInvestorLinks, parseInvestorXlsx } from "../_lib/jpx-investor";
import { extractWeeklyMarginLinks, parseWeeklyMarginXls } from "../_lib/jpx-margin";

function toXlsxBuffer(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** 2026-10 以降の投資部門別 xlsx を模した行（必要な見出しと東証プライムのみ） */
function investorRows(): unknown[][] {
  const width = 59;
  const header3: unknown[] = Array(width).fill(null);
  header3[11] = "個人 Individuals";
  header3[19] = "海外投資家 Foreigners ";
  const header4: unknown[] = Array(width).fill(null);
  header4[31] = "投資信託 Investment Trusts";
  header4[35] = "事業法人 Business Cos. ";
  const header5: unknown[] = Array(width).fill(null);
  header5[51] = "信託銀行 Trust BK";

  const shares: unknown[] = Array(width).fill(0);
  shares[0] = "2026104";
  shares[1] = "東証プライム\r\nTSE Prime Market";
  shares[2] = "株数 Shares";
  const value: unknown[] = Array(width).fill(0);
  value[2] = "金額 Value";
  value[13] = -144374174; // 個人 現金
  value[17] = 136518274; // 個人 信用
  value[21] = 207814267; // 海外 法人
  value[25] = -1502618; // 海外 個人
  value[33] = -240496828; // 投資信託
  value[37] = -99340029; // 事業法人
  value[53] = -293051283; // 信託銀行

  return [
    ["投資部門別 株式売買状況 Stocks by Investor Type"],
    [],
    [],
    header3,
    header4,
    header5,
    ["年月週 Year, Month, Week"],
    shares,
    value,
  ];
}

describe("extractInvestorLinks", () => {
  it("stock_1_w_*.xlsx を終了日降順で抽出し、テンプレートリンクは除外する", () => {
    const html = `
      <a href="/a-att/stock_1_w_20261019_20261023.xlsx">x</a>
      <a href="/b-att/stock_1_w_20261026_20261030.xlsx">x</a>
      <a href="/b-att/stock_1_w_20261026_20261030.pdf">x</a>
      <a href="/c-att/stock_1_w_YYYYMMDD_YYYYMMDD.xlsx">x</a>`;
    expect(extractInvestorLinks(html)).toEqual([
      {
        url: "https://www.jpx.co.jp/b-att/stock_1_w_20261026_20261030.xlsx",
        startDate: "2026-10-26",
        endDate: "2026-10-30",
      },
      {
        url: "https://www.jpx.co.jp/a-att/stock_1_w_20261019_20261023.xlsx",
        startDate: "2026-10-19",
        endDate: "2026-10-23",
      },
    ]);
  });
});

describe("parseInvestorXlsx", () => {
  it("東証プライムの差引を主体別に億円で返す（海外=法人+個人, 個人=現金+信用）", () => {
    const week = parseInvestorXlsx(toXlsxBuffer(investorRows()), {
      startDate: "2026-10-26",
      endDate: "2026-10-30",
    });
    expect(week).toEqual({
      weekLabel: "2026年10月第4週",
      startDate: "2026-10-26",
      endDate: "2026-10-30",
      entities: [
        { name: "海外投資家", netAmount: 2063.1 },
        { name: "個人", netAmount: -78.6 },
        { name: "信託銀行", netAmount: -2930.5 },
        { name: "投資信託", netAmount: -2405 },
        { name: "事業法人", netAmount: -993.4 },
      ],
    });
  });

  it("1 桁月の週コードも解釈できる", () => {
    const rows = investorRows();
    rows[7][0] = "202612";
    const week = parseInvestorXlsx(toXlsxBuffer(rows), {
      startDate: "2026-01-05",
      endDate: "2026-01-09",
    });
    expect(week?.weekLabel).toBe("2026年1月第2週");
  });

  it("列配置が変わったら null を返す", () => {
    const rows = investorRows();
    rows[3][19] = null;
    rows[3][20] = "海外投資家 Foreigners";
    const week = parseInvestorXlsx(toXlsxBuffer(rows), {
      startDate: "2026-10-26",
      endDate: "2026-10-30",
    });
    expect(week).toBeNull();
  });
});

describe("extractWeeklyMarginLinks", () => {
  it("新形式 *_mtcurrent.xlsx と旧形式 mtseisan*.xls の両方を抽出する", () => {
    const html = `
      <a href="/m-att/20261106_mtcurrent.xlsx">x</a>
      <a href="/m-att/20261106_mtcurrent.pdf">x</a>
      <a href="/m-att/mtseisan2026101600.xls">x</a>`;
    expect(extractWeeklyMarginLinks(html)).toEqual([
      { url: "https://www.jpx.co.jp/m-att/20261106_mtcurrent.xlsx", date: "2026-11-06" },
      { url: "https://www.jpx.co.jp/m-att/mtseisan2026101600.xls", date: "2026-10-16" },
    ]);
  });
});

describe("parseWeeklyMarginXls", () => {
  it("新形式は「信用取引残高合計」の金額行（二市場）から売残・買残を取る", () => {
    const rows: unknown[][] = [
      [null, 46332],
      [],
      [null, "制度信用取引残高", "自己", "株数Shs.", 1, 2, 3, 4],
      [null, "信用取引残高合計\nTotal Outstanding Margin Trading", null, "株数Shs.", 332419, -16812, 3460691, -194163],
      [null, null, null, "金額Val.", 613486, -30373, 5880994, -624893, 613484, -30372, 5877530, -624921],
    ];
    expect(parseWeeklyMarginXls(toXlsxBuffer(rows), "2026-11-06")).toEqual({
      date: "2026-11-06",
      buyBalance: 58809.9,
      sellBalance: 6134.9,
      ratio: 9.59,
    });
  });

  it("旧形式は「二市場計」の次行 col 11 / 13 から取る", () => {
    const value: unknown[] = Array(14).fill(null);
    value[11] = 795910;
    value[13] = 6645610;
    const rows: unknown[][] = [[null, "二市場計"], value];
    expect(parseWeeklyMarginXls(toXlsxBuffer(rows), "2026-09-11")).toEqual({
      date: "2026-09-11",
      buyBalance: 66456.1,
      sellBalance: 7959.1,
      ratio: 8.35,
    });
  });

  it("該当行がなければ null", () => {
    expect(parseWeeklyMarginXls(toXlsxBuffer([[null, "foo"]]), "2026-11-06")).toBeNull();
  });
});
