/**
 * 温度推移データ生成スクリプト
 *
 * VIXの過去11ヶ月分データから日次の温度スコアを算出し、
 * 静的JSONとして出力する。ランタイムの直近30日VIXデータと
 * マージして使用される前提。
 *
 * 実行: npx tsx scripts/generate-temperature-history.ts
 */

import YahooFinance from "yahoo-finance2";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// --- 設定 ---
const MONTHS_BACK = 11;

// --- ユーティリティ ---

/** VIXからFear & Greedスコアを推定（market-data.tsと同じロジック） */
function estimateFearGreedFromVix(vix: number): number {
  const score = Math.round(100 - ((vix - 10) / 30) * 100);
  return Math.max(0, Math.min(100, score));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// --- メイン ---
async function main() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - MONTHS_BACK);

  const period1 = startDate.toISOString().split("T")[0];
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);
  console.log("取得中: ^VIX...");

  try {
    const result = await yahooFinance.chart("^VIX", {
      period1,
      period2,
      interval: "1d",
    });

    const daily: Array<{ date: string; score: number; vix: number }> = [];

    for (const q of result.quotes) {
      if (q.close != null) {
        const dateStr = new Date(q.date).toISOString().split("T")[0];
        const vix = round1(q.close);
        const score = estimateFearGreedFromVix(q.close);
        daily.push({ date: dateStr, score, vix });
      }
    }

    // 日付昇順でソート
    daily.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`  → ${daily.length} 日分取得`);

    const output = {
      generatedAt: new Date().toISOString().split("T")[0],
      dataRange: { from: daily[0]?.date ?? period1, to: daily[daily.length - 1]?.date ?? period2 },
      daily,
    };

    // 出力
    const outDir = resolve(__dirname, "../src/data");
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, "temperature-history.json");
    writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

    console.log(`\n✅ 生成完了: ${outPath}`);
    console.log(`期間: ${output.dataRange.from} 〜 ${output.dataRange.to}`);
    console.log(`データ件数: ${daily.length} 日`);

    // スコア分布のサマリー
    const ranges = [
      { label: "極寒（0-20）", min: 0, max: 20 },
      { label: "冷え込み（21-40）", min: 21, max: 40 },
      { label: "平温（41-60）", min: 41, max: 60 },
      { label: "加熱（61-80）", min: 61, max: 80 },
      { label: "沸騰（81-100）", min: 81, max: 100 },
    ];
    console.log("\n--- 温度帯分布 ---");
    for (const r of ranges) {
      const count = daily.filter((d) => d.score >= r.min && d.score <= r.max).length;
      console.log(`${r.label}: ${count}日`);
    }
  } catch (err) {
    console.error(`エラー: ${err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
