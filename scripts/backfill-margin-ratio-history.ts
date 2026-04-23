/**
 * 信用倍率履歴バックフィルスクリプト。
 *
 * JPX の 06.html (信用取引現在高 過去推移表) から連結 Excel を取得して、
 * 2002 年以降の全週次データを margin-ratio-history.json に書き出す。
 *
 * また、直近数週は 06.html の連結ファイルに未反映の場合があるので、
 * 04.html (最新週次 mtseisan*.xls) からも取得し、最新情報でギャップ埋めする。
 *
 * 実行: npm run generate:margin-history
 *   or: npx tsx scripts/backfill-margin-ratio-history.ts
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  JPX_MARGIN_HISTORY_URL,
  JPX_MARGIN_WEEKLY_URL,
  extractHistoryExcelUrl,
  extractWeeklyMarginLinks,
  fetchBuffer,
  fetchText,
  parseHistoryMarginXls,
  parseWeeklyMarginXls,
} from "./_lib/jpx-margin";
import { sleep } from "./_lib/shared";
import type { MarginTradingWeek } from "../src/lib/types/japan-market";

interface HistoryOutput {
  generatedAt: string;
  dataRange: { from: string; to: string };
  sources: {
    consolidated: string | null;
    weeklyCount: number;
  };
  weekly: MarginTradingWeek[];
}

async function main() {
  console.log("=== 信用倍率履歴バックフィル ===\n");

  // --- 1. 連結履歴ファイルを取得 ---
  console.log("■ 連結履歴 Excel URL を解決中...");
  const historyHtml = await fetchText(JPX_MARGIN_HISTORY_URL);
  const historyXlsUrl = extractHistoryExcelUrl(historyHtml);
  if (!historyXlsUrl) {
    throw new Error(
      `06.html から連結履歴 Excel URL を抽出できませんでした: ${JPX_MARGIN_HISTORY_URL}`
    );
  }
  console.log(`  URL: ${historyXlsUrl}`);

  console.log("■ 連結履歴 Excel をダウンロード中...");
  const historyBuf = await fetchBuffer(historyXlsUrl);
  console.log(`  ${historyBuf.length} bytes`);

  const historyWeeks = parseHistoryMarginXls(historyBuf);
  console.log(`  パース成功: ${historyWeeks.length} 週分`);
  if (historyWeeks.length === 0) {
    throw new Error("連結履歴 Excel のパース結果が空です");
  }

  // --- 2. 04.html から最新週次ファイルを取得してギャップ埋め ---
  console.log("\n■ 最新週次ファイルでギャップ埋め...");
  const weeklyHtml = await fetchText(JPX_MARGIN_WEEKLY_URL);
  const weeklyLinks = extractWeeklyMarginLinks(weeklyHtml);
  console.log(`  ${weeklyLinks.length} 件の週次リンク検出`);

  // 連結履歴に含まれない日付だけ fetch (無駄削減)
  const existingDates = new Set(historyWeeks.map((w) => w.date));
  const linksToFetch = weeklyLinks.filter((l) => !existingDates.has(l.date));
  console.log(`  うち連結履歴に未収録: ${linksToFetch.length} 件`);

  const weeklyExtra: MarginTradingWeek[] = [];
  for (const { url, date } of linksToFetch) {
    try {
      console.log(`  取得中: ${url.split("/").pop()} (${date})`);
      const buf = await fetchBuffer(url);
      const week = parseWeeklyMarginXls(buf, date);
      if (week) {
        weeklyExtra.push(week);
        console.log(
          `    → 買残: ${week.buyBalance}億, 売残: ${week.sellBalance}億, 倍率: ${week.ratio}倍`
        );
      }
    } catch (err) {
      console.warn(`  スキップ: ${err}`);
    }
    await sleep(500);
  }

  // --- 3. マージ (連結優先、連結に無い日付だけ追加) ---
  const merged = [...historyWeeks, ...weeklyExtra];
  merged.sort((a, b) => a.date.localeCompare(b.date));

  const dedup: MarginTradingWeek[] = [];
  const seen = new Set<string>();
  for (const w of merged) {
    if (seen.has(w.date)) continue;
    seen.add(w.date);
    dedup.push(w);
  }

  // --- 4. 出力 ---
  const output: HistoryOutput = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from: dedup[0].date,
      to: dedup[dedup.length - 1].date,
    },
    sources: {
      consolidated: historyXlsUrl,
      weeklyCount: weeklyExtra.length,
    },
    weekly: dedup,
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "margin-ratio-history.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(`  期間: ${output.dataRange.from} 〜 ${output.dataRange.to}`);
  console.log(`  総週数: ${dedup.length}`);
  console.log(`  連結履歴: ${historyWeeks.length} + 追加週次: ${weeklyExtra.length}`);

  // 最新行サマリー
  const latest = dedup[dedup.length - 1];
  console.log(
    `  最新: ${latest.date} | 売残 ${latest.sellBalance}億 | 買残 ${latest.buyBalance}億 | 倍率 ${latest.ratio}倍`
  );
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
