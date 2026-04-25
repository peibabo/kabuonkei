import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (client) return client;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "KV_REST_API_URL / KV_REST_API_TOKEN が未設定です（Vercel Marketplace の Upstash 統合で自動注入。GitHub Actions 側では Secrets に手動登録が必要）"
    );
  }
  client = new Redis({ url, token });
  return client;
}

export function resetRedisForTest(next: Redis | null): void {
  client = next;
}
