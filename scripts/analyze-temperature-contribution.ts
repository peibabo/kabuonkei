/**
 * 温度信号の寄与度分析。
 *
 * 目的: 「sym 80/20 ルールの α vs DCA」のうち、どれだけが温度信号のおかげで、
 * どれだけが単に「平均 72-80% 株保有」という配分の高さから来ているのかを分離する。
 *
 * 手法:
 *   - Temperature rule = 現行の sym 80/20（温度帯で 100〜50% に変動）
 *   - Constant baseline = 同じバックテスト期間中に、温度ルールが実現した
 *     平均株比率を「定数として」持ち続けるポートフォリオ
 *   - 温度信号の純寄与度 = Temperature rule total − Constant baseline total (pp)
 *
 * 想定される解釈:
 *   - 寄与度 ≫ 0 → 温度計は本当に timing に使える
 *   - 寄与度 ≈ 0 → 温度計は効いておらず、単に「株比率を上げた」効果
 *   - 寄与度 < 0 → 温度信号はむしろ逆効果（配分下げる場面が不適切）
 *
 * 実行:
 *   npx tsx scripts/analyze-temperature-contribution.ts
 *
 * 永続化: なし（コンソール出力のみ）
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  simulatePortfolio,
  DEFAULT_PORTFOLIO_RULE,
  type BandRule,
  type PortfolioRule,
} from "./_lib/portfolio-sim";
import { estimateFearGreedFromVix, fetchDailyCloses, sleep } from "./_lib/shared";
import type { SentimentLevel } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const START_DATE = "2016-04-22";

function constantRule(ratio: number): PortfolioRule {
  const bands: BandRule[] = (
    ["極寒", "冷え込み", "平温", "過熱", "沸騰"] as SentimentLevel[]
  ).map((level, i) => ({
    level,
    scoreRange: [
      i === 0 ? 0 : i * 20 + 1,
      i === 4 ? 100 : (i + 1) * 20,
    ] as [number, number],
    equityRatio: ratio,
  }));
  return { ...DEFAULT_PORTFOLIO_RULE, bands };
}

function pct(n: number, w = 7): string {
  const s = n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;
  return s.padStart(w);
}

async function main() {
  console.log("=".repeat(100));
  console.log("温度信号の寄与度分析 — sym 80/20 vs 同じ平均株比率の定数配分");
  console.log("=".repeat(100));

  const endDate = new Date();
  const period1 = "2015-10-01";
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`期間: ${period1} 〜 ${period2}\n`);

  const n225 = await fetchDailyCloses(yahooFinance, "^N225", period1, period2);
  await sleep(1000);
  const gspc = await fetchDailyCloses(yahooFinance, "^GSPC", period1, period2);
  await sleep(1000);
  const vix = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);

  const jpHistoryPath = resolve(
    __dirname,
    "../src/data/japan-temperature-history.json"
  );
  const jpHistoryRaw = JSON.parse(readFileSync(jpHistoryPath, "utf-8")) as {
    daily: Array<{ date: string; score: number }>;
  };
  const jpScoreMap = new Map<string, number>();
  for (const p of jpHistoryRaw.daily) jpScoreMap.set(p.date, p.score);

  const jpScoreOf = (d: string): number | null => jpScoreMap.get(d) ?? null;
  const usScoreOf = (d: string): number | null => {
    const v = vix.get(d);
    return v != null ? estimateFearGreedFromVix(v) : null;
  };

  for (const market of ["JP", "US"] as const) {
    const priceMap = market === "JP" ? n225 : gspc;
    const scoreOf = market === "JP" ? jpScoreOf : usScoreOf;
    const priceDates = [...priceMap.keys()].sort();
    const filtered = priceDates.filter((d) => d >= START_DATE);

    // 1. 温度ルール（現行 sym 80/20）
    const tempResult = simulatePortfolio({
      priceMap,
      priceDates: filtered,
      scoreOf,
      rule: DEFAULT_PORTFOLIO_RULE,
      startDate: filtered[0],
    });

    // 実現平均株比率（日次の equityRatio の平均）
    const avgEquity =
      tempResult.daily.reduce((s, d) => s + d.equityRatio, 0) /
      tempResult.daily.length;

    // 2. 定数配分ルール（同じ平均）
    const constResult = simulatePortfolio({
      priceMap,
      priceDates: filtered,
      scoreOf, // スコアは渡すが定数ルールなのでリバランス後比率は変わらない
      rule: constantRule(avgEquity),
      startDate: filtered[0],
    });

    // 3. 追加比較: きれいな定数（70%, 75%, 80%）
    const clean70 = simulatePortfolio({
      priceMap,
      priceDates: filtered,
      scoreOf,
      rule: constantRule(0.7),
      startDate: filtered[0],
    });
    const clean80 = simulatePortfolio({
      priceMap,
      priceDates: filtered,
      scoreOf,
      rule: constantRule(0.8),
      startDate: filtered[0],
    });

    const ts = tempResult.stats;
    const cs = constResult.stats;
    const c70 = clean70.stats;
    const c80 = clean80.stats;

    console.log(`\n${"=".repeat(100)}`);
    console.log(
      `${market === "JP" ? "🇯🇵 日本市場" : "🇺🇸 米国市場"} — ${market === "JP" ? "^N225" : "^GSPC"} / ${tempResult.daily.length} 日`
    );
    console.log("=".repeat(100));
    console.log(
      `温度ルール実現平均株比率: ${(avgEquity * 100).toFixed(1)}%（月次スコア依存で変動）`
    );
    console.log("");
    console.log(
      `| rule                         | totRet  | maxDD   | Sharpe | α vs DCA | ΔmaxDD |`
    );
    console.log(
      `|------------------------------|---------|---------|--------|----------|--------|`
    );
    console.log(
      `| 温度ルール sym 80/20         | ${pct(ts.totalReturn)} | ${pct(ts.maxDrawdown)} |  ${ts.sharpe.toFixed(2)}  | ${pct(ts.alphaVsDca, 8)} | ${pct(ts.maxDrawdown - ts.dcaMaxDrawdown, 6)} |`
    );
    console.log(
      `| 定数 ${(avgEquity * 100).toFixed(0).padStart(2)}%（温度ルール平均と同じ）| ${pct(cs.totalReturn)} | ${pct(cs.maxDrawdown)} |  ${cs.sharpe.toFixed(2)}  | ${pct(cs.alphaVsDca, 8)} | ${pct(cs.maxDrawdown - cs.dcaMaxDrawdown, 6)} |`
    );
    console.log(
      `| 定数 70%                     | ${pct(c70.totalReturn)} | ${pct(c70.maxDrawdown)} |  ${c70.sharpe.toFixed(2)}  | ${pct(c70.alphaVsDca, 8)} | ${pct(c70.maxDrawdown - c70.dcaMaxDrawdown, 6)} |`
    );
    console.log(
      `| 定数 80%                     | ${pct(c80.totalReturn)} | ${pct(c80.maxDrawdown)} |  ${c80.sharpe.toFixed(2)}  | ${pct(c80.alphaVsDca, 8)} | ${pct(c80.maxDrawdown - c80.dcaMaxDrawdown, 6)} |`
    );

    const tempSignalAlpha = ts.totalReturn - cs.totalReturn;
    const tempSignalSharpe = ts.sharpe - cs.sharpe;
    const tempSignalDd = ts.maxDrawdown - cs.maxDrawdown;

    console.log("");
    console.log(`📊 温度信号の純寄与度（温度ルール − 同じ平均の定数配分）:`);
    console.log(
      `   リターン差  : ${tempSignalAlpha >= 0 ? "+" : ""}${tempSignalAlpha.toFixed(2)}pp`
    );
    console.log(
      `   最大DD差   : ${tempSignalDd >= 0 ? "+" : ""}${tempSignalDd.toFixed(2)}pp`
    );
    console.log(
      `   Sharpe差   : ${tempSignalSharpe >= 0 ? "+" : ""}${tempSignalSharpe.toFixed(2)}`
    );
    console.log("");

    // 解釈
    if (tempSignalAlpha > 5) {
      console.log(
        `   → 温度信号はリターンに対して **明確に寄与**している（+${tempSignalAlpha.toFixed(1)}pp）`
      );
    } else if (tempSignalAlpha > 1) {
      console.log(
        `   → 温度信号は軽微にプラスだが、α vs DCA の大半は「株比率の高さ」による`
      );
    } else if (tempSignalAlpha > -1) {
      console.log(
        `   → 温度信号は**ほとんど寄与なし**（α vs DCA = +${ts.alphaVsDca.toFixed(1)}pp の大部分は「株比率の高さ」由来）`
      );
    } else {
      console.log(
        `   → 温度信号は**マイナスに寄与**している（${tempSignalAlpha.toFixed(1)}pp）`
      );
    }

    if (tempSignalDd < -2) {
      console.log(
        `   → 最大DD は定数配分より**明らかに浅く**抑えている（リスク管理に寄与）`
      );
    } else if (tempSignalDd < 0) {
      console.log(
        `   → 最大DD は定数配分より軽微に浅い`
      );
    } else if (tempSignalDd > 2) {
      console.log(
        `   → 最大DD は定数配分より**深くなっている**（温度帯変化がタイミング遅れで DD を深めた可能性）`
      );
    } else {
      console.log(`   → 最大DD は定数配分とほぼ同等`);
    }
  }

  console.log("\n完了。");
}

main().catch((err) => {
  console.error("エラー:", err);
  process.exit(1);
});
