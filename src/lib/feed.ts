/**
 * Atom 1.0 フィード生成ヘルパ。
 * `/feed.xml` ルートで RSS リーダー（Feedly 等）向けに記事更新を配信する。
 */

import { getMarginRatioAnalysis } from "./margin-ratio-analysis";
import { getVixSp500Analysis } from "./vix-sp500-analysis";
import { getDivergenceAnalysis } from "./divergence-analysis";
import { getPortfolioHistory } from "./portfolio";
import { getEventsMeta, getEventPublishedAt } from "./events";
import type { EventMeta } from "./types";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

const SITE_NAME = "株温計";
const SITE_TAGLINE = "今日の相場、熱い？冷たい？";
const FEED_AUTHOR = "ao（リブラボ）";

interface FeedEntry {
  /** 安定 ID。URL or タグ URI */
  id: string;
  url: string;
  title: string;
  summary: string;
  /** 初公開日 ISO date（YYYY-MM-DD） */
  publishedAt: string;
  /** 最終更新 ISO date（YYYY-MM-DD or full ISO） */
  updatedAt: string;
}

function toIsoTime(value: string): string {
  // "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00Z" に統一。すでに完全 ISO ならそのまま。
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00Z`;
  }
  return value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 配信対象エントリを集める（記事 + ポートフォリオ + 主要イベント詳細）。 */
function collectEntries(): FeedEntry[] {
  const entries: FeedEntry[] = [];

  const margin = getMarginRatioAnalysis();
  entries.push({
    id: `${SITE_ORIGIN}/analysis/margin-ratio-temperature`,
    url: `${SITE_ORIGIN}/analysis/margin-ratio-temperature`,
    title: "信用倍率 × 株温計 — 過去10年の徹底検証",
    summary:
      "JPX 公表の週次データと株温計を過去 10 年掛け合わせ、信用倍率の水準ごとに翌 1ヶ月・3ヶ月・6ヶ月の日経225 リターンを集計した分析記事。",
    publishedAt: "2026-04-23",
    updatedAt: margin.generatedAt,
  });

  const vix = getVixSp500Analysis();
  entries.push({
    id: `${SITE_ORIGIN}/analysis/vix-threshold-sp500`,
    url: `${SITE_ORIGIN}/analysis/vix-threshold-sp500`,
    title: "VIX が 30 を超えた日、その後 S&P500 はどう動いたか？— 過去20年の検証",
    summary:
      "過去約 20 年・5000 取引日を集計し、VIX 水準別の S&P500 翌 1/3/6ヶ月リターンと勝率を検証した記事。",
    publishedAt: "2026-04-23",
    updatedAt: vix.generatedAt,
  });

  const divergence = getDivergenceAnalysis();
  entries.push({
    id: `${SITE_ORIGIN}/analysis/temperature-divergence`,
    url: `${SITE_ORIGIN}/analysis/temperature-divergence`,
    title: "日米温度の乖離が ±20 を超えた日、その後の日経225 と S&P500",
    summary:
      "日本版・米国版の株温計スコアが大きく乖離した日について、日経225 と S&P500 の収斂・発散パターンを集計した分析。",
    publishedAt: "2026-04-24",
    updatedAt: divergence.generatedAt,
  });

  const portfolio = getPortfolioHistory();
  entries.push({
    id: `${SITE_ORIGIN}/portfolio`,
    url: `${SITE_ORIGIN}/portfolio`,
    title: "温度連動バーチャルポートフォリオ（シミュレーション）",
    summary:
      "温度連動ポートフォリオが積立を JP +38pp / US +42pp 上回った検証記事。α の大半が「配分の高さ」由来であり、温度信号の純寄与は限定的という正直な結果を公開。",
    publishedAt: "2026-04-23",
    updatedAt: portfolio.generatedAt,
  });

  entries.push({
    id: `${SITE_ORIGIN}/learn/what-is-vix`,
    url: `${SITE_ORIGIN}/learn/what-is-vix`,
    title:
      "VIX（恐怖指数）とは？S&P500 の不安心理を測る指標を初心者向けに解説",
    summary:
      "VIX の定義・水準別の意味・過去20年データで「VIX 30 超え=危険」の通説を検証。日本投資家向けに日経225・ドル円との関係も解説。",
    publishedAt: "2026-04-28",
    updatedAt: "2026-04-28",
  });

  for (const event of getEventsMeta()) {
    entries.push(buildEventEntry(event));
  }

  // updated 降順（最新が先頭）
  return entries.sort((a, b) =>
    toIsoTime(b.updatedAt).localeCompare(toIsoTime(a.updatedAt)),
  );
}

function buildEventEntry(event: EventMeta): FeedEntry {
  const url = `${SITE_ORIGIN}/events/${event.slug}`;
  const publishedAt = getEventPublishedAt(event);
  return {
    id: url,
    url,
    title: `${event.label}（${event.date}）— その日の市場温度とその後の相場`,
    summary: event.oneLiner,
    publishedAt,
    updatedAt: publishedAt,
  };
}

/** Atom 1.0 XML 文字列を返す */
export function buildAtomFeed(): string {
  const entries = collectEntries();
  const feedUpdated = entries[0]?.updatedAt ?? new Date().toISOString();

  const entryXml = entries
    .map((e) => {
      return [
        "  <entry>",
        `    <id>${escapeXml(e.id)}</id>`,
        `    <link rel="alternate" type="text/html" href="${escapeXml(e.url)}"/>`,
        `    <title>${escapeXml(e.title)}</title>`,
        `    <summary>${escapeXml(e.summary)}</summary>`,
        `    <published>${toIsoTime(e.publishedAt)}</published>`,
        `    <updated>${toIsoTime(e.updatedAt)}</updated>`,
        "    <author>",
        `      <name>${escapeXml(FEED_AUTHOR)}</name>`,
        "    </author>",
        "  </entry>",
      ].join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="ja">
  <id>${escapeXml(`${SITE_ORIGIN}/`)}</id>
  <title>${escapeXml(`${SITE_NAME} — ${SITE_TAGLINE}`)}</title>
  <subtitle>${escapeXml("市場温度スコア・分析記事・主要イベントの最新更新")}</subtitle>
  <link rel="alternate" type="text/html" href="${escapeXml(`${SITE_ORIGIN}/`)}"/>
  <link rel="self" type="application/atom+xml" href="${escapeXml(`${SITE_ORIGIN}/feed.xml`)}"/>
  <updated>${toIsoTime(feedUpdated)}</updated>
  <author>
    <name>${escapeXml(FEED_AUTHOR)}</name>
  </author>
${entryXml}
</feed>
`;
}
