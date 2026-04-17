/**
 * 日本版市場温度の過去10年推移を生成するスクリプト
 *
 * ^N225 + USDJPY=X の10年分日次データから C1（日経225 vs 125日MA）と
 * C5（USDJPY 50日モメンタム）の2要素等ウェイト平均スコアを算出し、
 * 日次の時系列JSONに出力する。
 *
 * （C2/C3/C4 の過去データが存在しないため、簡易2要素版で計算）
 *
 * 実行: npx tsx scripts/generate-japan-temperature-history.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import {
  normalizeNikkeiMaDeviation,
  normalizeUsdJpyMomentum,
} from "../src/lib/japan-fear-greed";
import { fetchDailyCloses, sleep } from "./_lib/shared";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 10;
const MA_WINDOW = 125;
const MOMENTUM_WINDOW = 50;

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  console.log("取得中: ^N225...");
  const nikkeiMap = await fetchDailyCloses(
    yahooFinance,
    "^N225",
    period1,
    period2
  );
  console.log(`  → ${nikkeiMap.size} 日分取得`);
  await sleep(2000);

  console.log("取得中: USDJPY=X...");
  const usdJpyMap = await fetchDailyCloses(
    yahooFinance,
    "USDJPY=X",
    period1,
    period2
  );
  console.log(`  → ${usdJpyMap.size} 日分取得`);

  const nikkeiDates = [...nikkeiMap.keys()].sort();
  const usdJpyDates = [...usdJpyMap.keys()].sort();

  type DailyPoint = {
    date: string;
    score: number;
    c1: number;
    c5?: number;
    nikkei: number;
    usdjpy?: number;
  };

  const daily: DailyPoint[] = [];

  for (let i = MA_WINDOW; i < nikkeiDates.length; i++) {
    const date = nikkeiDates[i];
    const nikkeiPrice = nikkeiMap.get(date);
    if (nikkeiPrice == null) continue;

    // 125日MA（直前125営業日の単純平均）
    const maWindow = nikkeiDates
      .slice(i - MA_WINDOW, i)
      .map((d) => nikkeiMap.get(d))
      .filter((v): v is number => v != null);
    if (maWindow.length < MA_WINDOW) continue;
    const ma125 = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;
    const c1 = normalizeNikkeiMaDeviation(nikkeiPrice, ma125);

    // USDJPY 50日モメンタム（同日のUSDJPYと50営業日前のUSDJPY）
    const usdJpyIdx = usdJpyDates.indexOf(date);
    let c5: number | undefined;
    let usdJpy: number | undefined;
    if (usdJpyIdx >= MOMENTUM_WINDOW) {
      const currentUsdJpy = usdJpyMap.get(date);
      const pastDate = usdJpyDates[usdJpyIdx - MOMENTUM_WINDOW];
      const pastUsdJpy = usdJpyMap.get(pastDate);
      if (currentUsdJpy != null && pastUsdJpy != null) {
        c5 = normalizeUsdJpyMomentum(currentUsdJpy, pastUsdJpy);
        usdJpy = Math.round(currentUsdJpy * 100) / 100;
      }
    }

    const scores = c5 != null ? [c1, c5] : [c1];
    const score = Math.round(
      scores.reduce((a, b) => a + b, 0) / scores.length
    );

    daily.push({
      date,
      score,
      c1,
      ...(c5 != null ? { c5 } : {}),
      nikkei: Math.round(nikkeiPrice * 100) / 100,
      ...(usdJpy != null ? { usdjpy: usdJpy } : {}),
    });
  }

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    method: "simple2" as const,
    note:
      "C1(日経225 vs 125日MA) + C5(USDJPY 50日モメンタム) の2要素等ウェイト平均による過去推移。" +
      "本体5要素スコアの過去データはC2/C3/C4が未整備のため再現不可。",
    daily,
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "japan-temperature-history.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(`  総データ点: ${daily.length}`);
  if (daily.length > 0) {
    const first = daily[0];
    const last = daily[daily.length - 1];
    console.log(`  範囲: ${first.date}（score=${first.score}）〜 ${last.date}（score=${last.score}）`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
