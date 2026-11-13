import { NextResponse } from "next/server";
import { dispatchCronJob, isAuthorizedCronRequest } from "@/lib/cron-dispatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron から呼ばれ、対応する GitHub Actions のワークフローを起動する。
 * Vercel は環境変数 `CRON_SECRET` の値を `Authorization: Bearer ...` で送ってくる。
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ job: string }> },
): Promise<Response> {
  if (
    !isAuthorizedCronRequest(
      req.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.error("[cron] GITHUB_DISPATCH_TOKEN が未設定です");
    return NextResponse.json(
      { error: "GITHUB_DISPATCH_TOKEN is not set" },
      { status: 500 },
    );
  }

  const { job } = await ctx.params;
  const results = await dispatchCronJob(job, token);
  if (results === null) {
    return NextResponse.json({ error: "unknown job" }, { status: 404 });
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`[cron] ${job}: ワークフローの起動に失敗`, failed);
  }
  return NextResponse.json(
    { job, results },
    { status: failed.length > 0 ? 502 : 200 },
  );
}
