/**
 * 温度アラート variant index 復旧スクリプト（一時利用）
 *
 * 背景:
 *   verifySubscriber 内の parseVariants バグにより、verified=true なのに
 *   alerts:index:{variant} に追加されていない subscriber が存在していた。
 *   parseVariants の修正と並行で、既存データを正しい状態へ修復するために使う。
 *
 * 動作:
 *   - SCAN alerts:sub:* で全 subscriber を列挙
 *   - verified=true の subscriber について、宣言された variants すべての
 *     index Set に sadd（冪等。既に入っていれば no-op）
 *   - 副次対応として alerts:last-state:{us|jp}-fg を DEL（再 dispatch を可能に）
 *
 * 使い方:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/repair-alert-indices.ts            # 修復実行
 *   npx tsx scripts/repair-alert-indices.ts --dry-run  # 実行内容を出力のみ
 */
import { getRedis } from "../src/lib/alerts/redis";
import {
  KEY_PREFIX,
  lastStateKey,
  variantIndexKey,
} from "../src/lib/alerts/keys";
import { parseVariants } from "../src/lib/alerts/subscribers";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const redis = getRedis();
  const pattern = `${KEY_PREFIX}:sub:*`;

  console.log(
    `🔧 variant index 復旧${dryRun ? " [DRY RUN]" : ""} (pattern=${pattern})`
  );

  let cursor: string | number = 0;
  let scanned = 0;
  let repaired = 0;
  const addedPerVariant: Record<string, number> = {};

  do {
    const result: [string | number, string[]] = (await redis.scan(cursor, {
      match: pattern,
      count: 200,
    })) as unknown as [string | number, string[]];
    const [next, keys] = result;
    cursor = Number(next);

    for (const key of keys) {
      scanned += 1;
      const sub = await redis.hgetall<Record<string, unknown>>(key);
      if (!sub) continue;
      if (sub.verified !== "true" && sub.verified !== true) continue;
      const uuid = typeof sub.uuid === "string" ? sub.uuid : null;
      if (!uuid) continue;
      const variants = parseVariants(sub.variants);
      if (variants.length === 0) {
        console.warn(`⚠️  ${key}: variants 解釈不能（raw=${String(sub.variants)})`);
        continue;
      }
      let didRepair = false;
      for (const v of variants) {
        const idxKey = variantIndexKey(v);
        const isMember = await redis.sismember(idxKey, uuid);
        if (isMember) continue;
        if (!dryRun) {
          await redis.sadd(idxKey, uuid);
        }
        addedPerVariant[v] = (addedPerVariant[v] ?? 0) + 1;
        didRepair = true;
        console.log(
          `  ${dryRun ? "[would]" : "[fixed]"} sadd ${idxKey} ${uuid} (email=${sub.email})`
        );
      }
      if (didRepair) repaired += 1;
    }
  } while (cursor !== 0);

  console.log(`\n📊 サマリ`);
  console.log(`  スキャン: ${scanned} subscriber`);
  console.log(`  復旧: ${repaired} subscriber`);
  for (const [v, n] of Object.entries(addedPerVariant)) {
    console.log(`    + alerts:index:${v}: +${n}`);
  }

  console.log(`\n♻️  last-state リセット`);
  for (const market of ["us", "jp"] as const) {
    const cur = await redis.get<string>(lastStateKey(market));
    if (cur == null) {
      console.log(`  alerts:last-state:${market}-fg は既に未設定`);
      continue;
    }
    if (dryRun) {
      console.log(
        `  [would] del alerts:last-state:${market}-fg (current=${cur})`
      );
    } else {
      await redis.del(lastStateKey(market));
      console.log(`  [done] del alerts:last-state:${market}-fg (was=${cur})`);
    }
  }

  console.log(`\n✅ 完了`);
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
