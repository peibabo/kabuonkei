/**
 * 温度アラート 購読者一覧スクリプト
 *
 * 使い方:
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/list-alert-subscribers.ts                    # 全件
 *   npx tsx scripts/list-alert-subscribers.ts --verified-only    # 確認済みのみ
 *   npx tsx scripts/list-alert-subscribers.ts --variant jp_hot   # 特定 variant の verified 購読者
 *
 * 出力: TSV（email <TAB> verified <TAB> variants <TAB> createdAt <TAB> verifiedAt）
 */
import { getRedis } from "../src/lib/alerts/redis";
import { KEY_PREFIX, variantIndexKey } from "../src/lib/alerts/keys";
import { parseVariants } from "../src/lib/alerts/subscribers";
import { ALERT_VARIANTS } from "../src/lib/types";
import type { AlertVariant } from "../src/lib/types";

interface Row {
  uuid: string;
  email: string;
  verified: boolean;
  variants: AlertVariant[];
  createdAt: string;
  verifiedAt: string;
}

function parseArgs(argv: string[]) {
  const verifiedOnly = argv.includes("--verified-only");
  const variantIdx = argv.indexOf("--variant");
  const variant =
    variantIdx >= 0 ? (argv[variantIdx + 1] as AlertVariant | undefined) : null;
  if (variant && !ALERT_VARIANTS.includes(variant)) {
    throw new Error(
      `--variant は ${ALERT_VARIANTS.join(" | ")} のいずれかを指定してください`
    );
  }
  return { verifiedOnly, variant: variant ?? null };
}

async function fetchSubscriber(
  redis: ReturnType<typeof getRedis>,
  uuid: string
): Promise<Row | null> {
  const sub = await redis.hgetall<Record<string, unknown>>(
    `${KEY_PREFIX}:sub:${uuid}`
  );
  if (!sub) return null;
  const email = typeof sub.email === "string" ? sub.email : "";
  const verified = sub.verified === "true" || sub.verified === true;
  const createdAt = typeof sub.createdAt === "string" ? sub.createdAt : "";
  const verifiedAt = typeof sub.verifiedAt === "string" ? sub.verifiedAt : "";
  return {
    uuid,
    email,
    verified,
    variants: parseVariants(sub.variants),
    createdAt,
    verifiedAt,
  };
}

async function main() {
  const { verifiedOnly, variant } = parseArgs(process.argv.slice(2));
  const redis = getRedis();

  const rows: Row[] = [];

  if (variant) {
    const uuids = (await redis.smembers(variantIndexKey(variant))) as string[];
    for (const uuid of uuids) {
      const r = await fetchSubscriber(redis, uuid);
      if (r && r.verified) rows.push(r);
    }
  } else {
    const pattern = `${KEY_PREFIX}:sub:*`;
    let cursor: string | number = 0;
    do {
      const result: [string | number, string[]] = (await redis.scan(cursor, {
        match: pattern,
        count: 200,
      })) as unknown as [string | number, string[]];
      const [next, keys] = result;
      cursor = Number(next);
      for (const key of keys) {
        const uuid = key.slice(`${KEY_PREFIX}:sub:`.length);
        const r = await fetchSubscriber(redis, uuid);
        if (!r) continue;
        if (verifiedOnly && !r.verified) continue;
        rows.push(r);
      }
    } while (cursor !== 0);
  }

  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  // variant 別カウント
  const counts: Record<string, number> = Object.fromEntries(
    ALERT_VARIANTS.map((v) => [v, 0])
  );
  let verifiedCount = 0;
  for (const r of rows) {
    if (r.verified) {
      verifiedCount += 1;
      for (const v of r.variants) counts[v] = (counts[v] ?? 0) + 1;
    }
  }

  // ヘッダ
  console.log(
    ["email", "verified", "variants", "createdAt", "verifiedAt"].join("\t")
  );
  for (const r of rows) {
    console.log(
      [
        r.email,
        r.verified ? "✓" : "—",
        r.variants.join(","),
        r.createdAt,
        r.verifiedAt || "—",
      ].join("\t")
    );
  }

  console.error(``);
  console.error(`📊 サマリ`);
  console.error(`  表示件数: ${rows.length}`);
  console.error(`  うち verified: ${verifiedCount}`);
  if (!variant) {
    console.error(`  variant 別 verified 購読者数:`);
    for (const v of ALERT_VARIANTS) {
      console.error(`    ${v}: ${counts[v]}`);
    }
  }
}

main().catch((err) => {
  console.error("致命的エラー:", err);
  process.exit(1);
});
