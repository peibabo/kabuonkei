/**
 * 日本版スナップショットの C2（海外投資家フロー）/ C3（信用倍率）を過去分だけ再計算する。
 *
 * 背景: 2026-09 下旬に JPX がファイル形式を変更し、投資部門別売買状況と信用倍率の取得が
 * 止まっていた（2026-11-11 に復旧）。その間のスナップショットは古いデータのまま、または
 * 欠損値 50 で記録されている。対象期間の各営業日について「その日に公表済みだったデータ」で
 * C2 / C3 を計算し直し、スコアと温度帯を更新する。C1 / C4 / C5 は記録済みの値を使う。
 *
 * 実行:
 *   npx tsx scripts/backfill-japan-fg-snapshots.ts            # 差分を表示するだけ
 *   npx tsx scripts/backfill-japan-fg-snapshots.ts --write    # ファイルを書き換える
 *   npx tsx scripts/backfill-japan-fg-snapshots.ts --from 2026-08-27   # 検証用に範囲を広げる
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fetchBuffer, fetchText, JPX_BASE } from "./_lib/jpx-common";
import { extractInvestorLinks, parseInvestorXlsx } from "./_lib/jpx-investor";
import { sleep } from "./_lib/shared";
import { recomputeEntry, type WeeklyValue } from "./_lib/snapshot-backfill";
import type { SnapshotFile } from "./_lib/snapshot-merge";

const SNAPSHOT_PATH = resolve(__dirname, "../src/data/japan-fg-snapshots.json");
const MARGIN_HISTORY_PATH = resolve(
  __dirname,
  "../src/data/margin-ratio-history.json"
);
const TEMPERATURE_HISTORY_PATH = resolve(
  __dirname,
  "../src/data/japan-temperature-history.json"
);

/** 取得が止まった影響が出始めた日（9/14 週の投資部門別・9/25 の信用倍率が反映されるはずだった日） */
const DEFAULT_FROM = "2026-09-30";
/** 復旧前の最後のスナップショット（2026-11-11 分からは正しいデータで記録されている） */
const DEFAULT_TO = "2026-11-10";

/** 2026 年のバックナンバー。新形式（9/14 週以降）の週次ファイルが並ぶ */
const JPX_INVESTOR_ARCHIVE_URL = `${JPX_BASE}/markets/statistics-equities/investor-type/00-00-archives-00.html`;

/**
 * 旧形式（〜9/7 週）のファイルは現在のパーサーで読めないため、当時取得して
 * japan-market-data.json にコミットされていた海外投資家の売買差引（億円）を使う。
 */
const LEGACY_FOREIGN_FLOW_WEEKS: WeeklyValue[] = [
  { endDate: "2026-07-31", value: -4903.4 },
  { endDate: "2026-08-07", value: -3763 },
  { endDate: "2026-08-14", value: 2109.4 },
  { endDate: "2026-08-21", value: -4141.1 },
  { endDate: "2026-08-28", value: -1747.2 },
  { endDate: "2026-09-04", value: 7288.5 },
  { endDate: "2026-09-11", value: -2749.3 },
];

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function fetchForeignFlowWeeks(): Promise<WeeklyValue[]> {
  const html = await fetchText(JPX_INVESTOR_ARCHIVE_URL);
  const links = extractInvestorLinks(html);
  if (links.length === 0) {
    throw new Error("バックナンバーに週次ファイルが見つかりません");
  }
  const weeks: WeeklyValue[] = [];
  for (const link of links) {
    const week = parseInvestorXlsx(await fetchBuffer(link.url), link);
    const foreign = week?.entities.find((e) => e.name === "海外投資家");
    if (!foreign) {
      throw new Error(`海外投資家の値を読めません: ${link.url}`);
    }
    weeks.push({ endDate: link.endDate, value: foreign.netAmount });
    await sleep(500);
  }
  return weeks;
}

async function main() {
  const from = argValue("--from") ?? DEFAULT_FROM;
  const to = argValue("--to") ?? DEFAULT_TO;
  const write = process.argv.includes("--write");

  const file = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf-8")) as SnapshotFile;
  const marginHistory = JSON.parse(
    readFileSync(MARGIN_HISTORY_PATH, "utf-8")
  ) as { weekly: { date: string; ratio: number }[] };
  const temperatureHistory = JSON.parse(
    readFileSync(TEMPERATURE_HISTORY_PATH, "utf-8")
  ) as { daily: { date: string }[] };

  console.log("JPX のバックナンバーから投資部門別売買状況を取得中...");
  const fetched = await fetchForeignFlowWeeks();
  const foreignFlowWeeks = [...LEGACY_FOREIGN_FLOW_WEEKS, ...fetched];
  console.log(
    `  ${fetched.length} 週分を取得（${fetched.at(-1)?.endDate}〜${fetched[0]?.endDate}）\n`
  );

  const inputs = {
    foreignFlowWeeks,
    marginRatioWeeks: marginHistory.weekly.map((w) => ({
      endDate: w.date,
      value: w.ratio,
    })),
    tradingDays: temperatureHistory.daily.map((d) => d.date),
  };

  let changed = 0;
  console.log("日付        C2          C3          スコア");
  const snapshots = file.snapshots.map((entry) => {
    if (entry.date < from || entry.date > to) return entry;
    const next = recomputeEntry(entry, inputs);
    if (next == null) {
      console.warn(`${entry.date}  再計算に必要な週次データが不足（変更なし）`);
      return entry;
    }
    const fmt = (a: number, b: number) =>
      (a === b ? `${a}` : `${a} → ${b}`).padEnd(10);
    const same = JSON.stringify(next) === JSON.stringify(entry);
    if (!same) changed++;
    console.log(
      `${entry.date}  ${fmt(entry.components.foreignFlow, next.components.foreignFlow)}  ` +
        `${fmt(entry.components.marginRatio, next.components.marginRatio)}  ` +
        `${fmt(entry.score, next.score)}${entry.level === next.level ? "" : `  ${entry.level} → ${next.level}`}`
    );
    return next;
  });

  console.log(`\n${from}〜${to}: ${changed} 件が変わります`);
  if (!write) {
    console.log("（表示のみ。書き換えるには --write を付けて実行）");
    return;
  }
  writeFileSync(
    SNAPSHOT_PATH,
    JSON.stringify({ ...file, snapshots }, null, 2) + "\n",
    "utf-8"
  );
  console.log("✅ 保存完了");
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
