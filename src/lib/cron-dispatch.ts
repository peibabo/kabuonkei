import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron から GitHub Actions のワークフローを起動するための定義と処理。
 *
 * GitHub Actions の `schedule` は 2026-08-27 以降 4〜10 時間遅れて実行されており、
 * 「東証の引け後に当日分を更新する」前提が崩れていた。`workflow_dispatch` は遅延の
 * 影響を受けないため、Vercel Cron（`vercel.json` の `crons`）からこの API 経由で
 * 起動する。ワークフロー側の `schedule` は予備として残してある。
 */

export const DISPATCH_REPO = "peibabo/kabuonkei";
export const DISPATCH_REF = "main";

export interface WorkflowDispatch {
  /** `.github/workflows/` 配下のファイル名 */
  workflow: string;
  inputs?: Record<string, string>;
}

/**
 * ジョブ名（`/api/cron/[job]` の `[job]`）と、起動するワークフローの対応。
 * 起動時刻は `vercel.json` の `crons` で決める（Hobby プランは指定した「時」の
 * 00〜59 分のどこかで 1 回だけ実行される）。
 */
export const CRON_JOBS: Record<string, readonly WorkflowDispatch[]> = {
  // 平日 16 時台 JST: 東証の引け（15:30）後
  "stock-temperatures": [{ workflow: "update-stock-temperatures.yml" }],
  // 水・木 16 時台 JST: JPX の公表（水 15:00 / 木 15:30）後。17 時台のスナップショットが読む
  "japan-market": [{ workflow: "update-japan-market-data.yml" }],
  // 平日 17 時台 JST
  "japan-snapshot": [{ workflow: "snapshot-japan-fg.yml" }],
  // 平日 18 時台 JST: スナップショットの後
  "alerts-jp": [
    {
      workflow: "check-temperature-alerts.yml",
      inputs: { variant: "jp", dry_run: "false" },
    },
  ],
  // 平日 7 時台 JST: 米国の引け後、東証の寄り付き前
  morning: [
    { workflow: "update-portfolio.yml" },
    {
      workflow: "check-temperature-alerts.yml",
      inputs: { variant: "us", dry_run: "false" },
    },
    { workflow: "post-daily-tweet.yml" },
  ],
  // 毎月 1 日 9 時台 JST
  "monthly-stats": [{ workflow: "update-historical-stats.yml" }],
};

/** `Authorization: Bearer <CRON_SECRET>` を検証する。秘密値が未設定なら常に拒否する */
export function isAuthorizedCronRequest(
  authorization: string | null | undefined,
  secret: string | undefined,
): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export interface DispatchResult {
  workflow: string;
  ok: boolean;
  status: number;
  /** 失敗時の GitHub API の応答本文（先頭のみ） */
  error?: string;
}

/**
 * ジョブに含まれるワークフローを順に起動する。1 件が失敗しても残りは続ける。
 * 未定義のジョブ名なら null を返す。
 */
export async function dispatchCronJob(
  job: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DispatchResult[] | null> {
  if (!Object.hasOwn(CRON_JOBS, job)) return null;

  const results: DispatchResult[] = [];
  for (const { workflow, inputs } of CRON_JOBS[job]) {
    try {
      const res = await fetchImpl(
        `https://api.github.com/repos/${DISPATCH_REPO}/actions/workflows/${workflow}/dispatches`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "User-Agent": "kabuonkei-cron",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ ref: DISPATCH_REF, inputs: inputs ?? {} }),
          cache: "no-store",
        },
      );
      if (res.ok) {
        results.push({ workflow, ok: true, status: res.status });
      } else {
        const body = await res.text().catch(() => "");
        results.push({
          workflow,
          ok: false,
          status: res.status,
          error: body.slice(0, 300),
        });
      }
    } catch (e) {
      results.push({
        workflow,
        ok: false,
        status: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return results;
}
