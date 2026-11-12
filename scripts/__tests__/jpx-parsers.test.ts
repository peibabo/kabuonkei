import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { extractInvestorLinks, parseInvestorXlsx } from "../_lib/jpx-investor";
import { extractWeeklyMarginLinks, parseWeeklyMarginXls } from "../_lib/jpx-margin";
import { extractArbitrageLinks, parseArbitrageXls } from "../_lib/jpx-arbitrage";
import { extractListedFileUrl, parseListedXlsx } from "../_lib/jpx-listed";

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
  it("*_mtcurrent.xlsx を日付降順で抽出する", () => {
    const html = `
      <a href="/m-att/20261030_mtcurrent.xlsx">x</a>
      <a href="/m-att/20261106_mtcurrent.xlsx">x</a>
      <a href="/m-att/20261106_mtcurrent.pdf">x</a>`;
    expect(extractWeeklyMarginLinks(html)).toEqual([
      { url: "https://www.jpx.co.jp/m-att/20261106_mtcurrent.xlsx", date: "2026-11-06" },
      { url: "https://www.jpx.co.jp/m-att/20261030_mtcurrent.xlsx", date: "2026-10-30" },
    ]);
  });
});

describe("parseWeeklyMarginXls", () => {
  it("「信用取引残高合計」の金額行（二市場）から売残・買残を取る", () => {
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

  it("該当行がなければ null", () => {
    expect(parseWeeklyMarginXls(toXlsxBuffer([[null, "foo"]]), "2026-11-06")).toBeNull();
  });
});

describe("extractArbitrageLinks", () => {
  it("YYMMDD.xls を日付降順で抽出する", () => {
    const html = `
      <a href="/p-att/261106.xls">x</a>
      <a href="/p-att/261109.xls">x</a>
      <a href="/p-att/261109.pdf">x</a>`;
    expect(extractArbitrageLinks(html)).toEqual([
      { url: "https://www.jpx.co.jp/p-att/261109.xls", date: "2026-11-09" },
      { url: "https://www.jpx.co.jp/p-att/261106.xls", date: "2026-11-06" },
    ]);
  });
});

describe("parseArbitrageXls", () => {
  it("現物ポジション見出し後の株数行から売残 col 6 / 買残 col 12 を百万株で返す", () => {
    const position: unknown[] = Array(13).fill(null);
    position[1] = "株　　数";
    position[6] = 4512;
    position[12] = 786034;
    const rows: unknown[][] = [
      [null, "１．裁定取引に係る売買状況"],
      [null, "株　　数", null, null, null, null, 1, null, null, null, null, null, 2],
      [null, "２．裁定取引に係る現物ポジション"],
      position,
    ];
    expect(parseArbitrageXls(toXlsxBuffer(rows), "2026-11-09")).toEqual({
      date: "2026-11-09",
      buyBalance: 786,
      sellBalance: 4.5,
    });
  });

  it("見出しがなければ null", () => {
    expect(parseArbitrageXls(toXlsxBuffer([[null, "株　　数"]]), "2026-11-09")).toBeNull();
  });
});

describe("jpx-listed", () => {
  it("01.html から data_j.xlsx の URL を抽出する", () => {
    expect(
      extractListedFileUrl('<a href="/markets/statistics-equities/misc/x-att/data_j.xlsx">x</a>')
    ).toBe("https://www.jpx.co.jp/markets/statistics-equities/misc/x-att/data_j.xlsx");
    expect(extractListedFileUrl("<a href='/foo.xlsx'>")).toBeNull();
  });

  it("コード・銘柄名（NFKC）・33業種を返し、ETF 等の業種 '-' は除く", () => {
    const rows: unknown[][] = [
      ["日付", "コード", "銘柄名", "市場・商品区分", "33業種コード", "33業種区分"],
      [20261031, 4689, "ＬＩＮＥヤフー", "プライム（内国株式）", 5250, "情報・通信業"],
      [20261031, "285A", "キオクシアホールディングス", "プライム（内国株式）", 3650, "電気機器"],
      [20261031, 1305, "ｉＦｒｅｅＥＴＦ", "ETF・ETN", "-", "-"],
    ];
    const m = parseListedXlsx(toXlsxBuffer(rows));
    expect([...m.values()]).toEqual([
      { code: "4689", name: "LINEヤフー", sector33: "情報・通信業" },
      { code: "285A", name: "キオクシアホールディングス", sector33: "電気機器" },
    ]);
  });

  it("見出しが想定と違えば空", () => {
    expect(parseListedXlsx(toXlsxBuffer([["a", "b", "c"]])).size).toBe(0);
  });
});
