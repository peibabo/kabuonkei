/**
 * 温度アラート 診断スクリプト（一時利用）
 *
 * 使い方:
 *   npx tsx scripts/diagnose-alerts.ts <email>
 *
 * 表示する情報:
 *   - 引数 email が登録されているか / verified か / どの variant か
 *   - alerts:last-state:us-fg / jp-fg の現在値
 *   - alerts:index:{variant} の購読者数（一覧）
 */
import { createHash } from "crypto";

import { getRedis } from "../src/lib/alerts/redis";
import {
  emailIndexKey,
  lastStateKey,
  subscriberKey,
  variantIndexKey,
} from "../src/lib/alerts/keys";
import type { AlertVariant } from "../src/lib/types";

const ALL_VARIANTS: AlertVariant[] = ["us_cold", "us_hot", "jp_cold", "jp_hot"];

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/diagnose-alerts.ts <email>");
    process.exit(1);
  }

  const redis = getRedis();

  console.log(`\n=== 1. last-state ===`);
  for (const market of ["us", "jp"] as const) {
    const v = await redis.get<string>(lastStateKey(market));
    console.log(`  alerts:last-state:${market}-fg = ${v ?? "(unset)"}`);
  }

  console.log(`\n=== 2. variant index sizes ===`);
  for (const v of ALL_VARIANTS) {
    const members = await redis.smembers(variantIndexKey(v));
    console.log(`  alerts:index:${v} = ${members.length} subscriber(s)`);
  }

  console.log(`\n=== 3. email lookup: ${email} ===`);
  const emailHash = sha256Hex(email.trim().toLowerCase());
  const uuid = await redis.get<string>(emailIndexKey(emailHash));
  if (!uuid) {
    console.log(`  ❌ 登録されていません（emailHash=${emailHash.slice(0, 12)}...）`);
    console.log(`  → ダッシュボードのアラートバナーから登録 + 確認メールクリックが必要`);
    return;
  }
  console.log(`  uuid = ${uuid}`);
  const sub = await redis.hgetall<Record<string, string>>(subscriberKey(uuid));
  if (!sub) {
    console.log(`  ❌ subscriber hash が見つかりません`);
    return;
  }
  console.log(`  email      = ${sub.email}`);
  console.log(`  verified   = ${sub.verified}`);
  console.log(`  variants   = ${sub.variants}`);
  console.log(`  createdAt  = ${sub.createdAt}`);
  console.log(`  verifiedAt = ${sub.verifiedAt ?? "(none)"}`);

  console.log(`\n=== 4. variant index 所属確認 ===`);
  for (const v of ALL_VARIANTS) {
    const isMember = await redis.sismember(variantIndexKey(v), uuid);
    console.log(`  alerts:index:${v}: ${isMember ? "✅ 含まれる" : "—"}`);
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
