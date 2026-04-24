import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/alerts/tokens";
import { verifySubscriber } from "@/lib/alerts/subscribers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  return url.replace(/\/+$/, "");
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const site = siteOrigin();

  if (!token) {
    return NextResponse.redirect(`${site}/alerts/verified?error=invalid`, 302);
  }

  const result = verifyToken(token, "verify");
  if (!result.ok) {
    const err = result.error === "expired" ? "expired" : "invalid";
    return NextResponse.redirect(`${site}/alerts/verified?error=${err}`, 302);
  }

  const verified = await verifySubscriber(token);
  if (!verified.ok) {
    const err = verified.error === "expired" ? "expired" : "invalid";
    return NextResponse.redirect(`${site}/alerts/verified?error=${err}`, 302);
  }

  return NextResponse.redirect(`${site}/alerts/verified`, 302);
}
