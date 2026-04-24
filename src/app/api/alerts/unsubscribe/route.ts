import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/alerts/tokens";
import { unsubscribeByUuid } from "@/lib/alerts/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  return url.replace(/\/+$/, "");
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const site = siteOrigin();

  if (!token) {
    return NextResponse.redirect(`${site}/alerts/unsubscribed?error=invalid`, 302);
  }

  const result = verifyToken(token, "unsubscribe");
  if (!result.ok || !result.payload) {
    return NextResponse.redirect(`${site}/alerts/unsubscribed?error=invalid`, 302);
  }

  await unsubscribeByUuid(result.payload.uuid);
  return NextResponse.redirect(`${site}/alerts/unsubscribed`, 302);
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
