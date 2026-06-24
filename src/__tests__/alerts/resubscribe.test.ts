import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createOrUpdatePendingSubscriber,
  unsubscribeByUuid,
  verifySubscriber,
} from "@/lib/alerts/subscribers";
import { resetRedisForTest } from "@/lib/alerts/redis";
import {
  blocklistKey,
  emailIndexKey,
  variantIndexKey,
  verifyPendingKey,
} from "@/lib/alerts/keys";
import { hashEmail, hashToken } from "@/lib/alerts/tokens";

const TEST_SECRET = "a".repeat(64);
const EMAIL = "user@example.com";

// createOrUpdatePendingSubscriber / verifySubscriber / unsubscribeByUuid が
// 使う Redis メソッドだけを実装した最小インメモリ偽 Redis。
function createFakeRedis() {
  const strings = new Map<string, unknown>();
  const hashes = new Map<string, Record<string, unknown>>();
  const sets = new Map<string, Set<string>>();
  return {
    store: { strings, hashes, sets },
    async get<T>(key: string): Promise<T | null> {
      return (strings.has(key) ? (strings.get(key) as T) : null) ?? null;
    },
    async set(key: string, value: unknown): Promise<"OK"> {
      strings.set(key, value);
      return "OK";
    },
    async del(...keys: string[]): Promise<number> {
      let n = 0;
      for (const k of keys) {
        if (strings.delete(k)) n++;
        if (hashes.delete(k)) n++;
        if (sets.delete(k)) n++;
      }
      return n;
    },
    async hgetall<T>(key: string): Promise<T | null> {
      return (hashes.has(key) ? (hashes.get(key) as T) : null) ?? null;
    },
    async hset(key: string, value: Record<string, unknown>): Promise<number> {
      const cur = hashes.get(key) ?? {};
      hashes.set(key, { ...cur, ...value });
      return Object.keys(value).length;
    },
    async sadd(key: string, ...members: string[]): Promise<number> {
      const s = sets.get(key) ?? new Set<string>();
      let n = 0;
      for (const m of members) {
        if (!s.has(m)) {
          s.add(m);
          n++;
        }
      }
      sets.set(key, s);
      return n;
    },
    async srem(key: string, ...members: string[]): Promise<number> {
      const s = sets.get(key);
      if (!s) return 0;
      let n = 0;
      for (const m of members) if (s.delete(m)) n++;
      return n;
    },
    async smembers(key: string): Promise<string[]> {
      return Array.from(sets.get(key) ?? []);
    },
  };
}

describe("alerts re-subscription (blocklist 解除後の再登録)", () => {
  const prevSecret = process.env.ALERTS_TOKEN_SECRET;
  let fake: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    process.env.ALERTS_TOKEN_SECRET = TEST_SECRET;
    fake = createFakeRedis();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resetRedisForTest(fake as any);
  });

  afterEach(() => {
    resetRedisForTest(null);
    if (prevSecret === undefined) delete process.env.ALERTS_TOKEN_SECRET;
    else process.env.ALERTS_TOKEN_SECRET = prevSecret;
  });

  it("配信解除した email でも再登録すると pending と verify トークンが発行される", async () => {
    // 1. 登録 → verify → 配信解除（blocklist 入り）
    const first = await createOrUpdatePendingSubscriber(EMAIL, ["jp_hot"]);
    await verifySubscriber(first.verifyToken);
    await unsubscribeByUuid(first.uuid);

    const emailHash = hashEmail(EMAIL);
    expect(fake.store.strings.get(blocklistKey(emailHash))).toBeTruthy();
    expect(fake.store.strings.has(emailIndexKey(emailHash))).toBe(false);

    // 2. 再登録 → 旧仕様では空トークンで無音ドロップしていた。新仕様では発行される。
    const again = await createOrUpdatePendingSubscriber(EMAIL, ["jp_hot"]);
    expect(again.verifyToken).not.toBe("");
    expect(again.uuid).not.toBe("");
    // pending が Redis に書かれている
    expect(fake.store.strings.get(emailIndexKey(emailHash))).toBe(again.uuid);
    expect(
      fake.store.strings.has(verifyPendingKey(hashToken(again.verifyToken)))
    ).toBe(true);
  });

  it("再登録の verify 成功で blocklist がクリアされ index に復帰する", async () => {
    const first = await createOrUpdatePendingSubscriber(EMAIL, ["jp_hot"]);
    await verifySubscriber(first.verifyToken);
    await unsubscribeByUuid(first.uuid);

    const emailHash = hashEmail(EMAIL);
    const again = await createOrUpdatePendingSubscriber(EMAIL, ["jp_hot"]);
    const result = await verifySubscriber(again.verifyToken);

    expect(result.ok).toBe(true);
    // blocklist が消えている
    expect(fake.store.strings.has(blocklistKey(emailHash))).toBe(false);
    // variant index に再登録されている
    expect(fake.store.sets.get(variantIndexKey("jp_hot"))?.has(again.uuid)).toBe(
      true
    );
  });
});
