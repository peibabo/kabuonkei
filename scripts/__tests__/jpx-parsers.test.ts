import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  extractInvestorLinks,
  extractLegacyInvestorLinks,
  parseInvestorXlsx,
  parseLegacyInvestorXls,
  parseLegacyWeekLabel,
} from "../_lib/jpx-investor";
import {
  extractHistoryExcelUrls,
  extractWeeklyMarginLinks,
  parseHistoryMarginXls,
  parseWeeklyMarginXls,
} from "../_lib/jpx-margin";
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
  header4[11] = "現金取引 Cash";
  header4[15] = "信用取引 Margin";
  header4[19] = "法人 Institutions";
  header4[23] = "個人 Individuals";
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
  // 各区分は「売 / 買 / 差引 / 合計」。差引 = 買 − 売 になるよう売買を埋める
  const header6: unknown[] = Array(width).fill(null);
  header6[0] = "年月週 Year, Month, Week";
  for (const balanceCol of [13, 17, 21, 25, 33, 37, 53]) {
    header6[balanceCol - 2] = "売 Sales";
    header6[balanceCol - 1] = "買 Purchases";
    header6[balanceCol] = "差引 Balance";
    value[balanceCol - 2] = 1_000_000_000;
    value[balanceCol - 1] = 1_000_000_000 + (value[balanceCol] as number);
  }

  return [
    ["投資部門別 株式売買状況 Stocks by Investor Type"],
    [],
    [],
    header3,
    header4,
    header5,
    header6,
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

  it("合算する 2 列目の見出しが変わったら null を返す", () => {
    const rows = investorRows();
    rows[4][23] = "証券会社 Securities Cos."; // 海外投資家の「個人」列が別の区分に
    expect(
      parseInvestorXlsx(toXlsxBuffer(rows), { startDate: "2026-10-26", endDate: "2026-10-30" })
    ).toBeNull();
  });

  it("差引の列がずれていたら null を返す", () => {
    const rows = investorRows();
    rows[6][21] = "合計 Total";
    expect(
      parseInvestorXlsx(toXlsxBuffer(rows), { startDate: "2026-10-26", endDate: "2026-10-30" })
    ).toBeNull();
  });

  it("差引が 買 − 売 と一致しなければ null を返す", () => {
    const rows = investorRows();
    rows[8][53] = (rows[8][53] as number) + 5000; // 信託銀行の差引だけ食い違う
    expect(
      parseInvestorXlsx(toXlsxBuffer(rows), { startDate: "2026-10-26", endDate: "2026-10-30" })
    ).toBeNull();
  });
});

describe("parseInvestorXlsx（二市場）", () => {
  it("market に「二市場」を渡すと二市場の金額行を読み、週コードはプライムの行から取る", () => {
    const rows = investorRows();
    const shares2 = [...rows[7]];
    shares2[0] = null;
    shares2[1] = "二市場\r\nTokyo & Nagoya Markets";
    const value2 = [...rows[8]];
    // 海外 法人の差引だけ変える（買 − 売 も合わせる）
    value2[21] = 307814267;
    value2[20] = (value2[19] as number) + 307814267;
    rows.push(shares2, value2);
    const week = parseInvestorXlsx(
      toXlsxBuffer(rows),
      { startDate: "2026-10-26", endDate: "2026-10-30" },
      "二市場"
    );
    expect(week?.weekLabel).toBe("2026年10月第4週");
    expect(week?.entities[0]).toEqual({ name: "海外投資家", netAmount: 3063.1 });
  });
});

/** 旧形式（〜2026-09）の投資部門別 xls を模したブック（Tokyo & Nagoya シートのみ必要な行） */
function legacyInvestorBook(label = "2016年2月第1週 2016/2 week1  ( 2/1 - 2/5 )"): Buffer {
  const rows: unknown[][] = Array.from({ length: 35 }, () => []);
  rows[0] = ["投資部門別　株式売買状況　東証・名証　[金額]"];
  rows[3] = [label];
  rows[11] = [null, null, null, "金額 Value", null, "比率 Ratio", "差引き Balance", "金額 Value", null, "比率 Ratio", "差引き Balance"];
  // 個人: 買越 187,517,045 千円（差引きは「買い」行）
  rows[26] = ["個　人", "売り", "Sales", null, "1", "15.3", "-67,858,012", null, "2,215,534,065", "14.6", ""];
  rows[27] = ["Individuals", "買い", "Purchases", null, "1", "14.8", "", null, "2,403,051,110", "16.2", "187,517,045"];
  // 海外投資家: 売越 598,964,856 千円（差引きは「売り」行）
  rows[29] = ["海外投資家", "売り", "Sales", null, "1", "77.6", "-199,942,002", null, "11,775,404,168", "77.6", "-598,964,856"];
  rows[30] = ["Foreigners", "買い", "Purchases", null, "1", "76.1", "", null, "11,176,439,312", "75.2", ""];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["dummy"]]), "TSE 1st");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Tokyo & Nagoya");
  return XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer;
}

describe("parseLegacyWeekLabel", () => {
  it("通常の週", () => {
    expect(parseLegacyWeekLabel("2016年2月第1週 2016/2 week1  ( 2/1 - 2/5 )")).toEqual({
      weekLabel: "2016年2月第1週",
      startDate: "2016-02-01",
      endDate: "2016-02-05",
    });
  });

  it("1 月第 1 週が前の年の 12 月から始まる", () => {
    expect(parseLegacyWeekLabel("2025年1月第1週 2025/1 week1  ( 12/30 - 1/3 )")).toMatchObject({
      startDate: "2024-12-30",
      endDate: "2025-01-03",
    });
  });

  it("12 月最終週が次の年の 1 月に終わる", () => {
    expect(parseLegacyWeekLabel("2019年12月第5週 2019/12 week5  ( 12/30 - 1/3 )")).toMatchObject({
      startDate: "2019-12-30",
      endDate: "2020-01-03",
    });
  });
});

describe("parseLegacyInvestorXls", () => {
  it("Tokyo & Nagoya シートの当週の列から、海外投資家と個人の差引（買 − 売）を億円で返す", () => {
    expect(parseLegacyInvestorXls(legacyInvestorBook())).toEqual({
      weekLabel: "2016年2月第1週",
      startDate: "2016-02-01",
      endDate: "2016-02-05",
      entities: [
        { name: "海外投資家", netAmount: -5989.6 },
        { name: "個人", netAmount: 1875.2 },
      ],
    });
  });

  it("Tokyo & Nagoya のシートがなければ null", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["x"]]), "TSE 1st");
    expect(parseLegacyInvestorXls(XLSX.write(wb, { type: "buffer", bookType: "xls" }) as Buffer)).toBeNull();
  });

  it("週ラベルが読めなければ null", () => {
    expect(parseLegacyInvestorXls(legacyInvestorBook("投資部門別"))).toBeNull();
  });
});

describe("extractLegacyInvestorLinks", () => {
  it("stock_val_1_YYMMW.xls だけを重複なく抽出する（月次・PDF は除く）", () => {
    const html = `
      <a href="/a-att/stock_val_1_260902.xls">x</a>
      <a href="/a-att/stock_val_1_260902.xls">x</a>
      <a href="/a-att/stock_val_1_260902.pdf">x</a>
      <a href="/b-att/stock_val_1_m2601.xls">x</a>`;
    expect(extractLegacyInvestorLinks(html)).toEqual([
      "https://www.jpx.co.jp/a-att/stock_val_1_260902.xls",
    ]);
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

describe("extractHistoryExcelUrls", () => {
  const base = "/markets/statistics-equities/margin/tvdivq0000001rq1-att";

  it("05.html から旧形式 (_mtsk.xls) と新形式 (.xlsx) の URL を取り出す", () => {
    const html = `
      <th>信用取引現在高</th>
      <a href="${base}/tvdivq0000015969.xlsx" rel="external">
      <a href="${base}/tvdivq0000015980.pdf" rel="external">
      <th>信用取引現在高（一般信用取引・制度信用取引別）</th>
      <a href="${base}/20260925_mtgk.xls" rel="external">
      <th>信用取引現在高</th>
      <a href="${base}/20260925_mtsk.xls" rel="external">`;
    expect(extractHistoryExcelUrls(html)).toEqual({
      legacy: `https://www.jpx.co.jp${base}/20260925_mtsk.xls`,
      current: `https://www.jpx.co.jp${base}/tvdivq0000015969.xlsx`,
    });
  });

  it("一般信用・制度信用別 (_mtgk.xls) や週次ファイルは拾わない", () => {
    const html = `
      <a href="${base}/20260925_mtgk.xls">
      <a href="/markets/statistics-equities/margin/x-att/20261106_mtcurrent.xlsx">`;
    expect(extractHistoryExcelUrls(html)).toEqual({ legacy: null, current: null });
  });
});

describe("parseHistoryMarginXls", () => {
  /** 2026-09-25 = Excel シリアル 46290 */
  const SERIAL = 46290;

  it("旧形式: 合計ブロックが col 9 から始まる", () => {
    const header = ["月日", "委託 Customers' Account", null, null, null, "自己 Members' Account", null, null, null, "合計   Total"];
    const row: unknown[] = new Array(22).fill(0);
    row[0] = SERIAL;
    row[10] = 884460; // 売残 金額（百万円）
    row[12] = 6455990; // 買残 金額（百万円）
    const weeks = parseHistoryMarginXls(toXlsxBuffer([["信用取引現在高"], header, row]));
    expect(weeks).toEqual([
      { date: "2026-09-25", buyBalance: 64559.9, sellBalance: 8844.6, ratio: 7.3 },
    ]);
  });

  it("新形式: 一般信用の列が増えて合計ブロックが col 13 にずれても合計を読む", () => {
    const header: unknown[] = new Array(14).fill(null);
    header[0] = "月日";
    header[1] = "制度信用取引 Standardized Margin Trading";
    header[9] = "一般信用取引 Negotiable Margin Trading";
    header[13] = "合計 Total";
    const row: unknown[] = new Array(26).fill(0);
    row[0] = SERIAL;
    row[10] = 476220; // 一般信用 売残（旧形式で合計が入っていた列）
    row[12] = 2905644; // 一般信用 買残
    row[14] = 1047238; // 合計 売残 金額
    row[16] = 6463837; // 合計 買残 金額
    const weeks = parseHistoryMarginXls(toXlsxBuffer([["信用取引現在高"], header, row]));
    expect(weeks).toEqual([
      { date: "2026-09-25", buyBalance: 64638.4, sellBalance: 10472.4, ratio: 6.17 },
    ]);
  });

  it("ヘッダから合計の列を特定できなければ空配列（別の列を黙って読まない）", () => {
    const row: unknown[] = new Array(26).fill(100);
    row[0] = SERIAL;
    expect(parseHistoryMarginXls(toXlsxBuffer([["月日", "委託"], row]))).toEqual([]);
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
    expect([...m]).toEqual([
      ["4689", { name: "LINEヤフー", sector33: "情報・通信業" }],
      ["285A", { name: "キオクシアホールディングス", sector33: "電気機器" }],
    ]);
  });

  it("見出しが想定と違えば空", () => {
    expect(parseListedXlsx(toXlsxBuffer([["a", "b", "c"]])).size).toBe(0);
  });
});
