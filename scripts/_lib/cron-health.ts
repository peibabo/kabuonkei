/**
 * 定期実行の見張り（純粋関数）。check-cron-health.ts から I/O と分離してテスト可能にした。
 *
 * 見るのは「Vercel Cron が起動するはずだった時刻に、workflow_dispatch の実行が成功したか」。
 * 予備の schedule が遅れて成功していても、外部起動の経路が壊れていれば異常として扱う。
 */

import type { WorkflowDispatch } from "../../src/lib/cron-dispatch";

export interface CronEntry {
  /** 例: "/api/cron/japan-snapshot" */
  path: string;
  /** 例: "0 8 * * 1-5"（UTC） */
  schedule: string;
}

export interface ExpectedRun {
  job: string;
  workflow: string;
  /** Vercel Cron の起動予定時刻（UTC）。実際はこの時刻から 59 分後までのどこかで起動する */
  slot: Date;
}

export interface RunRecord {
  createdAt: string;
  status: string;
  conclusion: string | null;
}

export type Verdict = "ok" | "failed" | "missing";

export interface HealthResult extends ExpectedRun {
  verdict: Verdict;
}

const HOUR_MS = 3_600_000;

/** cron の 1 フィールド（"*" / "5" / "1-5" / "3,4" とその組み合わせ）が値に一致するか */
function fieldMatches(field: string, value: number): boolean {
  if (field === "*") return true;
  return field.split(",").some((part) => {
    const [from, to] = part.split("-").map(Number);
    return to == null ? value === from : value >= from && value <= to;
  });
}

/** 時刻（UTC）が cron 式に一致するか。分まで見る */
export function matchesCron(schedule: string, date: Date): boolean {
  const [minute, hour, dayOfMonth, month, dayOfWeek] = schedule.trim().split(/\s+/);
  return (
    fieldMatches(minute, date.getUTCMinutes()) &&
    fieldMatches(hour, date.getUTCHours()) &&
    fieldMatches(dayOfMonth, date.getUTCDate()) &&
    fieldMatches(month, date.getUTCMonth() + 1) &&
    fieldMatches(dayOfWeek, date.getUTCDay())
  );
}

/**
 * 直近 lookbackHours のうち、結果が出そろっているはずの起動予定を列挙する。
 * 起動から settleHours 経っていない予定は、まだ実行中かもしれないので含めない。
 */
export function expectedRuns(
  crons: readonly CronEntry[],
  jobs: Record<string, readonly WorkflowDispatch[]>,
  now: Date,
  options: { lookbackHours?: number; settleHours?: number; exclude?: readonly string[] } = {}
): ExpectedRun[] {
  const { lookbackHours = 26, settleHours = 2, exclude = [] } = options;
  const from = now.getTime() - lookbackHours * HOUR_MS;
  const to = now.getTime() - settleHours * HOUR_MS;

  const result: ExpectedRun[] = [];
  for (const { path, schedule } of crons) {
    const job = path.replace("/api/cron/", "");
    const minute = Number(schedule.trim().split(/\s+/)[0]);
    const firstHour = Math.floor(from / HOUR_MS) * HOUR_MS;
    for (let t = firstHour; t <= to; t += HOUR_MS) {
      const slot = new Date(t + minute * 60_000);
      if (slot.getTime() <= from || slot.getTime() > to) continue;
      if (!matchesCron(schedule, slot)) continue;
      for (const { workflow } of jobs[job] ?? []) {
        if (exclude.includes(workflow)) continue;
        result.push({ job, workflow, slot });
      }
    }
  }
  return result.sort((a, b) => a.slot.getTime() - b.slot.getTime());
}

/**
 * 起動予定に対応する workflow_dispatch の実行を探して判定する。
 * 予定時刻から windowHours 以内に始まった実行だけを対応するものとみなす
 * （同じワークフローを 1 日に 2 回起動するアラートの米国版・日本版を取り違えないため）。
 */
export function judgeRun(
  expected: ExpectedRun,
  runs: readonly RunRecord[],
  windowHours = 6
): Verdict {
  const start = expected.slot.getTime();
  const end = start + windowHours * HOUR_MS;
  const matched = runs.filter((r) => {
    const t = Date.parse(r.createdAt);
    return t >= start && t < end;
  });
  if (matched.length === 0) return "missing";
  const fine = matched.some(
    (r) => r.status !== "completed" || r.conclusion === "success"
  );
  return fine ? "ok" : "failed";
}

/** "11/16(月) 17時台" のような JST 表記 */
export function formatSlotJst(slot: Date): string {
  const jst = new Date(slot.getTime() + 9 * HOUR_MS);
  const weekday = "日月火水木金土"[jst.getUTCDay()];
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}(${weekday}) ${jst.getUTCHours()}時台`;
}

const VERDICT_LABEL: Record<Exclude<Verdict, "ok">, string> = {
  failed: "実行は始まったが失敗した",
  missing: "起動されなかった（Vercel Cron または GITHUB_DISPATCH_TOKEN を確認）",
};

export interface HealthReport {
  subject: string;
  text: string;
  html: string;
}

/** 異常があれば通知メールの内容を返す。無ければ null */
export function buildReport(
  results: readonly HealthResult[],
  options: { repo: string; now: Date }
): HealthReport | null {
  const problems = results.filter((r) => r.verdict !== "ok");
  if (problems.length === 0) return null;

  const lines = problems.map(
    (p) =>
      `- ${formatSlotJst(p.slot)} ${p.workflow}（${p.job}）: ${VERDICT_LABEL[p.verdict as "failed" | "missing"]}`
  );
  const actionsUrl = `https://github.com/${options.repo}/actions`;
  const text = [
    "株温計の定期実行に異常があります。",
    "",
    ...lines,
    "",
    `実行履歴: ${actionsUrl}`,
    "予備の schedule が数時間遅れで実行している場合があります。その場合もデータは更新されますが、時刻が遅れます。",
  ].join("\n");
  const html =
    `<p>株温計の定期実行に異常があります。</p><ul>` +
    lines.map((l) => `<li>${l.slice(2)}</li>`).join("") +
    `</ul><p>実行履歴: <a href="${actionsUrl}">${actionsUrl}</a></p>` +
    `<p>予備の schedule が数時間遅れで実行している場合があります。その場合もデータは更新されますが、時刻が遅れます。</p>`;

  const jstDate = new Date(options.now.getTime() + 9 * HOUR_MS).toISOString().slice(0, 10);
  return {
    subject: `【株温計】定期実行の異常 ${problems.length} 件（${jstDate}）`,
    text,
    html,
  };
}
