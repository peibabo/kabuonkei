/**
 * 日経225 の 125 日移動平均乖離率ごとに、その後の値動きを集計するスクリプト
 *
 * ^N225 の日足（1985 年〜）を取得し、乖離率の区切りごとの 1ヶ月〜1年後のリターン、
 * 乖離が ±15% を超えた回の一覧を src/data/nikkei-ma-deviation-analysis.json に出力する。
 * 記事 /analysis/nikkei-ma-deviation が読む。
 *
 * 月次の update-historical-stats.yml から実行する。
 * 取引時間中（JST 16 時より前）に実行した場合、当日の途中値が入らないよう当日分は捨てる。
 *
 * 実行: npx tsx scripts/generate-nikkei-ma-deviation-analysis.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { computeNikkeiMaDeviationAnalysis } from "./_lib/nikkei-ma-deviation";
import { dropIntradayToday, toJstIsoDate } from "./_lib/trading-date";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const PERIOD_START = "1985-01-01";

async function main() {
  const now = new Date();
  const todayJst = toJstIsoDate(now);
  // period2 は排他的なので翌日を渡す
  const period2 = toJstIsoDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  console.log(`データ取得期間: ${PERIOD_START} 〜 ${todayJst}`);
  const nikkei = await fetchDailyCloses(yahooFinance, "^N225", PERIOD_START, period2);
  if (dropIntradayToday(nikkei, now)) {
    console.log(`  取引時間中の実行のため ${todayJst} の値を除外`);
  }
  console.log(`  → ${nikkei.size} 日分取得`);

  const analysis = computeNikkeiMaDeviationAnalysis(nikkei, { generatedAt: todayJst });

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "nikkei-ma-deviation-analysis.json");
  writeFileSync(outPath, JSON.stringify(analysis, null, 2) + "\n", "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(
    `  ${analysis.dayCount} 営業日（${analysis.dataRange.from} 〜 ${analysis.dataRange.to}）、後半は ${analysis.halfSplitDate} から`
  );
  for (const b of analysis.bands) {
    const s = b.all["6m"];
    console.log(`  ${b.key.padEnd(9)} 6ヶ月後 平均 ${s.avgReturn}%（上昇 ${s.winRate}%、${s.sampleSize} 日）`);
  }
  console.log(
    `  乖離 -${analysis.extremeThreshold}% 以下 ${analysis.lowEpisodes.length} 回 / +${analysis.extremeThreshold}% 以上 ${analysis.highEpisodes.length} 回`
  );
  console.log(`  最新 ${analysis.latest.date}: ${analysis.latest.deviation}%`);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
