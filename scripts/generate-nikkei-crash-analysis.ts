/**
 * 日経225 の急落（1 日 -5% 以下）後の値動きを集計するスクリプト
 *
 * ^N225 の日足（1985 年〜）を取得し、急落の局面ごとに
 * その後 1ヶ月 / 3ヶ月 / 6ヶ月 / 1年のリターン・その後の最大下落・急落日の市場温度を
 * src/data/nikkei-crash-analysis.json に出力する。記事 /analysis/nikkei-crash-aftermath が読む。
 *
 * 月次の update-historical-stats.yml から実行する。
 * 取引時間中（JST 16 時より前）に実行した場合、当日の途中値が入らないよう当日分は捨てる。
 *
 * 実行: npx tsx scripts/generate-nikkei-crash-analysis.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { computeNikkeiCrashAnalysis } from "./_lib/nikkei-crash";
import { dropIntradayToday, toJstIsoDate } from "./_lib/trading-date";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const PERIOD_START = "1985-01-01";

async function main() {
  const now = new Date();
  const todayJst = toJstIsoDate(now);
  // period2 は排他的なので翌日を渡す
  const period2 = toJstIsoDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  console.log(`データ取得期間: ${PERIOD_START} 〜 ${todayJst}`);
  const nikkei = await fetchDailyCloses(
    yahooFinance,
    "^N225",
    PERIOD_START,
    period2
  );
  if (dropIntradayToday(nikkei, now)) {
    console.log(`  取引時間中の実行のため ${todayJst} の値を除外`);
  }
  console.log(`  → ${nikkei.size} 日分取得`);

  const analysis = computeNikkeiCrashAnalysis(nikkei, {
    generatedAt: todayJst,
  });

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "nikkei-crash-analysis.json");
  writeFileSync(outPath, JSON.stringify(analysis, null, 2) + "\n", "utf-8");

  const s = analysis.summary;
  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(
    `  急落日 ${analysis.crashDayCount} 日 / 局面 ${analysis.episodes.length} 回`
  );
  console.log(
    `  3ヶ月後: 急落 平均 ${s.episodes["3m"].avgReturn}%（上昇 ${s.episodes["3m"].winRate}%）` +
      ` / 全営業日 平均 ${s.baseline["3m"].avgReturn}%（上昇 ${s.baseline["3m"].winRate}%）`
  );
  console.log(
    `  急落日が底: ${s.drawdown.bottomOnCrashDay}/${s.drawdown.count} 回、` +
      `その後の最大下落 中央値 ${s.drawdown.medianDrawdown}%`
  );
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
