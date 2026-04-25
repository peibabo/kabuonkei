import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createToken,
  hashEmail,
  hashToken,
  verifyToken,
} from "@/lib/alerts/tokens";

const TEST_SECRET = "a".repeat(64);

describe("alerts tokens", () => {
  const prevSecret = process.env.ALERTS_TOKEN_SECRET;

  beforeEach(() => {
    process.env.ALERTS_TOKEN_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    if (prevSecret === undefined) {
      delete process.env.ALERTS_TOKEN_SECRET;
    } else {
      process.env.ALERTS_TOKEN_SECRET = prevSecret;
    }
  });

  it("verify トークンはラウンドトリップで復元可能、exp は 24h", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const token = createToken("uuid-a", "verify", now);
    const result = verifyToken(token, "verify", now);
    expect(result.ok).toBe(true);
    expect(result.payload?.uuid).toBe("uuid-a");
    expect(result.payload?.action).toBe("verify");
    expect(result.payload?.exp).toBe(now + 24 * 60 * 60 * 1000);
  });

  it("unsubscribe トークンは exp=null（恒久）", () => {
    const token = createToken("uuid-b", "unsubscribe");
    const result = verifyToken(token, "unsubscribe");
    expect(result.ok).toBe(true);
    expect(result.payload?.exp).toBeNull();
  });

  it("改ざんされたトークンは invalid", () => {
    const token = createToken("uuid-c", "verify");
    const tampered = token.slice(0, -4) + "zzzz";
    const result = verifyToken(tampered, "verify");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid");
  });

  it("action が一致しないとき action_mismatch", () => {
    const token = createToken("uuid-d", "verify");
    const result = verifyToken(token, "unsubscribe");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("action_mismatch");
  });

  it("exp を超過すると expired", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    const token = createToken("uuid-e", "verify", now);
    const future = now + 25 * 60 * 60 * 1000;
    const result = verifyToken(token, "verify", future);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("expired");
  });

  it("異なる SECRET で生成したトークンは invalid", () => {
    const token = createToken("uuid-f", "verify");
    process.env.ALERTS_TOKEN_SECRET = "b".repeat(64);
    const result = verifyToken(token, "verify");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid");
  });

  it("SECRET 未設定で throw", () => {
    delete process.env.ALERTS_TOKEN_SECRET;
    expect(() => createToken("uuid-g", "verify")).toThrow();
  });

  it("hashEmail はトリム + 小文字化して sha256", () => {
    const a = hashEmail("Foo@Example.COM");
    const b = hashEmail("  foo@example.com  ");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hashToken は sha256 の hex 64 文字", () => {
    const h = hashToken("some-token.with.signature");
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});
