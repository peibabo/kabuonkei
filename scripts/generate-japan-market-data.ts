/**
 * 日本市場固有データ生成スクリプト
 *
 * JPXの公開データから以下を取得し、JSON化する:
 * 1. 投資部門別売買状況（週次Excel）
 * 2. 裁定取引に係る現物ポジション（日次Excel）
 *
 * 実行: npx tsx scripts/generate-japan-market-data.ts
 */

import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const JPX_BASE = "https://www.jpx.co.jp";
const INVESTOR_TYPE_URL = `${JPX_BASE}/markets/statistics-equities/investor-type/`;
const ARBITRAGE_URL = `${JPX_BASE}/markets/statistics-equities/program/index.html`;

const WEEKS_TO_FETCH = 12;
const ARBITRAGE_DAYS_TO_FETCH = 60; // 約12週分の営業日

// --- ユーティリティ ---

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.text();
}

/** 千円 → 億円に変換（小数第1位） */
function senYenToOkuYen(senYen: number): number {
  return Math.round((senYen / 100_000) * 10) / 10;
}

/** 千株 → 百万株に変換（小数第1位） */
function senKabuToHyakumanKabu(senKabu: number): number {
  return Math.round((senKabu / 1_000) * 10) / 10;
}

/** 数値文字列のカンマを除去してパース */
function parseNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").replace(/▲/g, "-").trim();
    const n = Number(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// --- 投資部門別売買状況 ---

interface InvestorTradingEntity {
  name: string;
  netAmount: number;
}

interface InvestorTradingWeek {
  weekLabel: string;
  startDate: string;
  endDate: string;
  entities: InvestorTradingEntity[];
}

/** HTMLからstock_val_1_*.xlsのURLを抽出 */
function extractInvestorLinks(html: string): string[] {
  const regex = /href="([^"]*stock_val_1_[^"]*\.xls)"/g;
  const links: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(JPX_BASE + match[1]);
  }
  return links;
}

/** 週ラベルから日付範囲を抽出: "2026年4月第2週 2026/4 week2  ( 4/6 - 4/10 )" */
function parseWeekLabel(
  row3: string
): { weekLabel: string; startDate: string; endDate: string } | null {
  // 年と月を抽出
  const yearMatch = row3.match(/(\d{4})年(\d{1,2})月第(\d)週/);
  if (!yearMatch) return null;
  const year = yearMatch[1];
  const month = yearMatch[2].padStart(2, "0");
  const weekNum = yearMatch[3];

  // 括弧内の日付範囲を抽出: ( 4/6 - 4/10 ) or ( 12/30 - 1/5 )
  const rangeMatch = row3.match(/\(\s*(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})\s*\)/);
  if (!rangeMatch) return null;

  const startMonth = rangeMatch[1].padStart(2, "0");
  const startDay = rangeMatch[2].padStart(2, "0");
  const endMonth = rangeMatch[3].padStart(2, "0");
  const endDay = rangeMatch[4].padStart(2, "0");

  // 年をまたぐ場合（12月→1月）の対応
  const startYear =
    parseInt(startMonth) > parseInt(month)
      ? String(parseInt(year) - 1)
      : year;
  const endYear =
    parseInt(endMonth) < parseInt(startMonth)
      ? String(parseInt(year) + 1)
      : startYear === year
        ? year
        : year;

  return {
    weekLabel: `${year}年${parseInt(month)}月第${weekNum}週`,
    startDate: `${startYear}-${startMonth}-${startDay}`,
    endDate: `${endYear}-${endMonth}-${endDay}`,
  };
}

/** Excelから投資主体別の差引きデータを抽出 */
function parseInvestorExcel(buffer: Buffer): InvestorTradingWeek | null {
  const wb = XLSX.read(buffer);
  // TSE Primeシートを使用（最も注目される市場）
  const sheetName =
    wb.SheetNames.find((n) => n.includes("Prime")) ?? wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Row3: 週ラベル
  const row3 = String(rows[3]?.[0] ?? "");
  const weekInfo = parseWeekLabel(row3);
  if (!weekInfo) {
    console.warn("  週ラベルをパースできません:", row3);
    return null;
  }

  // 投資主体ごとの差引きを抽出
  // 差引きは「当週」列（右側）のBalanceカラムから取得
  // パターン: 「売り」行のBalance列 or 「買い」行のBalance列に値がある
  const entities: InvestorTradingEntity[] = [];

  const targetEntities: { label: string; displayName: string }[] = [
    { label: "海外投資家", displayName: "海外投資家" },
    { label: "個　人", displayName: "個人" },
    { label: "信託銀行", displayName: "信託銀行" },
    { label: "投資信託", displayName: "投資信託" },
    { label: "事業法人", displayName: "事業法人" },
  ];

  for (const { label, displayName } of targetEntities) {
    // ラベルの行を探す
    let netAmount = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || String(row[0] ?? "") !== label) continue;

      // 「売り」行: row[i], 「買い」行: row[i+1]
      // 当週の差引きは右側 — index 10 にある
      const sellBalance = parseNumber(rows[i]?.[10]);
      const buyBalance = parseNumber(rows[i + 1]?.[10]);

      // 差引き: 売りBalanceがマイナス（売越）、買いBalanceがプラス（買越）
      // どちらかに値が入っている
      if (sellBalance !== 0) {
        netAmount = sellBalance; // 売越（負の値）
      } else if (buyBalance !== 0) {
        netAmount = buyBalance; // 買越（正の値）
      }
      break;
    }

    entities.push({
      name: displayName,
      netAmount: senYenToOkuYen(netAmount),
    });
  }

  return { ...weekInfo, entities };
}

// --- 裁定残 ---

interface ArbitrageBalanceDay {
  date: string;
  buyBalance: number;
  sellBalance: number;
}

/** HTMLから裁定取引Excelのリンクを抽出 */
function extractArbitrageLinks(html: string): { url: string; date: string }[] {
  // ファイル名パターン: YYMMDD.xls
  const regex = /href="([^"]*\/(\d{6})\.xls)"/g;
  const links: { url: string; date: string }[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const yymmdd = match[2];
    const yy = yymmdd.slice(0, 2);
    const mm = yymmdd.slice(2, 4);
    const dd = yymmdd.slice(4, 6);
    const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`;
    links.push({
      url: JPX_BASE + match[1],
      date: `${year}-${mm}-${dd}`,
    });
  }
  // 日付降順でソート
  links.sort((a, b) => b.date.localeCompare(a.date));
  return links;
}

/** 裁定残Excelをパース */
function parseArbitrageExcel(
  buffer: Buffer,
  date: string
): ArbitrageBalanceDay | null {
  const wb = XLSX.read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  // Row 8: "２．裁定取引に係る現物ポジション..."
  // Row 11: 株数行 — 売りポジション合計(index 6), 買いポジション合計(index 12)
  // まず「ポジション」セクションのヘッダー行を見つけ、その後の「株　　数」行を取得
  let positionRow: unknown[] | null = null;
  let foundPositionSection = false;
  for (let i = 0; i < rows.length; i++) {
    const cellStr = String(rows[i]?.[1] ?? "");
    if (cellStr.includes("裁定取引に係る現物ポジション")) {
      foundPositionSection = true;
      continue;
    }
    if (foundPositionSection && cellStr.includes("株")) {
      positionRow = rows[i];
      break;
    }
  }

  if (!positionRow) {
    console.warn(`  裁定残データが見つかりません: ${date}`);
    return null;
  }

  const sellBalance = parseNumber(positionRow[6]);
  const buyBalance = parseNumber(positionRow[12]);

  if (buyBalance === 0 && sellBalance === 0) {
    console.warn(`  裁定残が0です: ${date}`);
    return null;
  }

  return {
    date,
    buyBalance: senKabuToHyakumanKabu(buyBalance),
    sellBalance: senKabuToHyakumanKabu(sellBalance),
  };
}

// --- メイン ---

async function main() {
  console.log("=== 日本市場データ生成 ===\n");

  // --- 投資部門別売買状況 ---
  console.log("■ 投資部門別売買状況の取得...");
  const investorHtml = await fetchText(INVESTOR_TYPE_URL);
  const investorLinks = extractInvestorLinks(investorHtml);
  console.log(`  ${investorLinks.length} 件のリンクを検出`);

  const weeks: InvestorTradingWeek[] = [];
  const linksToFetch = investorLinks.slice(0, WEEKS_TO_FETCH);

  for (const url of linksToFetch) {
    try {
      console.log(`  取得中: ${url.split("/").pop()}`);
      const buf = await fetchBuffer(url);
      const week = parseInvestorExcel(buf);
      if (week) {
        weeks.push(week);
        console.log(`    → ${week.weekLabel} (${week.startDate}〜${week.endDate})`);
      }
    } catch (err) {
      console.warn(`  スキップ: ${err}`);
    }
    await sleep(1000);
  }

  // 日付昇順にソート
  weeks.sort((a, b) => a.startDate.localeCompare(b.startDate));

  console.log(`  合計 ${weeks.length} 週分取得\n`);

  // --- 裁定残 ---
  console.log("■ 裁定残の取得...");
  const arbitrageHtml = await fetchText(ARBITRAGE_URL);
  const arbitrageLinks = extractArbitrageLinks(arbitrageHtml);
  console.log(`  ${arbitrageLinks.length} 件のリンクを検出`);

  const daily: ArbitrageBalanceDay[] = [];
  const arbLinksToFetch = arbitrageLinks.slice(0, ARBITRAGE_DAYS_TO_FETCH);

  for (const { url, date } of arbLinksToFetch) {
    try {
      console.log(`  取得中: ${url.split("/").pop()} (${date})`);
      const buf = await fetchBuffer(url);
      const day = parseArbitrageExcel(buf, date);
      if (day) {
        daily.push(day);
      }
    } catch (err) {
      console.warn(`  スキップ: ${err}`);
    }
    await sleep(500);
  }

  // 日付昇順にソート
  daily.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`  合計 ${daily.length} 日分取得\n`);

  // --- JSON出力 ---
  const output = {
    investorTrading: {
      generatedAt: new Date().toISOString().split("T")[0],
      weeks,
    },
    arbitrageBalance: {
      generatedAt: new Date().toISOString().split("T")[0],
      daily,
    },
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "japan-market-data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`✅ 生成完了: ${outPath}`);

  // サマリー
  console.log("\n--- サマリー ---");
  if (weeks.length > 0) {
    const latest = weeks[weeks.length - 1];
    console.log(`投資主体別 最新: ${latest.weekLabel}`);
    for (const e of latest.entities) {
      const sign = e.netAmount >= 0 ? "+" : "";
      console.log(`  ${e.name}: ${sign}${e.netAmount}億円`);
    }
  }
  if (daily.length > 0) {
    const latest = daily[daily.length - 1];
    console.log(`裁定残 最新: ${latest.date}`);
    console.log(`  買い残: ${latest.buyBalance}百万株`);
    console.log(`  売り残: ${latest.sellBalance}百万株`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
