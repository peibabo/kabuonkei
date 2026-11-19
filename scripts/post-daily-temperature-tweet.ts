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
 *   npm run post:daily-tweet                       # X API で実投稿
 *   npm run post:daily-tweet -- --email            # X には投稿せず、投稿文＋画像を運営者へメール（手動投稿用）
 *   npm run post:daily-tweet -- --dry-run          # 投稿せずコンソール出力のみ
 *
 * 2026-11 時点の本番は --email（X API が 402 を返すようになったため、手動投稿に切り替えた）。
 *
 * 必要な環境変数:
 *   X API で投稿: X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET
 *   メールで送る: RESEND_API_KEY / RESEND_FROM_EMAIL / X_DRAFT_EMAIL（送り先。未設定なら OPS_ALERT_EMAIL → info@kabuonkei.com）
 *   共通: NEXT_PUBLIC_SITE_URL （画像fetch先、省略時 https://kabuonkei.com）
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
import { sendEmail } from "../src/lib/alerts/resend";
import { escapeHtml } from "../src/lib/alerts/email-templates";
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
const DEFAULT_DRAFT_EMAIL = "info@kabuonkei.com";

/** メール本文で投稿文を囲む目印。受け取った人や AI アシスタントが投稿文だけを切り出せるようにする */
export const DRAFT_BEGIN = "----- 投稿文ここから -----";
export const DRAFT_END = "----- 投稿文ここまで -----";

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

/** 投稿文を X の投稿画面に入れた状態で開くリンク */
export function buildIntentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export interface DraftEmailInput {
  dateLabel: string;
  tweetText: string;
  /** 温度カード画像の URL。null なら画像なし */
  imageUrl: string | null;
  /** 画像をメールに添付できたか */
  imageAttached: boolean;
  /** 投稿文の加重文字数（概算）。280 を超えるときは本文で注意する */
  weightedLength?: number;
}

/** X に手動投稿するための下書きメール（件名・テキスト・HTML）を組み立てる */
export function buildDraftEmail(input: DraftEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const { dateLabel, tweetText, imageUrl, imageAttached, weightedLength } = input;
  const overLimit = weightedLength != null && weightedLength > 280;
  const overLimitNote = `⚠️ 投稿文が長すぎます（概算 ${weightedLength}/280）。X で弾かれる場合は削ってから投稿してください`;
  const subject = `【X投稿】${dateLabel} 寄り前チェック`;
  const intentUrl = buildIntentUrl(tweetText);
  const imageNote = imageUrl
    ? imageAttached
      ? "画像: 添付の daily-temperature.png を付けて投稿してください"
      : "画像: 添付に失敗しました。下の URL から保存して付けてください"
    : "画像: なし（日米とも温度が取れなかったため）";

  const textLines = [
    `${dateLabel} の X 投稿の下書きです。`,
    ...(overLimit ? [overLimitNote] : []),
    "",
    DRAFT_BEGIN,
    tweetText,
    DRAFT_END,
    "",
    imageNote,
  ];
  if (imageUrl) textLines.push(`画像 URL: ${imageUrl}`);
  textLines.push("", `投稿画面を開く: ${intentUrl}`);

  const html = `<div style="font-family:sans-serif;line-height:1.6">
<p>${escapeHtml(dateLabel)} の X 投稿の下書きです。</p>${overLimit ? `\n<p style="color:#c00">${escapeHtml(overLimitNote)}</p>` : ""}
<p style="color:#888;margin:0">${escapeHtml(DRAFT_BEGIN)}</p>
<pre style="white-space:pre-wrap;font-family:inherit;background:#f5f5f5;padding:12px;margin:4px 0">${escapeHtml(tweetText)}</pre>
<p style="color:#888;margin:0">${escapeHtml(DRAFT_END)}</p>
<p>${escapeHtml(imageNote)}${imageUrl ? `<br><a href="${escapeHtml(imageUrl)}">画像 URL</a>` : ""}</p>
<p><a href="${escapeHtml(intentUrl)}" style="display:inline-block;background:#000;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">X で投稿する</a></p>
</div>`;

  return { subject, text: textLines.join("\n"), html };
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

  const [vixPrice, nikkeiChart, nikkeiPrice] = await Promise.all([
    fetchPrice("^VIX"),
    fetchChart("^N225", 220),
    fetchPrice("^N225"),
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
    investorTrading: marketData.investorTrading ?? null,
    marginTrading: marketData.marginTrading ?? null,
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

function dailyOgImageUrl(
  siteUrl: string,
  params: { japanScore: number | null; usScore: number | null; isoDate: string },
): URL {
  const url = new URL(DAILY_OG_PATH, siteUrl);
  if (params.japanScore != null)
    url.searchParams.set("jp", String(params.japanScore));
  if (params.usScore != null)
    url.searchParams.set("us", String(params.usScore));
  url.searchParams.set("date", params.isoDate);
  return url;
}

async function fetchDailyOgImage(url: URL): Promise<Buffer | null> {
  try {
    // 応答が無いまま止まると下書きメールが寄り付きに間に合わないので 20 秒で打ち切る（画像なしで続行）
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
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
  const emailMode = process.argv.includes("--email");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  const dateLabel = formatJstDateLabel();

  console.log(
    `🌡 X Bot 投稿処理開始 (${dateLabel})${emailMode ? " [メール送信モード]" : ""}${dryRun ? " [DRY RUN]" : ""}`,
  );

  const { fearGreed, japanFearGreed } = await loadMarketContext();
  const japanScore = japanFearGreed?.score ?? null;
  const usScore = fearGreed?.score ?? null;

  if (japanScore == null && usScore == null) {
    // メール送信モードでは、黙ってスキップすると下書きが届かない理由が分からないので失敗扱いにする
    // （夜の見張り check-cron-health が失敗として運営者に知らせる）
    if (emailMode) throw new Error("日米いずれの温度も取得できず、下書きメールを作れませんでした");
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

  let text = buildTweetBody(ctx);
  const attach = shouldAttachImage(japanScore, usScore);
  let weighted = estimateWeightedLength(text);

  console.log("\n---- 投稿文 ----");
  console.log(text);
  console.log("----------------");
  console.log(`画像添付: ${attach ? "あり（温度キャプチャ）" : "なし（日米とも欠損）"}`);
  console.log(`加重文字数(概算): ${weighted}/280`);

  if (weighted > 280) {
    console.warn("⚠️ 加重文字数が 280 を超過。類似日行を省略して再構築します");
    text = buildTweetBody({ ...ctx, japanSimilar: null, usSimilar: null });
    weighted = estimateWeightedLength(text);
    console.log("\n---- 縮小後投稿文 ----");
    console.log(text);
    console.log("----------------------");
    console.log(`加重文字数(概算): ${weighted}/280${weighted > 280 ? "（まだ超過）" : ""}`);
  }

  const imageUrl = attach
    ? dailyOgImageUrl(siteUrl, { japanScore, usScore, isoDate: jstIsoDate() })
    : null;

  if (dryRun) {
    if (imageUrl) console.log(`画像 URL: ${imageUrl}`);
    console.log(`\n[DRY RUN] ${emailMode ? "メール送信" : "投稿"}せず終了`);
    return;
  }

  const image = imageUrl ? await fetchDailyOgImage(imageUrl) : null;

  if (emailMode) {
    const to =
      process.env.X_DRAFT_EMAIL ||
      process.env.OPS_ALERT_EMAIL ||
      DEFAULT_DRAFT_EMAIL;
    const mail = buildDraftEmail({
      dateLabel,
      tweetText: text,
      imageUrl: imageUrl ? imageUrl.toString() : null,
      imageAttached: image != null,
      weightedLength: weighted,
    });
    const sent = await sendEmail({
      to,
      ...mail,
      ...(image
        ? {
            attachments: [
              { filename: "daily-temperature.png", content: image.toString("base64") },
            ],
          }
        : {}),
    });
    if (!sent.ok) throw new Error(`下書きメールの送信に失敗: ${sent.error}`);
    console.log(`\n✅ 下書きメールを送信しました（宛先: ${to}、id=${sent.id}）`);
    return;
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
