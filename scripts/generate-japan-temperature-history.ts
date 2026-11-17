/**
 * 日本版 市場温度の過去10年推移を生成するスクリプト
 *
 * ^N225 の10年分日次データから、市場温度（日経225 の終値と直前 125 営業日の移動平均との
 * 乖離を 0〜100 にしたもの）を算出し、日次の時系列JSONに出力する。
 * ゲージ・前日比・連続日数・日本版アラート・ポートフォリオはこのファイルを見る。
 *
 * 平日 17 時台に snapshot-japan-fg.yml から毎日フル再生成する（価格だけから計算できるので
 * 過去分も同じ式で揃う）。
 *
 * 実行: npx tsx scripts/generate-japan-temperature-history.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { computeJapanTemperatureSeries } from "./_lib/japan-temperature";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 10;

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

  const daily = computeJapanTemperatureSeries(nikkeiMap);

  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: { from: period1, to: period2 },
    method: "nikkei-ma125" as const,
    note:
      "市場温度（日本）= 日経225 の終値と直前125営業日の移動平均との乖離（±15%を0〜100、clamp）。" +
      "2026-11 まで使っていた5要素版・2要素版（C1+C5）からこの定義に統一した。",
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
