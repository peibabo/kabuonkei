import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { AlertTokenPayload } from "@/lib/types";

export type TokenAction = "verify" | "unsubscribe";

export interface TokenVerifyResult {
  ok: boolean;
  payload?: AlertTokenPayload;
  error?: "invalid" | "expired" | "action_mismatch";
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.ALERTS_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ALERTS_TOKEN_SECRET が未設定または 32 文字未満です（openssl rand -hex 32）"
    );
  }
  return secret;
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  );
}

function sign(payloadB64: string, secret: string): string {
  return base64urlEncode(
    createHmac("sha256", secret).update(payloadB64).digest()
  );
}

export function createToken(
  uuid: string,
  action: TokenAction,
  now: number = Date.now()
): string {
  const secret = getSecret();
  const exp = action === "verify" ? now + VERIFY_TTL_MS : null;
  const payload: AlertTokenPayload = { uuid, action, exp };
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const sigB64 = sign(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

export function verifyToken(
  token: string,
  expectedAction: TokenAction,
  now: number = Date.now()
): TokenVerifyResult {
  const secret = getSecret();
  const [payloadB64, sigB64, ...rest] = token.split(".");
  if (!payloadB64 || !sigB64 || rest.length !== 0) {
    return { ok: false, error: "invalid" };
  }
  const expectedSigB64 = sign(payloadB64, secret);
  const a = Buffer.from(sigB64);
  const b = Buffer.from(expectedSigB64);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "invalid" };
  }
  let payload: AlertTokenPayload;
  try {
    payload = JSON.parse(base64urlDecode(payloadB64).toString("utf8"));
  } catch {
    return { ok: false, error: "invalid" };
  }
  if (
    typeof payload.uuid !== "string" ||
    (payload.action !== "verify" && payload.action !== "unsubscribe")
  ) {
    return { ok: false, error: "invalid" };
  }
  if (payload.action !== expectedAction) {
    return { ok: false, error: "action_mismatch" };
  }
  if (payload.exp !== null && payload.exp < now) {
    return { ok: false, error: "expired" };
  }
  return { ok: true, payload };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}
