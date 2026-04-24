import { getRedis } from "./redis";
import { rateEmailKey, rateIpKey } from "./keys";

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec?: number;
}

const IP_LIMIT = 5;
const IP_WINDOW_SEC = 10 * 60;
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_SEC = 60 * 60;

async function incrWithTtl(
  key: string,
  ttlSec: number,
  limit: number
): Promise<RateLimitResult> {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, ttlSec);
  }
  if (count > limit) {
    const ttl = await redis.ttl(key);
    return { ok: false, retryAfterSec: ttl > 0 ? ttl : ttlSec };
  }
  return { ok: true };
}

export async function checkIpRate(ip: string): Promise<RateLimitResult> {
  return incrWithTtl(rateIpKey(ip), IP_WINDOW_SEC, IP_LIMIT);
}

export async function checkEmailRate(
  emailHashHex: string
): Promise<RateLimitResult> {
  return incrWithTtl(
    rateEmailKey(emailHashHex),
    EMAIL_WINDOW_SEC,
    EMAIL_LIMIT
  );
}
