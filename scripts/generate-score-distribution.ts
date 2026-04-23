/**
 * 温度スコア分布（過去10年）の事前計算スクリプト
 *
 * 温度カード（FearGreedGauge）に「過去10年中、このスコア以下の日は XX%」の
 * 歴史的位置づけバッジを表示するためのデータを生成する。
 *
 * - US: ^VIX 10年取得 → estimateFearGreedFromVix() でスコア配列化 → 昇順ソート
 * - JP: 既存 src/data/japan-temperature-history.json の score を再利用 → 昇順ソート
 *
 * 実行: npx tsx scripts/generate-score-distribution.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync, readFileSync } from "fs";
import { resolve } from "path";
import {
  estimateFearGreedFromVix,
  fetchDailyCloses,
} from "./_lib/shared";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const YEARS_BACK = 10;

interface JapanTempDaily {
  date: string;
  score: number;
}
interface JapanTempHistory {
  dataRange?: { from: string; to: string };
  daily: JapanTempDaily[];
}

async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - YEARS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);

  // --- US: VIX → 温度スコア ---
  console.log("\n=== US（VIXベース推定） ===");
  console.log("取得中: ^VIX...");
  const vixMap = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);
  console.log(`  → ${vixMap.size} 日分取得`);

  const usScores: number[] = [];
  for (const vix of vixMap.values()) {
    usScores.push(estimateFearGreedFromVix(vix));
  }
  usScores.sort((a, b) => a - b);

  const usDates = [...vixMap.keys()].sort();
  const usDataRange = {
    from: usDates[0] ?? period1,
    to: usDates[usDates.length - 1] ?? period2,
  };

  // --- JP: 既存 japan-temperature-history.json の score を再利用 ---
  console.log("\n=== JP（簡易2要素 C1+C5 スコア）===");
  const jpHistPath = resolve(
    __dirname,
    "../src/data/japan-temperature-history.json"
  );
  const jpHistRaw = JSON.parse(
    readFileSync(jpHistPath, "utf-8")
  ) as JapanTempHistory;
  console.log(`日本温度履歴: ${jpHistRaw.daily.length} 日分`);

  const jpScores = jpHistRaw.daily
    .map((d) => d.score)
    .filter((s): s is number => typeof s === "number");
  jpScores.sort((a, b) => a - b);

  const jpDataRange = jpHistRaw.dataRange ?? { from: period1, to: period2 };

  // --- 出力 ---
  const output = {
    generatedAt: new Date().toISOString().split("T")[0],
    dataRange: {
      from:
        usDataRange.from < jpDataRange.from ? usDataRange.from : jpDataRange.from,
      to: usDataRange.to > jpDataRange.to ? usDataRange.to : jpDataRange.to,
    },
    us: {
      count: usScores.length,
      dataRange: usDataRange,
      scores: usScores,
    },
    jp: {
      count: jpScores.length,
      dataRange: jpDataRange,
      scores: jpScores,
    },
  };

  const outDir = resolve(__dirname, "../src/data");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "score-distribution.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n✅ 生成完了: ${outPath}`);
  console.log(
    `  US: n=${usScores.length} range=[${usScores[0]}, ${usScores[usScores.length - 1]}] 中央値=${usScores[Math.floor(usScores.length / 2)]}`
  );
  console.log(
    `  JP: n=${jpScores.length} range=[${jpScores[0]}, ${jpScores[jpScores.length - 1]}] 中央値=${jpScores[Math.floor(jpScores.length / 2)]}`
  );
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
