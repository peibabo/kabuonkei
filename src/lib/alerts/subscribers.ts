import { randomUUID } from "node:crypto";
import type { AlertSubscriber, AlertVariant } from "@/lib/types";
import { ALERT_VARIANTS } from "@/lib/types";
import {
  blocklistKey,
  emailIndexKey,
  subscriberKey,
  variantIndexKey,
  verifyPendingKey,
} from "./keys";
import { getRedis } from "./redis";
import { createToken, hashEmail, hashToken } from "./tokens";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;
const VERIFY_PENDING_TTL_SEC = 24 * 60 * 60;

export interface SubscribeValidationOk {
  ok: true;
  email: string;
  variants: AlertVariant[];
}
export interface SubscribeValidationError {
  ok: false;
  error: string;
}
export type SubscribeValidationResult =
  | SubscribeValidationOk
  | SubscribeValidationError;

export interface SubscribeInput {
  email?: unknown;
  variants?: unknown;
  consent?: unknown;
  hp_field?: unknown;
}

export function validateSubscribeInput(
  input: SubscribeInput
): SubscribeValidationResult {
  if (input.hp_field !== undefined && input.hp_field !== "") {
    return { ok: false, error: "invalid_request" };
  }
  if (input.consent !== true) {
    return { ok: false, error: "consent_required" };
  }
  if (typeof input.email !== "string") {
    return { ok: false, error: "email_invalid" };
  }
  const email = input.email.trim().toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX_LENGTH) {
    return { ok: false, error: "email_invalid" };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "email_invalid" };
  }
  if (!Array.isArray(input.variants) || input.variants.length === 0) {
    return { ok: false, error: "variants_required" };
  }
  const variants: AlertVariant[] = [];
  for (const v of input.variants) {
    if (typeof v !== "string") return { ok: false, error: "variants_invalid" };
    if (!ALERT_VARIANTS.includes(v as AlertVariant)) {
      return { ok: false, error: "variants_invalid" };
    }
    if (!variants.includes(v as AlertVariant)) {
      variants.push(v as AlertVariant);
    }
  }
  return { ok: true, email, variants };
}

export interface CreatePendingResult {
  uuid: string;
  verifyToken: string;
  unsubscribeToken: string;
  isNew: boolean;
}

export async function createOrUpdatePendingSubscriber(
  email: string,
  variants: AlertVariant[],
  now: number = Date.now()
): Promise<CreatePendingResult> {
  const redis = getRedis();
  const emailHash = hashEmail(email);

  const blocklisted = await redis.get<string>(blocklistKey(emailHash));
  if (blocklisted) {
    return {
      uuid: "",
      verifyToken: "",
      unsubscribeToken: "",
      isNew: false,
    };
  }

  const existingUuid = await redis.get<string>(emailIndexKey(emailHash));
  const uuid = existingUuid ?? randomUUID();
  const unsubscribeToken = createToken(uuid, "unsubscribe", now);
  const verifyToken = createToken(uuid, "verify", now);

  const existingSub = existingUuid
    ? await redis.hgetall<Record<string, unknown>>(subscriberKey(uuid))
    : null;
  const wasVerified = isVerified(existingSub?.verified);

  const existingCreatedAt =
    typeof existingSub?.createdAt === "string" ? existingSub.createdAt : null;
  const existingVerifiedAt =
    typeof existingSub?.verifiedAt === "string" ? existingSub.verifiedAt : null;
  const subscriber: Record<string, string> = {
    uuid,
    email,
    emailHash,
    variants: JSON.stringify(variants),
    verified: wasVerified ? "true" : "false",
    createdAt: existingCreatedAt ?? new Date(now).toISOString(),
    verifiedAt: existingVerifiedAt ?? "",
    unsubscribeToken,
  };

  await redis.hset(subscriberKey(uuid), subscriber);
  await redis.set(emailIndexKey(emailHash), uuid);

  if (!wasVerified) {
    await redis.set(verifyPendingKey(hashToken(verifyToken)), uuid, {
      ex: VERIFY_PENDING_TTL_SEC,
    });
  }

  return {
    uuid,
    verifyToken,
    unsubscribeToken,
    isNew: !existingUuid,
  };
}

export interface VerifyResult {
  ok: boolean;
  error?: "not_found" | "expired";
  uuid?: string;
}

export async function verifySubscriber(
  token: string,
  now: number = Date.now()
): Promise<VerifyResult> {
  const redis = getRedis();
  const tokenHash = hashToken(token);
  const uuid = await redis.get<string>(verifyPendingKey(tokenHash));
  if (!uuid) {
    return { ok: false, error: "expired" };
  }
  const sub = await redis.hgetall<Record<string, string>>(subscriberKey(uuid));
  if (!sub) return { ok: false, error: "not_found" };

  const variants: AlertVariant[] = parseVariants(sub.variants);

  await redis.hset(subscriberKey(uuid), {
    verified: "true",
    verifiedAt: new Date(now).toISOString(),
  });
  await redis.del(verifyPendingKey(tokenHash));
  for (const v of variants) {
    await redis.sadd(variantIndexKey(v), uuid);
  }

  return { ok: true, uuid };
}

export interface UnsubscribeResult {
  ok: boolean;
  alreadyUnsubscribed?: boolean;
}

export async function unsubscribeByUuid(
  uuid: string,
  now: number = Date.now()
): Promise<UnsubscribeResult> {
  const redis = getRedis();
  const sub = await redis.hgetall<Record<string, string>>(subscriberKey(uuid));
  if (!sub) return { ok: true, alreadyUnsubscribed: true };

  const emailHash = sub.emailHash;
  const variants: AlertVariant[] = parseVariants(sub.variants);

  for (const v of variants) {
    await redis.srem(variantIndexKey(v), uuid);
  }
  await redis.del(subscriberKey(uuid));
  if (emailHash) {
    await redis.del(emailIndexKey(emailHash));
    await redis.set(blocklistKey(emailHash), new Date(now).toISOString(), {
      ex: 365 * 24 * 60 * 60,
    });
  }
  return { ok: true };
}

export async function listVerifiedSubscribersForVariant(
  variant: AlertVariant
): Promise<AlertSubscriber[]> {
  const redis = getRedis();
  const uuids = (await redis.smembers(variantIndexKey(variant))) as string[];
  if (uuids.length === 0) return [];
  const result: AlertSubscriber[] = [];
  for (const uuid of uuids) {
    const raw = await redis.hgetall<Record<string, unknown>>(
      subscriberKey(uuid)
    );
    if (!raw) continue;
    if (!isVerified(raw.verified)) continue;
    result.push({
      uuid: typeof raw.uuid === "string" ? raw.uuid : uuid,
      email: typeof raw.email === "string" ? raw.email : "",
      emailHash: typeof raw.emailHash === "string" ? raw.emailHash : "",
      variants: parseVariants(raw.variants),
      verified: true,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : "",
      verifiedAt:
        typeof raw.verifiedAt === "string" && raw.verifiedAt
          ? raw.verifiedAt
          : null,
      unsubscribeToken:
        typeof raw.unsubscribeToken === "string" ? raw.unsubscribeToken : "",
    });
  }
  return result;
}

// Upstash Redis SDK は automaticDeserialization=true（デフォルト）のため、
// hset で書き込んだ "true"/"false" 文字列が hgetall 時に boolean に変換される
// ことがある。文字列・boolean どちらでも判定できるようにする。
export function isVerified(raw: unknown): boolean {
  return raw === true || raw === "true";
}

export function parseVariants(raw: unknown): AlertVariant[] {
  if (raw == null) return [];
  const isValid = (v: unknown): v is AlertVariant =>
    typeof v === "string" && ALERT_VARIANTS.includes(v as AlertVariant);
  // Upstash Redis SDK は automaticDeserialization=true（デフォルト）のため、
  // hset で書き込んだ JSON 文字列が hgetall 時に既に配列としてパースされている
  // ケースがある。配列・文字列どちらも受け付ける。
  if (Array.isArray(raw)) {
    return raw.filter(isValid);
  }
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValid);
  } catch {
    return [];
  }
}
