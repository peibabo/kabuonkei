/**
 * 定期実行の見張り。Vercel Cron が起動するはずだったワークフローが、直近 1 日に
 * workflow_dispatch で成功しているかを調べ、異常があれば運営者にメールで知らせる。
 *
 * 背景: JPX データの取得停止（2026-09 下旬〜）も X Bot の失敗（2026-11-06〜）も、
 * 通知が無く気付くまでに時間がかかった。
 *
 * 実行:
 *   npx tsx scripts/check-cron-health.ts             # 異常があればメール送信
 *   npx tsx scripts/check-cron-health.ts --dry-run   # 送信せず内容を表示
 *   npx tsx scripts/check-cron-health.ts --send-test # 架空の異常 1 件で通知メールの到達を確認
 * 環境変数: GITHUB_TOKEN（Actions の読み取り）/ RESEND_API_KEY / RESEND_FROM_EMAIL /
 *           OPS_ALERT_EMAIL（通知先。既定は info@kabuonkei.com）
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { CRON_JOBS, DISPATCH_REPO } from "../src/lib/cron-dispatch";
import { sendEmail } from "../src/lib/alerts/resend";
import {
  buildReport,
  expectedRuns,
  formatSlotJst,
  judgeRun,
  type CronEntry,
  type HealthResult,
  type RunRecord,
} from "./_lib/cron-health";

const VERCEL_JSON_PATH = resolve(__dirname, "../vercel.json");
const DEFAULT_OPS_EMAIL = "info@kabuonkei.com";
const LOOKBACK_HOURS = 26;

/** 見張り自身は対象にしない */
const SELF_WORKFLOW = "check-cron-health.yml";

/**
 * 既知の失敗で、毎日通知しても意味がないもの。ログには出すがメールには含めない。
 * - post-daily-tweet.yml: X API が 402（Payment Required）を返す。2026-11-16 時点でユーザー判断により保留中。
 *   解決したらここから外すこと
 */
const MUTED_WORKFLOWS: readonly string[] = ["post-daily-tweet.yml"];

async function fetchDispatchRuns(
  workflow: string,
  since: Date,
  token: string | undefined
): Promise<RunRecord[]> {
  const created = encodeURIComponent(`>=${since.toISOString().slice(0, 19)}Z`);
  const url = `https://api.github.com/repos/${DISPATCH_REPO}/actions/workflows/${workflow}/runs?event=workflow_dispatch&created=${created}&per_page=100`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "kabuonkei-cron-health",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${workflow}`);
  }
  const data = (await res.json()) as {
    workflow_runs: { created_at: string; status: string; conclusion: string | null }[];
  };
  return data.workflow_runs.map((r) => ({
    createdAt: r.created_at,
    status: r.status,
    conclusion: r.conclusion,
  }));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const now = new Date();
  const crons = (
    JSON.parse(readFileSync(VERCEL_JSON_PATH, "utf-8")) as { crons: CronEntry[] }
  ).crons;

  const expected = expectedRuns(crons, CRON_JOBS, now, {
    lookbackHours: LOOKBACK_HOURS,
    exclude: [SELF_WORKFLOW],
  });
  console.log(`直近 ${LOOKBACK_HOURS} 時間の起動予定: ${expected.length} 件`);

  const since = new Date(now.getTime() - LOOKBACK_HOURS * 3_600_000);
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const runsByWorkflow = new Map<string, RunRecord[]>();
  for (const workflow of new Set(expected.map((e) => e.workflow))) {
    runsByWorkflow.set(workflow, await fetchDispatchRuns(workflow, since, token));
  }

  const results: HealthResult[] = expected.map((e) => ({
    ...e,
    verdict: judgeRun(e, runsByWorkflow.get(e.workflow) ?? []),
  }));
  if (process.argv.includes("--send-test")) {
    // メールが届くことの確認用。実在しないワークフロー名で 1 件だけ異常を作る
    results.push({
      job: "test",
      workflow: "（送信テスト。実際の異常ではありません）",
      slot: new Date(now.getTime() - 3 * 3_600_000),
      verdict: "missing",
    });
  }
  for (const r of results) {
    const muted = r.verdict !== "ok" && MUTED_WORKFLOWS.includes(r.workflow);
    console.log(
      `  ${r.verdict === "ok" ? "✅" : "❌"} ${formatSlotJst(r.slot)} ${r.workflow}（${r.job}）: ${r.verdict}${muted ? "（既知のため通知しない）" : ""}`
    );
  }

  const report = buildReport(
    results.filter((r) => !MUTED_WORKFLOWS.includes(r.workflow)),
    { repo: DISPATCH_REPO, now }
  );
  if (report == null) {
    console.log("\n異常なし（通知は送りません）");
    return;
  }

  const to = process.env.OPS_ALERT_EMAIL || DEFAULT_OPS_EMAIL;
  console.log(`\n--- 通知内容（宛先: ${to}）---\n${report.subject}\n\n${report.text}`);
  if (dryRun) {
    console.log("\n[DRY RUN] メールは送信しません");
    return;
  }
  const sent = await sendEmail({ to, ...report });
  if (!sent.ok) {
    console.error(`通知メールの送信に失敗: ${sent.error}`);
    process.exit(1);
  }
  console.log(`\n通知メールを送信しました（id=${sent.id}）`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
