/**
 * 海外投資家の売買・信用買い残の増減ごとに、その後の日経225 の値動きを集計するスクリプト
 *
 * ^N225 の日足（1985 年〜。市場温度の 125 日平均の助走に使う）と、
 * src/data/investor-flow-history.json（海外投資家、2016 年〜）・src/data/margin-ratio-history.json
 * （信用買い残、2002 年〜）を読み、src/data/supply-demand-analysis.json に出力する。
 * 記事 /analysis/supply-demand-signals が読む。
 *
 * 月次の update-historical-stats.yml から、信用残・投資部門別の更新の後に実行する。
 * 取引時間中（JST 16 時より前）に実行した場合、当日の途中値が入らないよう当日分は捨てる。
 *
 * 実行: npm run generate:supply-demand
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { computeSupplyDemandAnalysis } from "./_lib/supply-demand-signals";
import type { FlowHistoryWeek, MarginHistoryWeek } from "./_lib/supply-temperature-analysis";
import { dropIntradayToday, toJstIsoDate } from "./_lib/trading-date";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const PERIOD_START = "1985-01-01";
const DATA_DIR = resolve(__dirname, "../src/data");
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(DATA_DIR, name), "utf-8")) as T;

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

  const margin = readJson<{ weekly: MarginHistoryWeek[] }>("margin-ratio-history.json").weekly;
  const flow = readJson<{ weeks: FlowHistoryWeek[] }>("investor-flow-history.json").weeks;
  console.log(`  信用残 ${margin.length} 週 / 海外投資家 ${flow.length} 週`);

  const analysis = computeSupplyDemandAnalysis(nikkei, margin, flow, { generatedAt: todayJst });

  mkdirSync(DATA_DIR, { recursive: true });
  const outPath = resolve(DATA_DIR, "supply-demand-analysis.json");
  writeFileSync(outPath, JSON.stringify(analysis, null, 2) + "\n", "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  for (const [label, ind] of [
    ["海外投資家", analysis.flow],
    ["信用買い残", analysis.margin],
  ] as const) {
    console.log(
      `  ${label}: ${ind.dayCount} 営業日（${ind.dataRange.from} 〜 ${ind.dataRange.to}）、後半は ${ind.halfSplitDate} から`
    );
    for (const b of ind.bands) {
      const s = b.all["6m"];
      console.log(`    ${b.key.padEnd(9)} 6ヶ月後 平均 ${s.avgReturn}%（上昇 ${s.winRate}%、${s.sampleSize} 日）`);
    }
    const e = ind.extremeSummary["6m"];
    console.log(
      `    ${ind.extremeThreshold} 以下 ${ind.extremeEpisodes.length} 回、6ヶ月後 平均 ${e.avgReturn}%（上昇 ${e.winRate}%）`
    );
  }
  const l = analysis.latest;
  console.log(`  最新 ${l.date}: 温度 ${l.temperature} / 海外 ${l.flow4w} 億円 / 買残 ${l.marginChange4w}%`);
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
