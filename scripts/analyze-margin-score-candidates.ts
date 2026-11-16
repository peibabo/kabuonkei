/**
 * 信用倍率スコア（C3）の新旧定義の試算。
 *
 * 目的: 5要素版の需給系が「水準」ベースで上に張り付く問題に対し、
 * 「変化」ベースの定義に替えたらどう動くかを、長期履歴のある信用倍率だけで比べる。
 *
 * 比較する定義（すべて 0–100、その週までのデータだけで決まる）:
 *   旧  倍率の水準（2〜10 倍の線形、現行の normalizeMarginRatio）
 *   A   倍率の 52 週レンジ内の位置
 *   B   倍率の前週比（±15%）
 *   C   買残の 52 週レンジ内の位置
 *   D   買残の 4 週変化率（±15%）
 *
 * 入力（ローカル JSON のみ。外部取得なし）:
 *   - src/data/margin-ratio-history.json（2002〜週次）
 *   - src/data/japan-fg-snapshots.json（5要素スナップショット）
 *   - src/data/japan-temperature-history.json（営業日カレンダーとして使用）
 *
 * 実行: npm run analyze:margin-score
 * 永続化: なし（コンソール出力のみ。スコア本体・スナップショットは変更しない）
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import {
  CANDIDATE_IDS,
  CANDIDATE_LABELS,
  computeCandidateRows,
  quantile,
  rowAvailableOn,
  totalWithMarginScore,
  withAvailability,
  type CandidateId,
  type CandidateRow,
  type MarginWeek,
} from "./_lib/margin-score-candidates";
import type { SnapshotFile } from "./_lib/snapshot-merge";

const DATA_DIR = resolve(__dirname, "../src/data");
const readJson = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(DATA_DIR, name), "utf-8")) as T;

/** 急落局面（急落を含む週の最終営業日） */
const EPISODES: Array<{ label: string; week: string }> = [
  { label: "リーマン後", week: "2008-10-10" },
  { label: "東日本大震災", week: "2011-03-18" },
  { label: "2016年初の急落", week: "2016-02-12" },
  { label: "2018年末", week: "2018-12-28" },
  { label: "コロナ急落", week: "2020-03-13" },
  { label: "2024年8月", week: "2024-08-09" },
  { label: "2025年4月", week: "2025-04-11" },
  { label: "2026年11月", week: "2026-11-06" },
];

/** C3 の閾値を現行（fear 2.0 / greed 10.0）に変えた日 */
const CURRENT_THRESHOLD_SINCE = "2026-06-23";

const pad = (s: string | number, n: number) => String(s).padStart(n);
const signed = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function printDistribution(label: string, rows: CandidateRow[]) {
  console.log(`\n[${label}] ${rows.length} 週（${rows[0].date}〜${rows.at(-1)!.date}）`);
  console.log(
    `  ${"定義".padEnd(12)}${["最小", "p5", "p25", "中央", "p75", "p95", "最大"].map((h) => pad(h, 5)).join("")}   ≤20の週  ≥80の週  =0  =100`,
  );
  for (const id of CANDIDATE_IDS) {
    const v = rows.map((r) => r.scores[id]);
    const qs = [0, 0.05, 0.25, 0.5, 0.75, 0.95, 1].map((p) => quantile(v, p));
    const share = (n: number) => `${pad(n, 4)}(${pad(Math.round((n / v.length) * 100), 2)}%)`;
    console.log(
      `  ${CANDIDATE_LABELS[id].padEnd(12)}${qs.map((q) => pad(q, 6)).join("")}   ${share(v.filter((x) => x <= 20).length)} ${share(v.filter((x) => x >= 80).length)} ${pad(v.filter((x) => x === 0).length, 3)} ${pad(v.filter((x) => x === 100).length, 4)}`,
    );
  }
}

function printRowHeader() {
  console.log(
    `  ${"週末日".padEnd(10)} ${pad("倍率", 5)} ${pad("倍率前週比", 8)} ${pad("買残4週比", 8)}  ${CANDIDATE_IDS.map((id) => pad(CANDIDATE_LABELS[id].split(":")[0], 3)).join(" ")}`,
  );
}

function printRow(r: CandidateRow, mark = "") {
  console.log(
    `  ${r.date} ${pad(r.ratio.toFixed(2), 6)} ${pad(signed(r.ratioWowPct), 10)} ${pad(signed(r.buyChange4wPct), 10)}  ${CANDIDATE_IDS.map((id) => pad(r.scores[id], 3)).join(" ")} ${mark}`,
  );
}

function main() {
  const weeks = readJson<{ weekly: MarginWeek[] }>("margin-ratio-history.json").weekly;
  const snapshots = readJson<SnapshotFile>("japan-fg-snapshots.json").snapshots;
  const tradingDays = readJson<{ daily: Array<{ date: string }> }>(
    "japan-temperature-history.json",
  ).daily.map((d) => d.date);

  const rows = computeCandidateRows(weeks);
  console.log("信用倍率スコア（C3）新旧定義の試算");
  console.log(`入力: ${weeks.length} 週（${weeks[0].date}〜${weeks.at(-1)!.date}）`);
  console.log(
    `定義: ${CANDIDATE_IDS.map((id) => CANDIDATE_LABELS[id]).join(" / ")}`,
  );

  // --- 1. 分布 ---
  console.log("\n━━ 1. スコアの分布（張り付きの有無） ━━");
  printDistribution("全期間", rows);
  printDistribution("2016年〜", rows.filter((r) => r.date >= "2016-01-01"));
  const threeYearsAgo = `${Number(rows.at(-1)!.date.slice(0, 4)) - 3}${rows.at(-1)!.date.slice(4)}`;
  printDistribution("直近3年", rows.filter((r) => r.date > threeYearsAgo));

  // --- 2. 急落局面 ---
  console.log("\n━━ 2. 急落局面の前後（★ が急落を含む週） ━━");
  for (const ep of EPISODES) {
    const i = rows.findIndex((r) => r.date >= ep.week);
    if (i < 0) continue;
    console.log(`\n[${ep.label}]`);
    printRowHeader();
    for (const r of rows.slice(Math.max(0, i - 2), i + 3)) {
      printRow(r, r === rows[i] ? "★" : "");
    }
  }

  // --- 3. 5要素スナップショットへの当てはめ ---
  console.log("\n━━ 3. 5要素の総合スコア（C3 だけ差し替え、公表ラグを再現） ━━");
  const full = snapshots.filter((s) => s.availableCount === 5);
  const recentRows = withAvailability(
    rows.filter((r) => r.date >= "2025-10-01"),
    tradingDays,
  );
  const days = full
    .map((entry) => ({ entry, row: rowAvailableOn(entry.date, recentRows) }))
    .filter((d): d is { entry: (typeof full)[number]; row: CandidateRow } => d.row != null);

  // 2026-06-23 に C3 の閾値を greed 6.0 → 10.0 へ変えた。それ以前の記録値は旧閾値のまま
  // （過去の値は書き換えない方針）なので、検算は現行閾値で記録された日だけで行う。
  const sinceCurrent = days.filter((d) => d.entry.date >= CURRENT_THRESHOLD_SINCE);
  const mismatch = sinceCurrent.filter(
    (d) => d.row.scores.old !== d.entry.components.marginRatio,
  );
  console.log(
    `対象: 5要素が揃う ${full.length} 日のうち ${days.length} 日（${days[0].entry.date}〜${days.at(-1)!.entry.date}）`,
  );
  console.log(
    `検算: ${CURRENT_THRESHOLD_SINCE} 以降（現行閾値）の ${sinceCurrent.length} 日で、公表ラグを再現した旧定義の C3 が記録値と一致 ${sinceCurrent.length - mismatch.length}/${sinceCurrent.length} 日` +
      (mismatch.length > 0
        ? `（不一致: ${mismatch.slice(0, 5).map((d) => `${d.entry.date} 記録${d.entry.components.marginRatio}/再現${d.row.scores.old}`).join(", ")}${mismatch.length > 5 ? " ほか" : ""}）`
        : ""),
  );
  console.log(
    `      それ以前の ${days.length - sinceCurrent.length} 日は旧閾値（greed=6.0）で記録されており、「記録」と「旧」は一致しない`,
  );

  console.log(
    `\n  ${"定義".padEnd(12)} C3:最小 中央 最大 │ 総合:最小 中央 最大  ≤20の日 ≤35の日 ≥65の日`,
  );
  const summarize = (label: string, c3: number[], total: number[]) =>
    console.log(
      `  ${label.padEnd(12)} ${pad(quantile(c3, 0), 6)} ${pad(quantile(c3, 0.5), 4)} ${pad(quantile(c3, 1), 4)} │ ${pad(quantile(total, 0), 8)} ${pad(quantile(total, 0.5), 4)} ${pad(quantile(total, 1), 4)}  ${pad(total.filter((x) => x <= 20).length, 6)} ${pad(total.filter((x) => x <= 35).length, 7)} ${pad(total.filter((x) => x >= 65).length, 7)}`,
    );
  summarize(
    "記録（実績）",
    days.map((d) => d.entry.components.marginRatio),
    days.map((d) => d.entry.score),
  );
  const totals = {} as Record<CandidateId, number[]>;
  for (const id of CANDIDATE_IDS) {
    totals[id] = days.map((d) => totalWithMarginScore(d.entry, d.row.scores[id]));
    summarize(
      CANDIDATE_LABELS[id],
      days.map((d) => d.row.scores[id]),
      totals[id],
    );
  }

  console.log("\n[2026-10-28 以降の日次]（記録 = スナップショットの総合。各列は C3→総合）");
  console.log(
    `  ${"日付".padEnd(10)} 記録 反映週      ${CANDIDATE_IDS.map((id) => pad(CANDIDATE_LABELS[id].split(":")[0], 7)).join(" ")}`,
  );
  days.forEach((d, i) => {
    if (d.entry.date < "2026-10-28") return;
    console.log(
      `  ${d.entry.date} ${pad(d.entry.score, 4)} ${d.row.date}  ${CANDIDATE_IDS.map((id) => pad(`${d.row.scores[id]}→${totals[id][i]}`, 8)).join(" ")}`,
    );
  });

  const crash = days.find((d) => d.entry.date === "2026-11-06");
  if (crash) {
    const c = crash.entry.components;
    console.log("\n[2026-11-06 に総合が届きうる下限]（C2・C4 は記録値のまま）");
    for (const id of CANDIDATE_IDS) {
      const m = crash.row.scores[id];
      const floor = Math.round((0 + c.foreignFlow + m + c.arbitrage + 0) / 5);
      console.log(
        `  ${CANDIDATE_LABELS[id].padEnd(12)} C3=${pad(m, 3)} → C1・C5 が 0 でも総合 ${floor}`,
      );
    }
    console.log(
      `  参考: C3 を 0 にしても、当日の総合は ${totalWithMarginScore(crash.entry, 0)}`,
    );
  }
}

main();
