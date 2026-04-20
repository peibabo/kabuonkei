/**
 * X（Twitter）自動ポストBot: 平日 JST 7:30 に前営業日引け時点の
 * 日米温度＋類似日ナラティブを X に自動投稿するスクリプト
 *
 * - 日本版スコア: 前営業日17:00のsnapshotから (snapshot-japan-fg.yml 由来)
 * - 米国版スコア: 直前の米国引け (JST 5:00-6:00) 時点の VIX/F&G
 * - 極端温度時 (score ≤ 20 or ≥ 80) は /api/og/daily のPNGを添付
 *
 * 実行:
 *   npm run post:daily-tweet              # 実投稿
 *   npm run post:daily-tweet -- --dry-run # 投稿せずコンソール出力のみ
 *
 * 必要な環境変数:
 *   X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET
 *   NEXT_PUBLIC_SITE_URL （画像fetch先、省略時 https://kabuonkei.com）
 */

import YahooFinance from "yahoo-finance2";
import { readFileSync } from "fs";
import { resolve } from "path";
import { TwitterApi } from "twitter-api-v2";
import { computeJapanFearGreed } from "../src/lib/japan-fear-greed";
import { fetchFearGreedIndex } from "../src/lib/fear-greed";
import {
  getSentimentLevel,
  getSentimentDescription,
} from "../src/lib/sentiment";
import type {
  ChartPoint,
  FearGreedData,
  JapanFearGreedData,
  JapanMarketData,
  SentimentLevel,
  SimilarDayEntry,
  SimilarDayMatch,
  SimilarDaysFile,
} from "../src/lib/types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const MARKET_DATA_PATH = resolve(
  __dirname,
  "../src/data/japan-market-data.json",
);
const JAPAN_SIMILAR_PATH = resolve(
  __dirname,
  "../src/data/japan-similar-days.json",
);
const US_SIMILAR_PATH = resolve(__dirname, "../src/data/us-similar-days.json");
const MARKET_EVENTS_PATH = resolve(__dirname, "../src/data/market-events.json");

const DEFAULT_SITE_URL = "https://kabuonkei.com";
const DAILY_OG_PATH = "/api/og/daily";

// --- 純粋関数（テスト対象） ----------------------------------------------------

export interface TweetContext {
  dateLabel: string; // "4/19(月)"
  japanScore: number | null;
  usScore: number | null;
  japanLevel: SentimentLevel | null;
  usLevel: SentimentLevel | null;
  /** 日本版の類似日。null の場合は usSimilar にフォールバック */
  japanSimilar: SimilarDayMatch | null;
  usSimilar: SimilarDayMatch | null;
  siteUrl: string;
}

/** "4/19(月)" 形式の JST 日付ラベル */
export function formatJstDateLabel(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][jst.getUTCDay()];
  return `${month}/${day}(${weekday})`;
}

/**
 * similar-days.ts の findSimilarDays と同一ロジック。
 * `@/data/...` import を避けるため tsx 実行用にインライン化。
 */
export function findSimilarDays(
  currentScore: number,
  history: SimilarDayEntry[],
  events: Record<string, string>,
  topN = 1,
): SimilarDayMatch[] {
  return history
    .filter((h) => h.return3m !== null)
    .map<SimilarDayMatch>((h) => ({
      ...h,
      scoreDiff: Math.abs(h.score - currentScore),
      eventLabel: events[h.date],
    }))
    .sort((a, b) => {
      if (a.scoreDiff !== b.scoreDiff) return a.scoreDiff - b.scoreDiff;
      const aHasLabel = Boolean(a.eventLabel);
      const bHasLabel = Boolean(b.eventLabel);
      if (aHasLabel !== bHasLabel) return aHasLabel ? -1 : 1;
      return b.date.localeCompare(a.date);
    })
    .slice(0, topN);
}

/** 日米いずれかが極端温度 (score ≤ 20 or ≥ 80) */
export function shouldAttachImage(
  japanScore: number | null,
  usScore: number | null,
): boolean {
  const extreme = (s: number | null) => s != null && (s <= 20 || s >= 80);
  return extreme(japanScore) || extreme(usScore);
}

function extremeBadge(
  japanScore: number | null,
  usScore: number | null,
): string | null {
  const scores = [japanScore, usScore].filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  if (Math.min(...scores) <= 20) return "⚠️ 極寒アラート";
  if (Math.max(...scores) >= 80) return "🔥 沸騰アラート";
  return null;
}

function formatReturn(value: number | null): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value * 10) / 10}%`;
}

function formatSimilarLine(match: SimilarDayMatch): string {
  const label = match.eventLabel ? ` ${match.eventLabel}` : "";
  const ret = `1M ${formatReturn(match.return1m)} / 3M ${formatReturn(match.return3m)} / 6M ${formatReturn(match.return6m)}`;
  return `📅 似た日: ${match.date}${label} (${match.score})\n→ ${ret}`;
}

/** 投稿テンプレートを組み立て。日米欠損時はその行をスキップ */
export function buildTweetBody(ctx: TweetContext): string {
  const lines: string[] = [];
  const badge = extremeBadge(ctx.japanScore, ctx.usScore);
  lines.push(
    badge
      ? `${badge} ${ctx.dateLabel} 寄り前`
      : `🌡 ${ctx.dateLabel} 寄り前チェック`,
  );
  lines.push("");
  lines.push("前営業日引け時点");

  if (ctx.japanScore != null && ctx.japanLevel) {
    const desc = getSentimentDescription(ctx.japanScore);
    lines.push(`🇯🇵 ${ctx.japanScore} ${ctx.japanLevel} (${desc})`);
  }
  if (ctx.usScore != null && ctx.usLevel) {
    const desc = getSentimentDescription(ctx.usScore);
    lines.push(`🇺🇸 ${ctx.usScore} ${ctx.usLevel} (${desc})`);
  }

  const similar = ctx.japanSimilar ?? ctx.usSimilar;
  if (similar) {
    lines.push("");
    lines.push(formatSimilarLine(similar));
  }

  lines.push("");
  lines.push(`▶ ${ctx.siteUrl}?utm_source=x&utm_campaign=daily`);

  return lines.join("\n");
}

/**
 * X の加重文字数を概算。
 * URL は常に 23、ASCII は 1、それ以外（日本語・絵文字）は 2 でカウント。
 * 実際の X の計算はもう少し複雑だが、安全側に倒せば 280 以内判定として十分。
 */
export function estimateWeightedLength(text: string): number {
  const urlRegex = /https?:\/\/\S+/g;
  const urlMatches = text.match(urlRegex) ?? [];
  const noUrls = text.replace(urlRegex, "");
  let n = urlMatches.length * 23;
  for (const ch of Array.from(noUrls)) {
    const code = ch.codePointAt(0) ?? 0;
    n += code < 0x80 ? 1 : 2;
  }
  return n;
}

// --- 副作用あり（スクリプト本体） --------------------------------------------

async function fetchChart(symbol: string, days: number): Promise<ChartPoint[]> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await yahooFinance.chart(symbol, {
    period1: startDate.toISOString().split("T")[0],
    period2: endDate.toISOString().split("T")[0],
    interval: "1d",
  });

  return result.quotes
    .filter((q) => q.close != null)
    .map((q) => ({
      date: new Date(q.date).toISOString().split("T")[0],
      value: Math.round((q.close as number) * 100) / 100,
    }));
}

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const result = await yahooFinance.quote(symbol);
    if (!result || result.regularMarketPrice == null) return null;
    return result.regularMarketPrice;
  } catch {
    return null;
  }
}

async function loadMarketContext(): Promise<{
  fearGreed: FearGreedData | null;
  japanFearGreed: JapanFearGreedData | null;
}> {
  const marketData = JSON.parse(
    readFileSync(MARKET_DATA_PATH, "utf-8"),
  ) as JapanMarketData;

  const [vixPrice, nikkeiChart, usdJpyChart, nikkeiPrice, usdJpyRate] =
    await Promise.all([
      fetchPrice("^VIX"),
      fetchChart("^N225", 200),
      fetchChart("USDJPY=X", 80),
      fetchPrice("^N225"),
      fetchPrice("USDJPY=X"),
    ]);

  let fearGreed: FearGreedData | null = null;
  try {
    fearGreed = await fetchFearGreedIndex(vixPrice ?? undefined);
  } catch (err) {
    console.warn("F&G取得失敗:", err);
  }

  const japanFearGreed = computeJapanFearGreed({
    nikkei225Chart: nikkeiChart,
    nikkei225Price: nikkeiPrice,
    usdJpyRate,
    usdJpyChart,
    investorTrading: marketData.investorTrading ?? null,
    marginTrading: marketData.marginTrading ?? null,
    arbitrageBalance: marketData.arbitrageBalance ?? null,
  });

  return { fearGreed, japanFearGreed };
}

function loadSimilarDays(path: string): SimilarDayEntry[] {
  return (JSON.parse(readFileSync(path, "utf-8")) as SimilarDaysFile).daily;
}

function loadEvents(): Record<string, string> {
  return JSON.parse(readFileSync(MARKET_EVENTS_PATH, "utf-8"));
}

async function fetchDailyOgImage(siteUrl: string): Promise<Buffer | null> {
  const url = `${siteUrl}${DAILY_OG_PATH}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.warn(`OG画像取得失敗: ${res.status} ${url}`);
      return null;
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch (err) {
    console.warn("OG画像取得例外:", err);
    return null;
  }
}

async function postTweet(text: string, image: Buffer | null): Promise<void> {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    throw new Error(
      "X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET が未設定",
    );
  }

  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  let mediaIds: [string] | undefined;
  if (image) {
    try {
      const mediaId = await client.v1.uploadMedia(image, {
        mimeType: "image/png",
      });
      mediaIds = [mediaId];
    } catch (err) {
      console.warn("画像アップロード失敗（テキストのみで続行）:", err);
    }
  }

  await client.v2.tweet({
    text,
    ...(mediaIds ? { media: { media_ids: mediaIds } } : {}),
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const dateLabel = formatJstDateLabel();

  console.log(
    `🌡 X Bot 投稿処理開始 (${dateLabel})${dryRun ? " [DRY RUN]" : ""}`,
  );

  const { fearGreed, japanFearGreed } = await loadMarketContext();
  const japanScore = japanFearGreed?.score ?? null;
  const usScore = fearGreed?.score ?? null;

  if (japanScore == null && usScore == null) {
    console.warn("日米いずれの温度も取得できず、投稿をスキップします");
    return;
  }

  const events = loadEvents();
  const japanSimilar =
    japanScore != null
      ? (findSimilarDays(
          japanScore,
          loadSimilarDays(JAPAN_SIMILAR_PATH),
          events,
          1,
        )[0] ?? null)
      : null;
  const usSimilar =
    usScore != null
      ? (findSimilarDays(
          usScore,
          loadSimilarDays(US_SIMILAR_PATH),
          events,
          1,
        )[0] ?? null)
      : null;

  const ctx: TweetContext = {
    dateLabel,
    japanScore,
    usScore,
    japanLevel: japanScore != null ? getSentimentLevel(japanScore) : null,
    usLevel: usScore != null ? getSentimentLevel(usScore) : null,
    japanSimilar,
    usSimilar,
    siteUrl,
  };

  const text = buildTweetBody(ctx);
  const attach = shouldAttachImage(japanScore, usScore);
  const weighted = estimateWeightedLength(text);

  console.log("\n---- 投稿文 ----");
  console.log(text);
  console.log("----------------");
  console.log(`画像添付: ${attach ? "あり（極端温度）" : "なし（通常日）"}`);
  console.log(`加重文字数(概算): ${weighted}/280`);

  if (weighted > 280) {
    console.warn("⚠️ 加重文字数が 280 を超過。類似日行を省略して再構築します");
    const shrunk = buildTweetBody({
      ...ctx,
      japanSimilar: null,
      usSimilar: null,
    });
    if (dryRun) {
      console.log("\n---- 縮小後投稿文 ----");
      console.log(shrunk);
      console.log("----------------------");
      return;
    }
    let image: Buffer | null = null;
    if (attach) image = await fetchDailyOgImage(siteUrl);
    await postTweet(shrunk, image);
    console.log("\n✅ 投稿完了（類似日省略）");
    return;
  }

  if (dryRun) {
    console.log("\n[DRY RUN] 投稿せず終了");
    return;
  }

  let image: Buffer | null = null;
  if (attach) {
    image = await fetchDailyOgImage(siteUrl);
  }

  await postTweet(text, image);
  console.log("\n✅ 投稿完了");
}

// Vitest など import 経由で読み込まれた場合は main() を走らせない
// （process.argv[1] はスクリプトのエントリファイルのパス）
const entry = process.argv[1] ?? "";
if (/post-daily-temperature-tweet(\.[tj]s)?$/.test(entry)) {
  main().catch((err) => {
    console.error("致命的エラー:", err);
    process.exit(1);
  });
}
