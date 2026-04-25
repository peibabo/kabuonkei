/**
 * 温度アラート発火チェック & メール送信スクリプト
 *
 * 平日 JST 07:00（米国版）および 17:15（日本版）に GitHub Actions から起動される。
 * - 最新の F&G スコアを取得
 * - 前回状態（Redis）と比較し、neutral→cold/hot の遷移があれば該当 variant の購読者へ送信
 * - 送信は Resend、永続化は Upstash Redis（Vercel Marketplace の "Upstash for Redis"）
 *
 * 実行:
 *   npm run alerts:check -- --variant us
 *   npm run alerts:check -- --variant jp
 *   npm run alerts:check -- --variant us --dry-run
 *
 * 必要な環境変数:
 *   KV_REST_API_URL / KV_REST_API_TOKEN
 *   RESEND_API_KEY / RESEND_FROM_EMAIL
 *   ALERTS_TOKEN_SECRET
 *   NEXT_PUBLIC_SITE_URL（省略時 https://kabuonkei.com）
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import YahooFinance from "yahoo-finance2";
import { fetchFearGreedIndex } from "../src/lib/fear-greed";
import { findSimilarDays } from "../src/lib/similar-days/find";
import { getRedis } from "../src/lib/alerts/redis";
import { lastStateKey, failuresKey } from "../src/lib/alerts/keys";
import {
  COLD_THRESHOLD,
  HOT_THRESHOLD,
  computeCurrentState,
  parseStoredState,
  shouldFire,
} from "../src/lib/alerts/state-transition";
import { listVerifiedSubscribersForVariant } from "../src/lib/alerts/subscribers";
import { buildAlertEmail } from "../src/lib/alerts/email-templates";
import { sendEmail } from "../src/lib/alerts/resend";
import type {
  AlertKind,
  AlertMarket,
  AlertState,
  SimilarDayEntry,
  SimilarDaysFile,
} from "../src/lib/types";
import {
  formatJstFullDateLabel,
  jstIsoDate,
  variantOf,
} from "./_lib/alert-state";

const DEFAULT_SITE_URL = "https://kabuonkei.com";
const US_SIMILAR_PATH = resolve(__dirname, "../src/data/us-similar-days.json");
const JP_SIMILAR_PATH = resolve(
  __dirname,
  "../src/data/japan-similar-days.json"
);
const JP_SNAPSHOTS_PATH = resolve(
  __dirname,
  "../src/data/japan-fg-snapshots.json"
);
const EVENTS_META_PATH = resolve(__dirname, "../src/data/events-meta.json");

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

interface CliArgs {
  variant: AlertMarket;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const variantIndex = argv.indexOf("--variant");
  const variant = variantIndex >= 0 ? argv[variantIndex + 1] : "";
  if (variant !== "us" && variant !== "jp") {
    throw new Error("--variant us|jp を指定してください");
  }
  return { variant, dryRun: argv.includes("--dry-run") };
}

async function fetchUsScore(): Promise<number | null> {
  let vix: number | null = null;
  try {
    const q = await yahooFinance.quote("^VIX");
    vix = q?.regularMarketPrice ?? null;
  } catch (err) {
    console.warn("VIX 取得失敗:", err);
  }
  try {
    const fg = await fetchFearGreedIndex(vix ?? undefined);
    return fg.score;
  } catch (err) {
    console.error("F&G 取得失敗:", err);
    return null;
  }
}

function fetchJpScore(): number | null {
  try {
    const raw = JSON.parse(readFileSync(JP_SNAPSHOTS_PATH, "utf-8")) as {
      snapshots: Array<{ date: string; score: number }>;
    };
    const snapshots = raw.snapshots ?? [];
    if (snapshots.length === 0) return null;
    const latest = snapshots[snapshots.length - 1];
    return latest?.score ?? null;
  } catch (err) {
    console.error("JP snapshot 読み込み失敗:", err);
    return null;
  }
}

function loadEvents(): Record<string, string> {
  const entries = JSON.parse(readFileSync(EVENTS_META_PATH, "utf-8")) as Array<{
    date: string;
    label: string;
  }>;
  const map: Record<string, string> = {};
  for (const e of entries) map[e.date] = e.label;
  return map;
}

function loadSimilarDays(path: string): SimilarDayEntry[] {
  return (JSON.parse(readFileSync(path, "utf-8")) as SimilarDaysFile).daily;
}

function similarDayForMarket(market: AlertMarket, score: number) {
  const path = market === "us" ? US_SIMILAR_PATH : JP_SIMILAR_PATH;
  const entries = loadSimilarDays(path);
  const events = loadEvents();
  const match = findSimilarDays(score, entries, events, 1)[0];
  if (!match) return null;
  return {
    date: match.date,
    label: match.eventLabel ?? "類似日",
    return1m: match.return1m,
    return3m: match.return3m,
    return6m: match.return6m,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(
    /\/+$/,
    ""
  );
  const dateLabel = formatJstFullDateLabel();

  console.log(
    `🔔 温度アラートチェック [variant=${args.variant}]${args.dryRun ? " [DRY RUN]" : ""} ${dateLabel}`
  );

  const score =
    args.variant === "us" ? await fetchUsScore() : fetchJpScore();

  if (score == null) {
    console.error(
      `スコア取得失敗。処理中断（状態更新もスキップ）: variant=${args.variant}`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `現在スコア: ${score}（cold≤${COLD_THRESHOLD} / hot≥${HOT_THRESHOLD}）`
  );

  const redis = getRedis();
  const lastStateRaw = (await redis.get<string>(
    lastStateKey(args.variant)
  )) ?? null;
  const prevState: AlertState = parseStoredState(lastStateRaw);
  const currState = computeCurrentState(prevState, score);
  const decision = shouldFire(prevState, currState);

  console.log(
    `状態遷移: ${prevState} → ${currState}${decision.fire ? " 🔔 発火" : "（発火せず）"}`
  );

  if (!decision.fire || !decision.kind) {
    if (!args.dryRun) {
      await redis.set(lastStateKey(args.variant), currState);
      console.log(`last-state を ${currState} に更新しました`);
    } else {
      console.log(`[DRY RUN] last-state 更新スキップ`);
    }
    return;
  }

  const kind: AlertKind = decision.kind;
  const variantForKind = variantOf(args.variant, kind);
  const subscribers = await listVerifiedSubscribersForVariant(variantForKind);
  console.log(`対象購読者: ${subscribers.length} 件（variant=${variantForKind}）`);

  const similar = similarDayForMarket(args.variant, score);

  let ok = 0;
  let failed = 0;
  const today = jstIsoDate();

  for (const sub of subscribers) {
    const unsubscribeUrl = `${site}/api/alerts/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`;
    const mail = buildAlertEmail({
      market: args.variant,
      kind,
      score,
      dateLabelJst: dateLabel,
      dashboardUrl: `${site}/?utm_source=email&utm_campaign=alert_${args.variant}_${kind}`,
      unsubscribeUrl,
      similarDay: similar,
    });

    if (args.dryRun) {
      console.log(`[DRY RUN] to=${sub.email} subject=${mail.subject}`);
      ok += 1;
      continue;
    }

    const result = await sendEmail({
      to: sub.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (result.ok) {
      ok += 1;
    } else {
      failed += 1;
      console.warn(`送信失敗 ${sub.email}: ${result.error}`);
      await redis.sadd(failuresKey(today, variantForKind), sub.uuid);
      await redis.expire(failuresKey(today, variantForKind), 30 * 24 * 60 * 60);
    }

    // Resend は 10 req/sec。安全側で 120ms スリープ
    await new Promise((r) => setTimeout(r, 120));
  }

  if (!args.dryRun) {
    await redis.set(lastStateKey(args.variant), currState);
    console.log(`last-state を ${currState} に更新しました`);
  }

  console.log(`送信結果: success=${ok} / failed=${failed}`);
  if (failed > 0) process.exitCode = 2;
}

const entry = process.argv[1] ?? "";
if (/check-temperature-alerts(\.[tj]s)?$/.test(entry)) {
  main().catch((err) => {
    console.error("致命的エラー:", err);
    process.exit(1);
  });
}
