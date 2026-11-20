/**
 * 需給の温度は将来リターンと関係があるか、の試算。
 *
 * 目的: ゲージ下で参考表示している「需給の温度」（海外投資家フロー 4 週累計・
 * 信用買い残の 4 週変化の平均）を、市場温度と同じ格で見せてよいかを決める材料を作る。
 *
 * 見ること:
 *   1. 各指標の温度帯ごとの 1・3・6 か月後の日経225 リターン（全日の基準と比べる）
 *   2. 市場温度（C1）と重ねたとき、C1 が同じ帯の中で需給による差が出るか
 *   3. 順位相関（全体と、C1 の帯の中での平均）
 *   4. 前半・後半で結果が保たれるか
 *   5. 「需給が冷たい」回（20 営業日以内はまとめる）ごとの結果
 *
 * 入力:
 *   - Yahoo Finance ^N225 日足（1985 年〜。C1 の 125 日平均の助走に使う）
 *   - src/data/margin-ratio-history.json（信用買い残、2002 年〜週次）
 *   - src/data/investor-flow-history.json（海外投資家の売買差引、2016 年〜週次）
 *
 * 実行: npm run analyze:supply
 * 永続化: なし（コンソール出力のみ）
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses } from "./_lib/shared";
import { dropIntradayToday, toJstIsoDate } from "./_lib/trading-date";
import {
  COARSE_BANDS,
  HORIZON_KEYS,
  SCORE_BANDS,
  bandOf,
  buildSupplyDays,
  episodeStarts,
  forwardReturns,
  returnStats,
  spearman,
  type FlowHistoryWeek,
  type HorizonKey,
  type MarginHistoryWeek,
  type ReturnStats,
  type SupplyDay,
} from "./_lib/supply-temperature-analysis";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const DATA_DIR = resolve(__dirname, "../src/data");
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(DATA_DIR, name), "utf-8")) as T;

type Indicator = {
  label: string;
  score: (d: SupplyDay) => number | null;
};

const INDICATORS: Indicator[] = [
  { label: "市場温度(C1)", score: (d) => d.c1 },
  { label: "需給の温度", score: (d) => d.supplyScore },
  { label: "海外勢フロー", score: (d) => d.flowScore },
  { label: "信用買残4週", score: (d) => d.marginScore },
];

const pad = (s: string | number, n: number) => String(s).padStart(n);
const pct = (v: number | null) => (v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`);
const fmt = (s: ReturnStats, base?: number | null) =>
  s.n === 0
    ? pad("—", 22)
    : `${pad(pct(s.avg), 7)} ${pad(base != null && s.avg != null ? `(${pct(s.avg - base)})` : "", 9)} ${pad(`${Math.round(s.winRate!)}%`, 4)}`;

function withScore(days: readonly SupplyDay[], ind: Indicator) {
  return days.filter((d) => ind.score(d) != null);
}

function printBandTable(title: string, days: readonly SupplyDay[], ind: Indicator) {
  const target = withScore(days, ind);
  if (target.length === 0) return;
  console.log(
    `\n[${title}] ${target.length} 日（${target[0].date}〜${target.at(-1)!.date}）`,
  );
  console.log(
    `  ${"帯".padEnd(7)}${pad("日数", 6)}${pad("回数", 5)}   ${HORIZON_KEYS.map((h) => `${h}: 平均 (基準差) 上昇`.padEnd(24)).join("")}`,
  );
  const base = Object.fromEntries(
    HORIZON_KEYS.map((h) => [h, returnStats(forwardReturns(target, h)).avg]),
  ) as Record<HorizonKey, number | null>;
  for (const b of SCORE_BANDS) {
    const inBand = (d: SupplyDay) => {
      const v = ind.score(d);
      return v != null && bandOf(v, SCORE_BANDS) === b;
    };
    const hit = target.filter(inBand);
    // 欠損日を詰めると離れた回がまとまるので、欠損を含む元の並びで数える
    const episodes = episodeStarts(days, inBand).length;
    console.log(
      `  ${b.key.padEnd(7)}${pad(hit.length, 6)}${pad(episodes, 5)}   ${HORIZON_KEYS.map((h) => fmt(returnStats(forwardReturns(hit, h)), base[h]).padEnd(24)).join("")}`,
    );
  }
  console.log(
    `  ${"全日".padEnd(7)}${pad(target.length, 6)}${pad("", 5)}   ${HORIZON_KEYS.map((h) => fmt(returnStats(forwardReturns(target, h))).padEnd(24)).join("")}`,
  );
}

function printJoint(title: string, days: readonly SupplyDay[], ind: Indicator, h: HorizonKey) {
  const target = withScore(days, ind).filter((d) => d.forward[h] != null);
  console.log(`\n[${title}] ${h} 後の平均リターン（日数）。行 = 市場温度(C1)、列 = ${ind.label}`);
  console.log(
    `  ${"C1".padEnd(7)}${COARSE_BANDS.map((b) => pad(b.key, 18)).join("")}${pad("行全体", 18)}  熱−冷`,
  );
  for (const row of SCORE_BANDS) {
    const inRow = target.filter((d) => bandOf(d.c1, SCORE_BANDS) === row);
    const cells = COARSE_BANDS.map((col) =>
      returnStats(forwardReturns(inRow.filter((d) => bandOf(ind.score(d)!, COARSE_BANDS) === col), h)),
    );
    const all = returnStats(forwardReturns(inRow, h));
    const cell = (s: ReturnStats) => pad(s.n === 0 ? "—" : `${pct(s.avg)} (${s.n})`, 18);
    const spread =
      cells[0].n >= 30 && cells[2].n >= 30 ? pct(cells[2].avg! - cells[0].avg!) : "件数不足";
    console.log(`  ${row.key.padEnd(7)}${cells.map(cell).join("")}${cell(all)}  ${spread}`);
  }
}

function printCorrelation(title: string, days: readonly SupplyDay[]) {
  console.log(`\n[${title}] スコアと前方リターンの順位相関（全体 / C1 の帯の中での加重平均）`);
  console.log(`  ${"指標".padEnd(10)}${HORIZON_KEYS.map((h) => pad(`${h} 全体`, 10) + pad("C1帯内", 9)).join("")}`);
  for (const ind of INDICATORS) {
    const cols = HORIZON_KEYS.map((h) => {
      const t = withScore(days, ind).filter((d) => d.forward[h] != null);
      const all = spearman(t.map((d) => ind.score(d)!), t.map((d) => d.forward[h]!));
      let wsum = 0;
      let n = 0;
      for (const b of SCORE_BANDS) {
        const g = t.filter((d) => bandOf(d.c1, SCORE_BANDS) === b);
        const r = spearman(g.map((d) => ind.score(d)!), g.map((d) => d.forward[h]!));
        if (r == null || g.length < 30) continue;
        wsum += r * g.length;
        n += g.length;
      }
      const within = ind.label.startsWith("市場温度") || n === 0 ? null : wsum / n;
      const f = (v: number | null) => (v == null ? "—" : v.toFixed(2));
      return pad(f(all), 10) + pad(f(within), 9);
    });
    console.log(`  ${ind.label.padEnd(10)}${cols.join("")}`);
  }
}

function printEpisodes(title: string, days: readonly SupplyDay[], pick: (d: SupplyDay) => boolean) {
  const starts = episodeStarts(days, pick);
  console.log(`\n[${title}] ${starts.length} 回（20 営業日以内はまとめ、最初の日に買った場合）`);
  console.log(`  ${"開始日".padEnd(10)} ${pad("C1", 3)} ${pad("需給", 4)} ${pad("海外4週", 9)} ${pad("買残4週", 8)}  ${HORIZON_KEYS.map((h) => pad(h, 7)).join("")}`);
  for (const d of starts) {
    console.log(
      `  ${d.date} ${pad(d.c1, 3)} ${pad(d.supplyScore ?? "—", 4)} ${pad(d.flow4w == null ? "—" : Math.round(d.flow4w), 9)} ${pad(d.marginChange4w == null ? "—" : pct(d.marginChange4w), 8)}  ${HORIZON_KEYS.map((h) => pad(pct(d.forward[h]), 7)).join("")}`,
    );
  }
  const s = HORIZON_KEYS.map((h) => {
    const st = returnStats(forwardReturns(starts, h));
    return `${h} 平均 ${pct(st.avg)} 上昇 ${st.winRate == null ? "—" : Math.round(st.winRate)}%（${st.n} 回）`;
  });
  console.log(`  → ${s.join(" / ")}`);
}

async function main() {
  const now = new Date();
  const period2 = toJstIsoDate(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const nikkei = await fetchDailyCloses(yahooFinance, "^N225", "1985-01-01", period2);
  dropIntradayToday(nikkei, now);

  const margin = readJson<{ weekly: MarginHistoryWeek[] }>("margin-ratio-history.json").weekly;
  const flow = readJson<{ weeks: FlowHistoryWeek[] }>("investor-flow-history.json").weeks;
  const all = buildSupplyDays(nikkei, margin, flow);
  const marginEra = all.filter((d) => d.marginScore != null);
  const flowEra = all.filter((d) => d.flowScore != null);

  console.log("需給の温度 × 日経225 の前方リターン");
  console.log(`日経: ${nikkei.size} 日 / 信用残: ${margin.length} 週 / 海外勢: ${flow.length} 週`);
  console.log("各日の値は、その日の取引前に知れた JPX の週だけで計算（公表の遅れを再現）。");
  console.log("（基準差）= 同じ期間の全日平均との差。日数ベースは重なりが大きいので、回数も見ること");

  console.log("\n━━ 1. 温度帯ごとの前方リターン ━━");
  printBandTable("市場温度(C1)・海外勢がそろう期間", flowEra, INDICATORS[0]);
  for (const ind of INDICATORS.slice(1)) {
    printBandTable(`${ind.label}`, all, ind);
  }
  printBandTable("市場温度(C1)・信用残がそろう期間", marginEra, INDICATORS[0]);

  console.log("\n━━ 2. 市場温度(C1)と重ねる ━━");
  for (const ind of INDICATORS.slice(1)) {
    for (const h of ["3m", "6m"] as HorizonKey[]) {
      printJoint(ind.label, all, ind, h);
    }
  }

  console.log("\n━━ 3. 順位相関 ━━");
  printCorrelation(`海外勢がそろう期間 ${flowEra[0]?.date}〜`, flowEra);
  printCorrelation(`信用残がそろう期間 ${marginEra[0]?.date}〜`, marginEra);

  console.log("\n━━ 4. 前半・後半 ━━");
  for (const [label, era, ind] of [
    ["信用買残4週", marginEra, INDICATORS[3]],
    ["需給の温度", flowEra, INDICATORS[1]],
    ["海外勢フロー", flowEra, INDICATORS[2]],
  ] as const) {
    if (era.length === 0) continue;
    const mid = era[Math.floor(era.length / 2)].date;
    printBandTable(`${label}・前半（〜${mid} の前日）`, era.filter((d) => d.date < mid), ind);
    printBandTable(`${label}・後半（${mid}〜）`, era.filter((d) => d.date >= mid), ind);
  }

  console.log("\n━━ 5. 回数ベース ━━");
  printEpisodes("需給の温度 ≤20", all, (d) => d.supplyScore != null && d.supplyScore <= 20);
  printEpisodes("信用買残4週 ≤10（買残 -12% 以下）", all, (d) => d.marginScore != null && d.marginScore <= 10);
  printEpisodes(
    "C1 ≤20 かつ 需給 ≤35",
    all,
    (d) => d.c1 <= 20 && d.supplyScore != null && d.supplyScore <= 35,
  );
  printEpisodes(
    "C1 ≤20 かつ 需給 ≥36",
    all,
    (d) => d.c1 <= 20 && d.supplyScore != null && d.supplyScore >= 36,
  );

  const latest = all.at(-1)!;
  console.log(
    `\n最新 ${latest.date}: C1 ${latest.c1} / 需給 ${latest.supplyScore ?? "—"} / 海外4週 ${latest.flow4w == null ? "—" : Math.round(latest.flow4w)} 億円 / 買残4週 ${pct(latest.marginChange4w)}`,
  );
}

main().catch((err) => {
  console.error("❌ エラー:", err);
  process.exit(1);
});
