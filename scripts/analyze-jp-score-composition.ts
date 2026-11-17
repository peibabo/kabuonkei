/**
 * 日本版スコアの構成要素の組み合わせを、過去データで比べる試算。
 *
 * 問い: 判定に使うスコアを C1 単独 / C1+C5 / C1+騰落レシオ などにしたとき、
 *   (1) 極寒・過熱になった後の日経225 のリターンはどうだったか
 *   (2) 急落日（前日比 -5% 以下など）を極寒として拾えたか
 *
 * 要素:
 *   c1    日経225 の 125 日移動平均乖離（±15%）— 市場温度（C1）
 *   c5    ドル円 50 日モメンタム（±5%）— 旧 C5
 *   ad    騰落レシオ（25 日、70〜130）— 現在の日経225 構成銘柄から計算
 *   ma25  日経225 の 25 日移動平均乖離（±8%）
 *
 * 注意:
 *   - 騰落レシオは「現在の」構成銘柄で過去を計算する（入替・上場廃止は反映されない）。
 *     一般に言う騰落レシオ（東証プライム全銘柄）とも母集団が違う
 *   - 極寒・過熱の通知回数は少なく、リターンの平均は数回の局面に左右される
 *
 * 実行: npm run analyze:jp-composition [-- --cache <dir>] [--from 2007-01-01]
 *   --cache を付けると取得した終値をそのディレクトリに保存し、次回はそれを読む
 * 永続化: なし（コンソール出力のみ。スコア本体・データファイルは変更しない）
 */

import YahooFinance from "yahoo-finance2";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fetchDailyCloses, sleep } from "./_lib/shared";
import {
  buildElementRows,
  candidateScore,
  forwardReturn,
  maxDrawdownAfter,
  summarizeReturns,
  walkStates,
  type Candidate,
  type ElementId,
  type ElementRow,
} from "./_lib/score-composition";
import { COLD_THRESHOLD, HOT_THRESHOLD } from "../src/lib/alerts/state-transition";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const DATA_DIR = resolve(__dirname, "../src/data");

const CANDIDATES: Candidate[] = [
  { id: "c1", label: "C1単独", elements: ["c1"] },
  { id: "c1c5", label: "C1+C5(現行)", elements: ["c1", "c5"] },
  { id: "c1ad", label: "C1+騰落", elements: ["c1", "ad"] },
  { id: "c1c5ad", label: "C1+C5+騰落", elements: ["c1", "c5", "ad"] },
  { id: "c1ma25", label: "C1+25日乖離", elements: ["c1", "ma25"] },
  { id: "c1adma25", label: "C1+騰落+25日", elements: ["c1", "ad", "ma25"] },
];
const ELEMENT_LABELS: Record<ElementId, string> = {
  c1: "c1 125日乖離",
  c5: "c5 ドル円",
  ad: "ad 騰落レシオ",
  ma25: "ma25 25日乖離",
};
const HORIZONS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
] as const;

function argValue(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

type Closes = Map<string, number>;

async function loadCloses(
  symbol: string,
  from: string,
  to: string,
  cacheDir: string | null,
): Promise<Closes | null> {
  const cachePath = cacheDir ? resolve(cacheDir, `${symbol.replace(/[^\w.]/g, "_")}.json`) : null;
  if (cachePath && existsSync(cachePath)) {
    return new Map(JSON.parse(readFileSync(cachePath, "utf-8")) as Array<[string, number]>);
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const closes = await fetchDailyCloses(yahooFinance, symbol, from, to);
      if (cachePath) writeFileSync(cachePath, JSON.stringify([...closes]), "utf-8");
      await sleep(150);
      return closes;
    } catch (err) {
      if (attempt === 2) {
        console.warn(`  取得失敗 ${symbol}: ${(err as Error).message}`);
        return null;
      }
      await sleep(1500);
    }
  }
  return null;
}

const pad = (s: string | number, n: number) => String(s).padStart(n);
const padEnd = (s: string, n: number) => s + " ".repeat(Math.max(0, n - [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 2 : 1), 0)));
const pct = (n: number, digits = 1) =>
  Number.isNaN(n) ? "   —" : `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
const quantile = (values: number[], p: number) => {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
};

interface Evaluated {
  candidate: Candidate;
  scores: Array<number | null>;
  states: ReturnType<typeof walkStates>;
}

function evaluate(rows: ElementRow[]): Evaluated[] {
  return CANDIDATES.map((candidate) => {
    const scores = rows.map((r) => candidateScore(r, candidate));
    return { candidate, scores, states: walkStates(scores) };
  });
}

function printReturnTable(
  title: string,
  rows: ElementRow[],
  evaluated: Evaluated[],
  pick: (e: Evaluated) => number[],
  withDrawdown: boolean,
) {
  const dates = rows.map((r) => r.date);
  const closes = rows.map((r) => r.close);
  console.log(`\n${title}`);
  console.log(
    `  ${padEnd("候補", 16)}${pad("回数", 5)} │${HORIZONS.map((h) => `${pad(h.label + "平均", 9)}${pad("中央", 8)}${pad("勝率", 6)}`).join(" │")}${withDrawdown ? ` │${pad("1M内の最大下落(平均)", 20)}` : ""}`,
  );
  for (const e of evaluated) {
    const idx = pick(e);
    const cells = HORIZONS.map((h) => {
      const s = summarizeReturns(idx.map((i) => forwardReturn(dates, closes, i, h.days)));
      return `${pad(pct(s.avg), 9)}${pad(pct(s.median), 8)}${pad(Number.isNaN(s.winRate) ? "—" : `${Math.round(s.winRate)}%`, 6)}`;
    });
    const dd = withDrawdown && idx.length > 0
      ? ` │${pad(pct(idx.reduce((a, i) => a + maxDrawdownAfter(dates, closes, i, 30), 0) / idx.length), 20)}`
      : "";
    console.log(`  ${padEnd(e.candidate.label, 16)}${pad(idx.length, 5)} │${cells.join(" │")}${dd}`);
  }
}

function report(periodLabel: string, rows: ElementRow[]) {
  const dates = rows.map((r) => r.date);
  const closes = rows.map((r) => r.close);
  const evaluated = evaluate(rows);
  const allDays = rows.map((_, i) => i);

  console.log(`\n\n════ ${periodLabel}: ${rows[0].date}〜${rows.at(-1)!.date}（${rows.length} 営業日） ════`);

  console.log("\n━━ 1. スコアの分布と通知回数（閾値・ヒステリシスはアラートと同じ） ━━");
  console.log(
    `  ${padEnd("候補", 16)}${["最小", "p5", "中央", "p95", "最大"].map((h) => pad(h, 5)).join("")}  ≤${COLD_THRESHOLD}の日      ≥${HOT_THRESHOLD}の日     極寒通知 過熱通知`,
  );
  for (const e of evaluated) {
    const v = e.scores.filter((x): x is number => x != null);
    const share = (n: number) => `${pad(n, 5)}(${pad(((n / v.length) * 100).toFixed(1), 4)}%)`;
    console.log(
      `  ${padEnd(e.candidate.label, 16)}${[0, 0.05, 0.5, 0.95, 1].map((p) => pad(quantile(v, p), 6)).join("")}  ${share(v.filter((x) => x <= COLD_THRESHOLD).length)} ${share(v.filter((x) => x >= HOT_THRESHOLD).length)} ${pad(e.states.coldFires.length, 7)} ${pad(e.states.hotFires.length, 8)}`,
    );
  }

  console.log("\n━━ 2. その後の日経225 のリターン ━━");
  const base = HORIZONS.map((h) => summarizeReturns(allDays.map((i) => forwardReturn(dates, closes, i, h.days))));
  console.log(
    `  基準（全営業日）: ${HORIZONS.map((h, k) => `${h.label} 平均 ${pct(base[k].avg)} / 中央 ${pct(base[k].median)} / 勝率 ${Math.round(base[k].winRate)}%`).join("  ｜  ")}`,
  );
  printReturnTable("[極寒通知が出た日（平温 → 極寒に入った日）]", rows, evaluated, (e) => e.states.coldFires, true);
  printReturnTable(`[スコア ≤${COLD_THRESHOLD} の全営業日]（同じ局面の日が重複して数えられる）`, rows, evaluated, (e) => allDays.filter((i) => e.scores[i] != null && e.scores[i]! <= COLD_THRESHOLD), false);
  printReturnTable("[過熱通知が出た日（平温 → 過熱に入った日）]", rows, evaluated, (e) => e.states.hotFires, false);
  printReturnTable(`[スコア ≥${HOT_THRESHOLD} の全営業日]`, rows, evaluated, (e) => allDays.filter((i) => e.scores[i] != null && e.scores[i]! >= HOT_THRESHOLD), false);

  console.log("\n━━ 3. 急落日を極寒として拾えたか（その日の引け時点の状態） ━━");
  for (const threshold of [-5, -4, -3]) {
    const crash = allDays.filter((i) => rows[i].ret <= threshold);
    console.log(
      `  前日比 ≤${threshold}% の ${pad(crash.length, 3)} 日のうち極寒域: ${evaluated.map((e) => `${e.candidate.label} ${crash.filter((i) => e.states.states[i] === "cold").length}`).join(" / ")}`,
    );
  }
  const crash5 = allDays.filter((i) => rows[i].ret <= -5);
  console.log(`\n  [前日比 ≤-5% の日ごとのスコア]（* = 極寒域）`);
  console.log(`  ${padEnd("日付", 11)}${pad("前日比", 8)}  ${evaluated.map((e) => padEnd(e.candidate.label, 15)).join("")}`);
  for (const i of crash5) {
    console.log(
      `  ${rows[i].date} ${pad(pct(rows[i].ret, 2), 8)}  ${evaluated.map((e) => padEnd(`${pad(e.scores[i] ?? "—", 3)}${e.states.states[i] === "cold" ? "*" : " "}`, 15)).join("")}`,
    );
  }

  console.log("\n━━ 4. 極寒通知の日付 ━━");
  for (const e of evaluated) {
    console.log(`  ${padEnd(e.candidate.label, 16)}${e.states.coldFires.map((i) => `${rows[i].date}(${e.scores[i]})`).join(" ")}`);
  }
}

async function main() {
  const from = argValue("--from") ?? "2007-01-01";
  const to = new Date().toISOString().slice(0, 10);
  const cacheArg = argValue("--cache");
  const cacheDir = cacheArg ? resolve(cacheArg) : null;
  if (cacheDir) mkdirSync(cacheDir, { recursive: true });

  const codes = (
    JSON.parse(readFileSync(resolve(DATA_DIR, "nikkei225-constituents.json"), "utf-8")) as { codes: string[] }
  ).codes;

  console.log("日本版スコア 構成要素の組み合わせ試算");
  console.log(`取得: ^N225 / USDJPY=X / 構成 ${codes.length} 銘柄（${from}〜${to}）${cacheDir ? ` cache=${cacheDir}` : ""}`);

  const nikkei = await loadCloses("^N225", from, to, cacheDir);
  const usdJpy = await loadCloses("USDJPY=X", from, to, cacheDir);
  if (!nikkei || !usdJpy) throw new Error("日経225 またはドル円の取得に失敗");
  const stocks: Closes[] = [];
  for (const code of codes) {
    const closes = await loadCloses(`${code}.T`, from, to, cacheDir);
    if (closes && closes.size > 0) stocks.push(closes);
  }
  console.log(`銘柄の取得成功: ${stocks.length}/${codes.length}`);

  const rows = buildElementRows({ nikkei, usdJpy, stocks });

  // --- 検算: 公開中の過去推移と突き合わせる ---
  // 2026-11-17 以降の推移ファイルは score = C1 で c1 / c5 を持たない。それ以前の形式（score = C1+C5、
  // c1 / c5 あり）でも検算できるよう、c1 がなければ score を C1 として比べる
  const history = (
    JSON.parse(readFileSync(resolve(DATA_DIR, "japan-temperature-history.json"), "utf-8")) as {
      daily: Array<{ date: string; score: number; c1?: number; c5?: number }>;
    }
  ).daily;
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const overlap = history.filter((h) => byDate.has(h.date));
  const near = (a: number | null | undefined, b: number | null | undefined, tol: number) =>
    a == null || b == null ? a == null && b == null : Math.abs(a - b) <= tol;
  const withC5 = overlap.filter((h) => h.c5 != null);
  console.log(
    `検算: 公開中の過去推移（${history.length} 日）のうち ${overlap.length} 日が重複。` +
      `C1 一致（±1）${overlap.filter((h) => near(h.c1 ?? h.score, byDate.get(h.date)!.elements.c1, 1)).length} 日` +
      (withC5.length > 0
        ? ` / C5 一致（±1）${withC5.filter((h) => near(h.c5, byDate.get(h.date)!.elements.c5, 1)).length}/${withC5.length} 日`
        : ""),
  );

  // --- 要素の分布 ---
  console.log("\n━━ 0. 要素ごとの分布（全期間） ━━");
  console.log(`  ${padEnd("要素", 16)}${["日数", "最小", "p5", "p25", "中央", "p75", "p95", "最大"].map((h) => pad(h, 6)).join("")}   =0の日 =100の日`);
  for (const id of Object.keys(ELEMENT_LABELS) as ElementId[]) {
    const v = rows.map((r) => r.elements[id]).filter((x): x is number => x != null);
    console.log(
      `  ${padEnd(ELEMENT_LABELS[id], 16)}${pad(v.length, 6)}${[0, 0.05, 0.25, 0.5, 0.75, 0.95, 1].map((p) => pad(quantile(v, p), 6)).join("")}  ${pad(v.filter((x) => x === 0).length, 6)} ${pad(v.filter((x) => x === 100).length, 7)}`,
    );
  }
  const adRaw = rows.map((r) => r.adRatio).filter((x): x is number => x != null);
  const maRaw = rows.map((r) => r.ma25Pct).filter((x): x is number => x != null);
  console.log(
    `  騰落レシオ（生値）: p1 ${quantile(adRaw, 0.01).toFixed(0)} / p5 ${quantile(adRaw, 0.05).toFixed(0)} / 中央 ${quantile(adRaw, 0.5).toFixed(0)} / p95 ${quantile(adRaw, 0.95).toFixed(0)} / p99 ${quantile(adRaw, 0.99).toFixed(0)}`,
  );
  console.log(
    `  25日乖離率（生値）: p1 ${quantile(maRaw, 0.01).toFixed(1)}% / p5 ${quantile(maRaw, 0.05).toFixed(1)}% / 中央 ${quantile(maRaw, 0.5).toFixed(1)}% / p95 ${quantile(maRaw, 0.95).toFixed(1)}% / p99 ${quantile(maRaw, 0.99).toFixed(1)}%`,
  );

  const withAd = rows.filter((r) => r.elements.ad != null);
  report("全期間", rows.slice(rows.indexOf(withAd[0])));
  const siteStart = history[0].date;
  report("公開中の過去推移と同じ期間", rows.filter((r) => r.date >= siteStart));
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
