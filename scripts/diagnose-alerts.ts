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
  blocklistKey,
  emailIndexKey,
  lastStateKey,
  rateEmailKey,
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

  // blocklist は「過去に配信解除した」記録。現仕様では再登録をブロックせず、
  // verify 成功時に自動クリアされる（旧仕様の無音ドロップは廃止）。
  // email rate-limit（3/1h）は超過時に登録処理を無音で打ち切るので併せて確認する。
  const blocked = await redis.get<string>(blocklistKey(emailHash));
  if (blocked) {
    const ttl = await redis.ttl(blocklistKey(emailHash));
    const days = ttl > 0 ? Math.ceil(ttl / 86400) : "?";
    console.log(`  ℹ️ 過去に配信解除した記録あり（unsubscribedAt=${blocked} / 残り約${days}日）`);
    console.log(`     → 現仕様では再登録は可能。バナーから登録 + 確認メールのリンクを踏めば復帰し、blocklist は自動クリアされる。`);
  }
  const rateCounter = await redis.get<number>(rateEmailKey(emailHash));
  if (rateCounter != null) {
    const ttl = await redis.ttl(rateEmailKey(emailHash));
    console.log(`  ⏳ email rate-limit カウンタ=${rateCounter}（残り${ttl}秒）。3 を超えると無音で打ち切られます。`);
  }

  const uuid = await redis.get<string>(emailIndexKey(emailHash));
  if (!uuid) {
    console.log(`  ❌ 登録されていません（emailHash=${emailHash.slice(0, 12)}...）`);
    if (!blocked) {
      console.log(`  → pending すら無いので、登録 POST が createOrUpdatePendingSubscriber 到達前に`);
      console.log(`     失敗（415/403/400/429）したか、フォーム送信自体が成立していない可能性が高い。`);
    }
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
