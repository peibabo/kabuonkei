/**
 * 解説記事（/learn）に載せる補足の集計を作るスクリプト
 *
 * ^N225（日経225）と JPY=X（ドル円）の日足を取得し、
 * - 値動きの大きさ（実現ボラ）の水準別・その後の日経225（/learn/what-is-nikkei-vi）
 * - ドル円の勢いの帯別・その後の日経225（/learn/what-is-usdjpy-momentum）
 * - SQ のある週とない週の日経225 の値動き（/learn/what-is-arbitrage-balance）
 * - 海外投資家の売買（4 週累計）の帯別・その後の日経225 など（/learn/what-is-investor-flow）。
 *   投資部門別の推移は src/data/investor-flow-history.json（update-investor-flow-history.ts が作る）を読む
 * を src/data/learn-extra-stats.json に出力する。
 *
 * 月次の update-historical-stats.yml から実行する。
 * 取引時間中（JST 16 時より前）に実行した場合、当日の日経225 の途中値は捨てる。
 * 今週がまだ終わっていない場合、その週は SQ 週の集計に入れない。
 *
 * 実行: npm run generate:learn-extra
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { computeLearnExtraStats } from "./_lib/learn-extra-stats";
import { dropIntradayToday, toJstIsoDate } from "./_lib/trading-date";
import type { InvestorFlowHistory } from "../src/lib/investor-flow-history";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/** 集計の起点。日経VI の公表開始（2010 年）より前の 2008 年の金融危機も含めるため 2001 年から */
const STATS_FROM = "2001-01-01";
/** 20 日・50 日の計算の助走ぶん前から取る */
const FETCH_FROM = "2000-06-01";

async function main() {
  const now = new Date();
  const todayJst = toJstIsoDate(now);
  const period2 = toJstIsoDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));

  console.log(`データ取得期間: ${FETCH_FROM} 〜 ${todayJst}`);
  const nikkei = await fetchDailyCloses(yahooFinance, "^N225", FETCH_FROM, period2);
  // 為替の日足はロンドンの 0 時が付くので、ロンドンの日付に揃える（夏時間に 1 日早くならないように）。
  // 日経225 の各日には「前の日まで」のドル円だけを対応させる（computeLearnExtraStats 側）ため、
  // 途中の当日分のドル円が混ざることはない
  const usdJpy = await fetchDailyCloses(yahooFinance, "JPY=X", FETCH_FROM, period2, {
    dateShiftHours: 12,
  });
  if (dropIntradayToday(nikkei, now)) console.log(`  取引時間中の実行のため ${todayJst} の日経225 を除外`);
  console.log(`  → 日経225 ${nikkei.size} 日 / ドル円 ${usdJpy.size} 日`);

  const flow = JSON.parse(
    readFileSync(resolve(__dirname, "../src/data/investor-flow-history.json"), "utf-8")
  ) as InvestorFlowHistory;
  console.log(`  → 投資部門別 ${flow.weeks.length} 週`);

  const stats = computeLearnExtraStats(nikkei, usdJpy, {
    from: STATS_FROM,
    generatedAt: todayJst,
    flowWeeks: flow.weeks,
  });

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "learn-extra-stats.json");
  writeFileSync(outPath, JSON.stringify(stats, null, 2) + "\n", "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}（${stats.dataRange.from} 〜 ${stats.dataRange.to}）`);
  const line = (label: string, b: { occurrences: number; returns: Record<string, { avgReturn: number; winRate: number; sampleSize: number }> }) =>
    console.log(
      `  ${label.padEnd(24)} ${String(b.occurrences).padStart(5)}日  3M ${b.returns["3m"].avgReturn}% (${b.returns["3m"].winRate}%)  6M ${b.returns["6m"].avgReturn}% (${b.returns["6m"].winRate}%)`
    );
  line("全営業日", stats.baseline);
  console.log(`実現ボラ（最新 ${stats.realizedVol.latest}%）`);
  for (const b of stats.realizedVol.bands) line(b.band, b);
  console.log(`ドル円の勢い（最新 ${stats.usdJpyMomentum.latest}%）`);
  for (const b of stats.usdJpyMomentum.bands) line(b.band, b);
  console.log("SQ 週");
  for (const g of stats.sqWeeks.groups)
    console.log(`  ${g.label}: ${g.weeks}週 平均の動き ${g.avgAbsMove}% / 平均 ${g.avgReturn}% / ${stats.sqWeeks.bigMoveThreshold}%以上 ${g.bigMoveShare}%`);
  const f = stats.investorFlow;
  console.log(`海外投資家 4 週累計（${f.dataRange.from}〜${f.dataRange.to}、最新 ${f.latest?.foreign4w} 億円）`);
  for (const b of f.bands) line(`${b.band}（${b.episodes}回）`, b);
  line("全週", f.baseline);
  console.log(`  向きの一致: 同じ週 ${f.sameWeek.matchRate}%（${f.sameWeek.weeks}週） / 公表後1週間 ${f.afterPublish.matchRate}%（${f.afterPublish.weeks}週）`);
  console.log(`  海外と個人が逆向き: ${f.foreignVsIndividual.oppositeRate}%（${f.foreignVsIndividual.weeks}週）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
