/**
 * Phase A（探索）: 積立（DCA）に勝てる温度ルール候補を網羅テストする調査スクリプト。
 *
 * 目的:
 *   - 配分ルール群（対称シフト / 非対称 / 極端帯トリガー）を simulatePortfolio に流す
 *   - 温度連動 DCA（月次購入額を温度で変動、総拠出額は同じ）を独自シミュレータで計算
 *   - JP / US 両市場で α vs DCA / maxDD / Sharpe を比較する表をコンソール出力
 *
 * 実行:
 *   npx tsx scripts/explore-portfolio-rules.ts
 *
 * 永続化: なし（コンソール出力のみ。結果を見てから採択ルールを決定する）
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  simulatePortfolio,
  computeMaxDrawdown,
  computeSharpe,
  DEFAULT_PORTFOLIO_RULE,
  type BandRule,
} from "./_lib/portfolio-sim";
import { estimateFearGreedFromVix, fetchDailyCloses, sleep } from "./_lib/shared";
import { getSentimentLevel } from "../src/lib/sentiment";
import type { SentimentLevel } from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const START_DATE = "2016-04-22";

const SENTIMENT_LEVELS: SentimentLevel[] = [
  "極寒",
  "冷え込み",
  "平温",
  "過熱",
  "沸騰",
];
const SCORE_RANGES: Record<SentimentLevel, [number, number]> = {
  極寒: [0, 20],
  冷え込み: [21, 40],
  平温: [41, 60],
  過熱: [61, 80],
  沸騰: [81, 100],
};

type Allocation = Record<SentimentLevel, number>;
type Multipliers = Record<SentimentLevel, number>;

function buildBands(ratios: Allocation): BandRule[] {
  return SENTIMENT_LEVELS.map((level) => ({
    level,
    scoreRange: SCORE_RANGES[level],
    equityRatio: ratios[level],
  }));
}

interface AllocationCandidate {
  name: string;
  ratios: Allocation;
}

interface DcaCandidate {
  name: string;
  multipliers: Multipliers;
}

// A-1: 対称シフト (ニュートラル を動かす)
// A-2: 非対称 (高温側を厚めにカット)
// A-3: 極端帯トリガー (平温〜過熱は高配分固定、極端時だけ動かす)
const ALLOCATION_CANDIDATES: AllocationCandidate[] = [
  // A-1
  {
    name: "current (sym 60/40)",
    ratios: { 極寒: 0.9, 冷え込み: 0.75, 平温: 0.6, 過熱: 0.45, 沸騰: 0.3 },
  },
  {
    name: "sym 70/30",
    ratios: { 極寒: 0.95, 冷え込み: 0.85, 平温: 0.7, 過熱: 0.55, 沸騰: 0.4 },
  },
  {
    name: "sym 80/20",
    ratios: { 極寒: 1.0, 冷え込み: 0.9, 平温: 0.8, 過熱: 0.65, 沸騰: 0.5 },
  },
  {
    name: "sym 90/10",
    ratios: { 極寒: 1.0, 冷え込み: 0.95, 平温: 0.9, 過熱: 0.75, 沸騰: 0.6 },
  },
  {
    name: "sym 100/0 (lump eq)",
    ratios: { 極寒: 1.0, 冷え込み: 1.0, 平温: 1.0, 過熱: 1.0, 沸騰: 1.0 },
  },
  // A-2
  {
    name: "asym hot-cut-light",
    ratios: { 極寒: 1.0, 冷え込み: 1.0, 平温: 1.0, 過熱: 0.8, 沸騰: 0.5 },
  },
  {
    name: "asym hot-cut-heavy",
    ratios: { 極寒: 1.0, 冷え込み: 1.0, 平温: 1.0, 過熱: 0.7, 沸騰: 0.3 },
  },
  {
    name: "asym cold-double",
    ratios: { 極寒: 1.0, 冷え込み: 0.95, 平温: 0.85, 過熱: 0.65, 沸騰: 0.4 },
  },
  {
    name: "asym balanced-shift",
    ratios: { 極寒: 1.0, 冷え込み: 0.9, 平温: 0.75, 過熱: 0.55, 沸騰: 0.35 },
  },
  // A-3
  {
    name: "extreme-only 20/80",
    ratios: { 極寒: 1.0, 冷え込み: 0.85, 平温: 0.85, 過熱: 0.85, 沸騰: 0.35 },
  },
  {
    name: "extreme-only 20/80 strong",
    ratios: { 極寒: 1.0, 冷え込み: 0.9, 平温: 0.9, 過熱: 0.9, 沸騰: 0.3 },
  },
];

// A-4: 温度連動 DCA（基本月額を 1.0 として、温度帯ごとに倍率をかける）
const DCA_CANDIDATES: DcaCandidate[] = [
  {
    name: "plain DCA (baseline)",
    multipliers: { 極寒: 1.0, 冷え込み: 1.0, 平温: 1.0, 過熱: 1.0, 沸騰: 1.0 },
  },
  {
    name: "dca-mod 2x",
    multipliers: { 極寒: 2.0, 冷え込み: 1.5, 平温: 1.0, 過熱: 0.5, 沸騰: 0.25 },
  },
  {
    name: "dca-mod 3x",
    multipliers: { 極寒: 3.0, 冷え込み: 1.8, 平温: 1.0, 過熱: 0.5, 沸騰: 0.2 },
  },
  {
    name: "dca cold-double",
    multipliers: { 極寒: 2.0, 冷え込み: 2.0, 平温: 1.0, 過熱: 1.0, 沸騰: 1.0 },
  },
  {
    name: "dca hot-cut-only",
    multipliers: { 極寒: 1.0, 冷え込み: 1.0, 平温: 1.0, 過熱: 0.5, 沸騰: 0.25 },
  },
  {
    name: "dca cold-boost-hot-cut",
    multipliers: { 極寒: 2.0, 冷え込み: 1.5, 平温: 1.0, 過熱: 0.7, 沸騰: 0.5 },
  },
];

// ---------------------------------------------------------------------------

interface ModulatedDcaResult {
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  finalNav: number;
  trades: number;
}

/**
 * 温度連動 DCA のシミュレータ。
 * - 毎月第一営業日に「基本月額 × 当月温度帯の倍率」を株に投入
 * - 総拠出額は initialNav に等しくなるよう正規化（= 基本月額 = initialNav / Σ倍率）
 * - 現金保持（未投入分）は金利 0 前提
 */
function simulateModulatedDca(
  priceMap: Map<string, number>,
  priceDates: string[],
  scoreOf: (date: string) => number | null,
  multipliers: Multipliers,
  initialNav: number
): ModulatedDcaResult {
  const filtered = priceDates.filter((d) => d >= START_DATE);
  const firstBusinessDays = new Set<string>();
  const monthMultipliers = new Map<string, number>();
  let prevMonth = "";
  for (const d of filtered) {
    const ym = d.slice(0, 7);
    if (ym !== prevMonth) {
      firstBusinessDays.add(d);
      prevMonth = ym;
      const score = scoreOf(d);
      const level = score != null ? getSentimentLevel(score) : "平温";
      monthMultipliers.set(d, multipliers[level] ?? 1.0);
    }
  }

  const multSum = [...monthMultipliers.values()].reduce((a, b) => a + b, 0);
  const baseContribution = multSum > 0 ? initialNav / multSum : 0;

  let units = 0;
  let cash = initialNav;
  let trades = 0;
  const navs: number[] = [];

  for (const d of filtered) {
    const price = priceMap.get(d);
    if (price == null) continue;
    if (firstBusinessDays.has(d)) {
      const mult = monthMultipliers.get(d) ?? 1.0;
      const buyAmount = Math.min(baseContribution * mult, cash);
      if (buyAmount > 0 && price > 0) {
        units += buyAmount / price;
        cash -= buyAmount;
        trades += 1;
      }
    }
    const nav = units * price + cash;
    navs.push(nav);
  }

  const last = navs[navs.length - 1];
  const firstDate = filtered[0];
  const lastDate = filtered[filtered.length - 1];
  const years =
    (new Date(lastDate).getTime() - new Date(firstDate).getTime()) /
    (365.25 * 24 * 3600 * 1000);

  const totalReturn = ((last - initialNav) / initialNav) * 100;
  const cagr =
    years > 0 ? (Math.pow(last / initialNav, 1 / years) - 1) * 100 : 0;
  const maxDd = computeMaxDrawdown(navs);
  const dailyReturns: number[] = [];
  for (let i = 1; i < navs.length; i++) {
    if (navs[i - 1] > 0) {
      dailyReturns.push((navs[i] - navs[i - 1]) / navs[i - 1]);
    }
  }
  const sharpe = computeSharpe(dailyReturns);

  return {
    totalReturn: r2(totalReturn),
    cagr: r2(cagr),
    maxDrawdown: r2(maxDd),
    sharpe: r2(sharpe),
    finalNav: last,
    trades,
  };
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------

interface Row {
  kind: "alloc" | "mod-dca";
  name: string;
  market: "JP" | "US";
  totalReturn: number;
  cagr: number;
  maxDrawdown: number;
  sharpe: number;
  alphaVsDca: number;
  maxDdVsDca: number; // 負 = DD が DCA より小さい = 良い
  winsOnReturn: boolean;
  winsBoth: boolean; // return 勝ち かつ maxDD 劣化 5pp 以内
}

function formatRow(r: Row): string {
  const win = r.winsBoth ? "✅" : r.winsOnReturn ? "🟢" : "  ";
  return [
    win,
    r.market.padEnd(3),
    r.name.padEnd(26),
    pct(r.totalReturn, 7),
    pct(r.cagr, 6),
    pct(r.maxDrawdown, 7),
    num(r.sharpe, 5),
    pct(r.alphaVsDca, 8),
    pct(r.maxDdVsDca, 8),
  ].join(" | ");
}

function pct(n: number, w: number): string {
  const s = n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;
  return s.padStart(w);
}

function num(n: number, w: number): string {
  return n.toFixed(2).padStart(w);
}

function tableHeader(): string {
  return [
    "  ",
    "MK ",
    "rule_name".padEnd(26),
    "totRet".padStart(7),
    " CAGR".padStart(6),
    " maxDD".padStart(7),
    "Sharp".padStart(5),
    "α vs DCA".padStart(8),
    "ΔmaxDD".padStart(8),
  ].join(" | ");
}

// ---------------------------------------------------------------------------

async function main() {
  console.log("=".repeat(120));
  console.log("積立（DCA）に勝てる温度ルールの探索 — Phase A");
  console.log("=".repeat(120));

  const endDate = new Date();
  const period1 = "2015-10-01";
  const period2 = endDate.toISOString().split("T")[0];

  console.log(`データ取得期間: ${period1} 〜 ${period2}`);
  console.log("");

  // Fetch price data
  console.log("Yahoo Finance から価格データ取得中...");
  const n225 = await fetchDailyCloses(yahooFinance, "^N225", period1, period2);
  console.log(`  ^N225: ${n225.size} 日`);
  await sleep(1000);
  const gspc = await fetchDailyCloses(yahooFinance, "^GSPC", period1, period2);
  console.log(`  ^GSPC: ${gspc.size} 日`);
  await sleep(1000);
  const vix = await fetchDailyCloses(yahooFinance, "^VIX", period1, period2);
  console.log(`  ^VIX:  ${vix.size} 日`);
  console.log("");

  // JP score map from temperature history JSON
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

  // ---- Allocation candidates ----
  const allocRows: Row[] = [];
  for (const cand of ALLOCATION_CANDIDATES) {
    const bands = buildBands(cand.ratios);
    const rule = { ...DEFAULT_PORTFOLIO_RULE, bands };

    for (const market of ["JP", "US"] as const) {
      const priceMap = market === "JP" ? n225 : gspc;
      const scoreOf = market === "JP" ? jpScoreOf : usScoreOf;
      const priceDates = [...priceMap.keys()].sort();
      const filtered = priceDates.filter((d) => d >= START_DATE);
      const result = simulatePortfolio({
        priceMap,
        priceDates: filtered,
        scoreOf,
        rule,
        startDate: filtered[0],
      });
      const s = result.stats;
      const winsOnReturn = s.alphaVsDca > 0;
      const maxDdVsDca = s.maxDrawdown - s.dcaMaxDrawdown;
      const winsBoth = winsOnReturn && maxDdVsDca >= -5 && maxDdVsDca <= 5;
      allocRows.push({
        kind: "alloc",
        name: cand.name,
        market,
        totalReturn: s.totalReturn,
        cagr: s.cagr,
        maxDrawdown: s.maxDrawdown,
        sharpe: s.sharpe,
        alphaVsDca: s.alphaVsDca,
        maxDdVsDca: r2(maxDdVsDca),
        winsOnReturn,
        winsBoth,
      });
    }
  }

  // ---- Modulated DCA candidates ----
  const dcaRows: Row[] = [];
  // plain DCA reference return (同じルールで simulatePortfolio を 1 回回して dcaReturn 取得)
  const jpPriceDates = [...n225.keys()].sort().filter((d) => d >= START_DATE);
  const usPriceDates = [...gspc.keys()].sort().filter((d) => d >= START_DATE);
  const jpBaselineSim = simulatePortfolio({
    priceMap: n225,
    priceDates: jpPriceDates,
    scoreOf: jpScoreOf,
    rule: DEFAULT_PORTFOLIO_RULE,
    startDate: jpPriceDates[0],
  });
  const usBaselineSim = simulatePortfolio({
    priceMap: gspc,
    priceDates: usPriceDates,
    scoreOf: usScoreOf,
    rule: DEFAULT_PORTFOLIO_RULE,
    startDate: usPriceDates[0],
  });
  const jpDcaReturn = jpBaselineSim.stats.dcaReturn;
  const jpDcaMaxDd = jpBaselineSim.stats.dcaMaxDrawdown;
  const usDcaReturn = usBaselineSim.stats.dcaReturn;
  const usDcaMaxDd = usBaselineSim.stats.dcaMaxDrawdown;

  for (const cand of DCA_CANDIDATES) {
    for (const market of ["JP", "US"] as const) {
      const priceMap = market === "JP" ? n225 : gspc;
      const scoreOf = market === "JP" ? jpScoreOf : usScoreOf;
      const priceDates = [...priceMap.keys()].sort();
      const result = simulateModulatedDca(
        priceMap,
        priceDates,
        scoreOf,
        cand.multipliers,
        DEFAULT_PORTFOLIO_RULE.initialNav
      );
      const dcaRef = market === "JP" ? jpDcaReturn : usDcaReturn;
      const dcaMaxDdRef = market === "JP" ? jpDcaMaxDd : usDcaMaxDd;
      const alpha = r2(result.totalReturn - dcaRef);
      const maxDdVsDca = r2(result.maxDrawdown - dcaMaxDdRef);
      const winsOnReturn = alpha > 0;
      const winsBoth = winsOnReturn && maxDdVsDca >= -5 && maxDdVsDca <= 5;
      dcaRows.push({
        kind: "mod-dca",
        name: cand.name,
        market,
        totalReturn: result.totalReturn,
        cagr: result.cagr,
        maxDrawdown: result.maxDrawdown,
        sharpe: result.sharpe,
        alphaVsDca: alpha,
        maxDdVsDca,
        winsOnReturn,
        winsBoth,
      });
    }
  }

  // ---- Print tables ----
  console.log("=".repeat(120));
  console.log("【A-1〜A-3】配分ルール候補（temp → 株/現金 比率）");
  console.log(
    `   凡例: ✅ = リターン勝ち+maxDD劣化±5pp以内 / 🟢 = リターンのみ勝ち`
  );
  console.log(
    `   JP DCA ベースライン: +${jpDcaReturn.toFixed(1)}% / maxDD ${jpDcaMaxDd.toFixed(1)}%`
  );
  console.log(
    `   US DCA ベースライン: +${usDcaReturn.toFixed(1)}% / maxDD ${usDcaMaxDd.toFixed(1)}%`
  );
  console.log("=".repeat(120));
  console.log(tableHeader());
  console.log("-".repeat(120));
  // JP をまとめて、次に US をまとめて表示
  for (const market of ["JP", "US"] as const) {
    for (const r of allocRows.filter((r) => r.market === market)) {
      console.log(formatRow(r));
    }
    console.log("-".repeat(120));
  }

  console.log("");
  console.log("=".repeat(120));
  console.log("【A-4】温度連動 DCA 候補（月次購入額を温度で変動、総拠出額は固定）");
  console.log("=".repeat(120));
  console.log(tableHeader());
  console.log("-".repeat(120));
  for (const market of ["JP", "US"] as const) {
    for (const r of dcaRows.filter((r) => r.market === market)) {
      console.log(formatRow(r));
    }
    console.log("-".repeat(120));
  }

  // ---- Winners summary ----
  const winners = [...allocRows, ...dcaRows].filter((r) => r.winsOnReturn);
  console.log("");
  console.log("=".repeat(120));
  console.log(`🏆 リターンで DCA に勝ったルール: ${winners.length} 件`);
  console.log("=".repeat(120));
  if (winners.length === 0) {
    console.log(
      "  → 該当なし。温度連動 DCA 路線 or ルール再設計が必要かもしれません。"
    );
  } else {
    console.log(tableHeader());
    console.log("-".repeat(120));
    // α vs DCA 降順
    for (const r of [...winners].sort((a, b) => b.alphaVsDca - a.alphaVsDca)) {
      console.log(formatRow(r));
    }
  }

  // 両市場で勝ってるルール
  const jpWinners = new Set(
    winners.filter((r) => r.market === "JP").map((r) => `${r.kind}:${r.name}`)
  );
  const usWinners = new Set(
    winners.filter((r) => r.market === "US").map((r) => `${r.kind}:${r.name}`)
  );
  const bothWin: string[] = [];
  for (const k of jpWinners) if (usWinners.has(k)) bothWin.push(k);
  console.log("");
  console.log(`🌏 JP/US 両市場でリターン勝ち: ${bothWin.length} 件`);
  for (const k of bothWin) {
    console.log(`   - ${k}`);
  }
  console.log("");
  console.log("完了。");
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
