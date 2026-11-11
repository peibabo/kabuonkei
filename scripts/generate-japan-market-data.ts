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

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchBuffer, fetchText } from "./_lib/jpx-common";
import {
  JPX_ARBITRAGE_URL,
  extractArbitrageLinks,
  parseArbitrageXls,
} from "./_lib/jpx-arbitrage";
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
import { sleep } from "./_lib/shared";
import type {
  ArbitrageBalanceDay,
  InvestorTradingWeek,
  MarginTradingWeek,
} from "../src/lib/types/japan-market";

const WEEKS_TO_FETCH = 12;
const ARBITRAGE_DAYS_TO_FETCH = 60; // 約12週分の営業日

/**
 * 取得 0 件は JPX 側のファイル名・レイアウト変更の兆候。空データで上書きコミットされると
 * 日本版スコアの要素が黙って欠損するため、書き出し前に失敗させて CI で気付けるようにする。
 */
function assertNonEmpty(label: string, items: unknown[]): void {
  if (items.length === 0) {
    throw new Error(
      `${label}が 0 件です。JPX のファイル名・レイアウト変更を確認してください`
    );
  }
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
  const arbitrageHtml = await fetchText(JPX_ARBITRAGE_URL);
  const arbitrageLinks = extractArbitrageLinks(arbitrageHtml);
  console.log(`  ${arbitrageLinks.length} 件のリンクを検出`);

  const daily: ArbitrageBalanceDay[] = [];
  const arbLinksToFetch = arbitrageLinks.slice(0, ARBITRAGE_DAYS_TO_FETCH);

  for (const { url, date } of arbLinksToFetch) {
    try {
      console.log(`  取得中: ${url.split("/").pop()} (${date})`);
      const buf = await fetchBuffer(url);
      const day = parseArbitrageXls(buf, date);
      if (day) {
        daily.push(day);
      } else {
        console.warn(`  裁定残データが見つかりません: ${date}`);
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
      if (week) {
        marginWeekly.push(week);
        console.log(`    → 買残: ${week.buyBalance}億円, 売残: ${week.sellBalance}億円, 倍率: ${week.ratio}倍`);
      } else {
        console.warn(`  信用残データが見つかりません: ${date}`);
      }
    } catch (err) {
      console.warn(`  スキップ: ${err}`);
    }
    await sleep(500);
  }

  // 日付昇順にソート
  marginWeekly.sort((a, b) => a.date.localeCompare(b.date));

  console.log(`  合計 ${marginWeekly.length} 週分取得\n`);

  assertNonEmpty("投資部門別売買状況", weeks);
  assertNonEmpty("裁定残", daily);
  assertNonEmpty("信用取引残高", marginWeekly);

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
