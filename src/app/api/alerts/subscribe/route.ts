import { NextResponse } from "next/server";
import { validateSubscribeInput, createOrUpdatePendingSubscriber } from "@/lib/alerts/subscribers";
import { checkEmailRate, checkIpRate } from "@/lib/alerts/rate-limit";
import { hashEmail } from "@/lib/alerts/tokens";
import { buildVerifyEmail } from "@/lib/alerts/email-templates";
import { sendEmail } from "@/lib/alerts/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  return url.replace(/\/+$/, "");
}

function allowedOrigins(): string[] {
  const base = [siteOrigin()];
  const extra = process.env.ALERTS_ALLOWED_ORIGINS;
  if (extra) {
    for (const o of extra.split(",").map((s) => s.trim()).filter(Boolean)) {
      base.push(o.replace(/\/+$/, ""));
    }
  }
  return base;
}

function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const normalized = origin.replace(/\/+$/, "");
  if (allowedOrigins().includes(normalized)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(normalized)) return true;
  return false;
}

function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(req: Request): Promise<Response> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "unsupported_media_type" },
      { status: 415 }
    );
  }

  const origin = req.headers.get("origin");
  if (!isAllowedOrigin(origin)) {
    return NextResponse.json(
      { ok: false, error: "forbidden_origin" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_json" },
      { status: 400 }
    );
  }

  const validation = validateSubscribeInput(body as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json(
      { ok: false, error: validation.error },
      { status: 400 }
    );
  }
  const { email, variants } = validation;

  const ip = clientIp(req.headers);
  const ipRate = await checkIpRate(ip);
  if (!ipRate.ok) {
    return new NextResponse(
      JSON.stringify({ ok: false, error: "rate_limited" }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(ipRate.retryAfterSec ?? 600),
        },
      }
    );
  }

  const emailHash = hashEmail(email);
  const emailRate = await checkEmailRate(emailHash);
  if (!emailRate.ok) {
    return NextResponse.json(
      { ok: true, message: "確認メールを送信しました（既に送信済みの可能性があります）" },
      { status: 200 }
    );
  }

  const pending = await createOrUpdatePendingSubscriber(email, variants);

  if (pending.verifyToken) {
    const site = siteOrigin();
    const verifyUrl = `${site}/api/alerts/verify?token=${encodeURIComponent(pending.verifyToken)}`;
    const unsubscribeUrl = `${site}/api/alerts/unsubscribe?token=${encodeURIComponent(pending.unsubscribeToken)}`;
    const mail = buildVerifyEmail({ verifyUrl, unsubscribeUrl, email, variants });
    const sendResult = await sendEmail({
      to: email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
      },
    });
    if (!sendResult.ok) {
      console.error("Resend failed:", sendResult.error);
      return NextResponse.json(
        { ok: false, error: "email_send_failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(
    { ok: true, message: "確認メールを送信しました" },
    { status: 200 }
  );
}
