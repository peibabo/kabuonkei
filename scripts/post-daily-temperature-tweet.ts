/**
 * X（Twitter）自動ポストBot: 平日 JST 7:30 に前営業日引け時点の
 * 日米温度＋類似日ナラティブを X に自動投稿するスクリプト
 *
 * - 日本版スコア: 前営業日17:00のsnapshotから (snapshot-japan-fg.yml 由来)
 * - 米国版スコア: 直前の米国引け (JST 5:00-6:00) 時点の VIX/F&G
 * - 極端温度時 (score ≤ 20 or ≥ 80) は /api/og/daily のPNGを添付
 *
 * データ利用方針:
 * - Yahoo Finance から取得する生値（VIX / 日経225 / USDJPY 等）は内部の温度スコア計算にのみ使用する
 * - ツイート本文・添付OG画像には「独自計算した温度スコア（0-100）」と「類似日リターン」のみを出力し、
 *   価格・指数値の生データは一切公開しない（= 一次市場データの再配信には該当させない運用）
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
import { findSimilarDays } from "../src/lib/similar-days/find";
import {
  COLD_THRESHOLD,
  HOT_THRESHOLD,
} from "../src/lib/alerts/state-transition";
import { formatJstDateLabel } from "../src/lib/jst-date";
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

// 既存テスト（scripts/__tests__/post-daily-temperature-tweet.test.ts）との後方互換のため
// 同名関数を再 export。実体は src/lib/similar-days/find.ts / src/lib/jst-date.ts
export { findSimilarDays, formatJstDateLabel };

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
const EVENTS_META_PATH = resolve(__dirname, "../src/data/events-meta.json");

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

/**
 * 日米いずれかのスコアが取得できていれば温度入りキャプチャを添付する。
 * 両方欠損のときだけ false（この場合は投稿自体がスキップされる）。
 * 以前は極端温度 (≤20 / ≥80) の日だけ添付していたが、通常日は X が
 * トップページの静的 og:image をスクレイプしデフォルト画像になっていたため、
 * 毎日 /api/og/daily の動的画像を添付する方針に変更した。
 */
export function shouldAttachImage(
  japanScore: number | null,
  usScore: number | null,
): boolean {
  return japanScore != null || usScore != null;
}

function extremeBadge(
  japanScore: number | null,
  usScore: number | null,
): string | null {
  const scores = [japanScore, usScore].filter((s): s is number => s != null);
  if (scores.length === 0) return null;
  if (Math.min(...scores) <= COLD_THRESHOLD) return "⚠️ 極寒アラート";
  const max = Math.max(...scores);
  // ちょうど 80 は温度計ゲージと同じ「過熱」（沸騰は 81 以上）なので実スコアから導出
  if (max >= HOT_THRESHOLD) return `🔥 ${getSentimentLevel(max)}アラート`;
  return null;
}

function formatReturn(value: number | null): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${Math.round(value * 10) / 10}%`;
}

function formatSimilarLine(match: SimilarDayMatch, siteUrl?: string): string {
  const label = match.eventLabel ? ` ${match.eventLabel}` : "";
  const ret = `1M ${formatReturn(match.return1m)} / 3M ${formatReturn(match.return3m)} / 6M ${formatReturn(match.return6m)}`;
  const lines = [`📅 似た日: ${match.date}${label} (${match.score})`, `→ ${ret}`];
  if (siteUrl && match.eventSlug) {
    lines.push(
      `▶ ${siteUrl}/events/${match.eventSlug}?utm_source=x&utm_campaign=event_link`,
    );
  }
  return lines.join("\n");
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
    lines.push(formatSimilarLine(similar, ctx.siteUrl));
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
  const entries = JSON.parse(readFileSync(EVENTS_META_PATH, "utf-8")) as Array<{
    date: string;
    label: string;
  }>;
  const map: Record<string, string> = {};
  for (const e of entries) map[e.date] = e.label;
  return map;
}

function loadEventDateToSlug(): Record<string, string> {
  const entries = JSON.parse(readFileSync(EVENTS_META_PATH, "utf-8")) as Array<{
    date: string;
    slug: string;
  }>;
  const map: Record<string, string> = {};
  for (const e of entries) map[e.date] = e.slug;
  return map;
}

/** SimilarDayMatch にイベントスラッグを注入（eventLabel 付き行のみ） */
export function enrichMatchWithSlug(
  match: SimilarDayMatch | null,
  dateToSlug: Record<string, string>,
): SimilarDayMatch | null {
  if (match == null || !match.eventLabel) return match;
  const slug = dateToSlug[match.date];
  return slug ? { ...match, eventSlug: slug } : match;
}

async function fetchDailyOgImage(
  siteUrl: string,
  params: { japanScore: number | null; usScore: number | null; isoDate: string },
): Promise<Buffer | null> {
  const url = new URL(DAILY_OG_PATH, siteUrl);
  if (params.japanScore != null)
    url.searchParams.set("jp", String(params.japanScore));
  if (params.usScore != null)
    url.searchParams.set("us", String(params.usScore));
  url.searchParams.set("date", params.isoDate);
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

/** JST基準で YYYY-MM-DD を返す */
export function jstIsoDate(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
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
  const dateToSlug = loadEventDateToSlug();
  const japanSimilar = enrichMatchWithSlug(
    japanScore != null
      ? (findSimilarDays(
          japanScore,
          loadSimilarDays(JAPAN_SIMILAR_PATH),
          events,
          1,
        )[0] ?? null)
      : null,
    dateToSlug,
  );
  const usSimilar = enrichMatchWithSlug(
    usScore != null
      ? (findSimilarDays(
          usScore,
          loadSimilarDays(US_SIMILAR_PATH),
          events,
          1,
        )[0] ?? null)
      : null,
    dateToSlug,
  );

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
  console.log(`画像添付: ${attach ? "あり（温度キャプチャ）" : "なし（日米とも欠損）"}`);
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
    if (attach)
      image = await fetchDailyOgImage(siteUrl, {
        japanScore,
        usScore,
        isoDate: jstIsoDate(),
      });
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
    image = await fetchDailyOgImage(siteUrl, {
      japanScore,
      usScore,
      isoDate: jstIsoDate(),
    });
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
