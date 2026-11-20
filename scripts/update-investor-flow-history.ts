/**
 * 投資部門別売買状況（週次）の過去の推移を src/data/investor-flow-history.json に保存するスクリプト
 *
 * 東証・名証の合計（二市場）の、海外投資家と個人の売買差引（億円）を 2016 年 1 月から週ごとに持つ。
 * 2022 年 4 月の市場区分の見直し（東証一部 → プライム）をまたいでも同じ基準で比べられるよう、プライムではなく二市場を使う。
 * /learn/what-is-investor-flow の集計（generate-learn-extra-stats.ts）が読む。
 *
 * - 既定（月次の update-historical-stats.yml から実行）: 最新ページと今年・去年の過去ファイル一覧だけを見て、まだない週を足す
 *   （年が明けると去年 12 月の週は去年の一覧に移るため、去年の分も見る）
 * - --full: 2016 年からの一覧ページをすべてたどって作り直す（初回・形式変更時）
 *
 * 読めない週が 1 つでもあれば、ファイルを書き換えずに異常終了する（欠けた推移で集計しないため）。
 *
 * 実行: npm run update:investor-flow [-- --full]
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { fetchBuffer, fetchText } from "./_lib/jpx-common";
import {
  JPX_INVESTOR_TYPE_URL,
  extractInvestorLinks,
  extractLegacyInvestorLinks,
  investorArchiveUrl,
  parseInvestorXlsx,
  parseLegacyInvestorXls,
} from "./_lib/jpx-investor";
import type { InvestorTradingWeek } from "../src/lib/types/japan-market";
import type { InvestorFlowHistory, InvestorFlowWeek } from "../src/lib/investor-flow-history";

const OUT_PATH = resolve(__dirname, "../src/data/investor-flow-history.json");
/** 一覧ページをさかのぼる上限（00 = 今年。2016 年が 10） */
const MAX_ARCHIVE_INDEX = 30;
/** JPX への連続アクセスの間隔 */
const FETCH_INTERVAL_MS = 300;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Source = { kind: "legacy"; url: string } | { kind: "current"; url: string; startDate: string; endDate: string };

async function fetchPage(url: string): Promise<string | null> {
  try {
    return await fetchText(url);
  } catch (err) {
    if (String(err).includes("HTTP 404")) return null;
    throw err;
  }
}

async function collectSources(full: boolean): Promise<Source[]> {
  const pages = [JPX_INVESTOR_TYPE_URL + "index.html"];
  const maxIndex = full ? MAX_ARCHIVE_INDEX : 1;
  for (let i = 0; i <= maxIndex; i++) pages.push(investorArchiveUrl(i));

  const sources = new Map<string, Source>();
  for (const page of pages) {
    const html = await fetchPage(page);
    await sleep(FETCH_INTERVAL_MS);
    if (html == null) {
      if (page.includes("archives")) break; // それより前の年はない
      throw new Error(`一覧ページが見つかりません: ${page}`);
    }
    for (const url of extractLegacyInvestorLinks(html)) sources.set(url, { kind: "legacy", url });
    for (const l of extractInvestorLinks(html)) sources.set(l.url, { kind: "current", ...l });
  }
  return [...sources.values()];
}

function toFlowWeek(w: InvestorTradingWeek): InvestorFlowWeek {
  const net = (name: string) => {
    const e = w.entities.find((x) => x.name === name);
    if (!e) throw new Error(`${w.weekLabel}: ${name}がありません`);
    return e.netAmount;
  };
  return { startDate: w.startDate, endDate: w.endDate, foreign: net("海外投資家"), individual: net("個人") };
}

async function main() {
  const full = process.argv.includes("--full");
  const existing: InvestorFlowWeek[] =
    !full && existsSync(OUT_PATH)
      ? (JSON.parse(readFileSync(OUT_PATH, "utf-8")) as InvestorFlowHistory).weeks
      : [];
  const byEnd = new Map(existing.map((w) => [w.endDate, w]));
  console.log(`既存 ${existing.length} 週（${full ? "全件取り直し" : "差分のみ"}）`);

  const sources = await collectSources(full);
  console.log(`一覧のファイル ${sources.length} 件`);

  const failures: string[] = [];
  let added = 0;
  for (const s of sources) {
    // 新形式はファイル名から期間が分かるので、既にある週は取りに行かない
    if (s.kind === "current" && byEnd.has(s.endDate)) continue;
    // 旧形式（〜2026-09）は差分更新では足さない（ファイル名だけでは週が分からず、過去分は --full で揃っている）
    if (s.kind === "legacy" && !full) continue;
    const buf = await fetchBuffer(s.url);
    await sleep(FETCH_INTERVAL_MS);
    const week = s.kind === "legacy" ? parseLegacyInvestorXls(buf) : parseInvestorXlsx(buf, s, "二市場");
    if (!week) {
      failures.push(s.url);
      continue;
    }
    const fw = toFlowWeek(week);
    if (!byEnd.has(fw.endDate)) added++;
    byEnd.set(fw.endDate, fw);
  }

  if (failures.length > 0) {
    console.error(`❌ 読めないファイルが ${failures.length} 件あるため書き出しません:`);
    for (const f of failures) console.error(`  ${f}`);
    process.exit(1);
  }

  const weeks = [...byEnd.values()].sort((a, b) => a.endDate.localeCompare(b.endDate));
  // 週が抜けていないか（前の週の最終日 → 次の週の初日は普段 3 日、年末年始・大型連休で 5〜6 日。
  // 2019 年の 10 連休のように休場が長いと警告が出るが、集計側は営業日で判定するので問題ない）
  for (let k = 1; k < weeks.length; k++) {
    const gap = (Date.parse(weeks[k].startDate) - Date.parse(weeks[k - 1].endDate)) / 86_400_000;
    if (gap > 7) console.warn(`  ⚠️ ${weeks[k - 1].endDate} → ${weeks[k].startDate} の間に週が抜けている可能性`);
  }

  const out: InvestorFlowHistory = {
    source: "日本取引所グループ（JPX）「投資部門別売買状況」週間・二市場（東証・名証）",
    unit: "億円（買い − 売り）",
    weeks,
  };
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf-8");
  console.log(`✅ ${weeks.length} 週（+${added}）: ${weeks[0]?.startDate} 〜 ${weeks[weeks.length - 1]?.endDate}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
