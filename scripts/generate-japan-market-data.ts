/**
 * 日本市場固有データ生成スクリプト
 *
 * JPXの公開データから以下を取得し、JSON化する:
 * 1. 投資部門別売買状況（週次Excel）
 * 2. 裁定取引に係る現物ポジション（日次Excel）
 * 3. 信用取引残高（週次Excel）
 *
 * 実行: npx tsx scripts/generate-japan-market-data.ts
 */

import * as XLSX from "xlsx";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  JPX_INVESTOR_TYPE_URL,
  extractInvestorLinks,
  parseInvestorXlsx,
} from "./_lib/jpx-investor";
import {
  JPX_MARGIN_WEEKLY_URL,
  extractWeeklyMarginLinks,
  parseWeeklyMarginXls,
} from "./_lib/jpx-margin";
import type {
  InvestorTradingWeek,
  MarginTradingWeek,
} from "../src/lib/types/japan-market";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const JPX_BASE = "https://www.jpx.co.jp";
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
  const investorHtml = await fetchText(JPX_INVESTOR_TYPE_URL);
  const investorLinks = extractInvestorLinks(investorHtml);
  console.log(`  ${investorLinks.length} 件のリンクを検出`);

  const weeks: InvestorTradingWeek[] = [];
  const linksToFetch = investorLinks.slice(0, WEEKS_TO_FETCH);

  for (const link of linksToFetch) {
    try {
      console.log(`  取得中: ${link.url.split("/").pop()}`);
      const buf = await fetchBuffer(link.url);
      const week = parseInvestorXlsx(buf, link);
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

  // --- 信用取引残高 ---
  console.log("■ 信用取引残高の取得...");
  const marginHtml = await fetchText(JPX_MARGIN_WEEKLY_URL);
  const marginLinks = extractWeeklyMarginLinks(marginHtml);
  console.log(`  ${marginLinks.length} 件のリンクを検出`);

  const marginWeekly: MarginTradingWeek[] = [];

  for (const { url, date } of marginLinks) {
    try {
      console.log(`  取得中: ${url.split("/").pop()} (${date})`);
      const buf = await fetchBuffer(url);
      const week = parseWeeklyMarginXls(buf, date);
      if (!week) console.warn(`  信用残データが見つかりません: ${date}`);
      if (week) {
        marginWeekly.push(week);
        console.log(`    → 買残: ${week.buyBalance}億円, 売残: ${week.sellBalance}億円, 倍率: ${week.ratio}倍`);
      }
    } catch (err) {
      console.warn(`  スキップ: ${err}`);
    }
    await sleep(500);
  }

  // 日付昇順にソート
  marginWeekly.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`  合計 ${marginWeekly.length} 週分取得\n`);

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
    marginTrading: {
      generatedAt: new Date().toISOString().split("T")[0],
      weekly: marginWeekly,
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
  if (marginWeekly.length > 0) {
    const latest = marginWeekly[marginWeekly.length - 1];
    console.log(`信用倍率 最新: ${latest.date}`);
    console.log(`  買い残: ${latest.buyBalance}億円`);
    console.log(`  売り残: ${latest.sellBalance}億円`);
    console.log(`  信用倍率: ${latest.ratio}倍`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
