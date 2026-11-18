/**
 * 銘柄別ページ（/stock/[code]）に載せる「関連する読みもの」。
 *
 * 銘柄別ページは Google によく読まれている一方、解説・分析・イベント記事への内部リンクが無かった。
 * 全ページ共通の定番 3 本に加え、残りの記事から銘柄コードごとに決まった 3 本を選び、
 * 225 ページ全体で各記事にまんべんなくリンクが張られるようにする（同じ銘柄では毎回同じ記事になる）。
 */
import { LEARN_ARTICLES } from "./learn-articles";

export interface ReadingLink {
  href: string;
  title: string;
  kind: "解説" | "分析" | "イベント";
}

export interface ReadingEvent {
  slug: string;
  label: string;
  date: string;
}

/** 分析記事（/analysis/[slug]）。タイトルは関連記事欄向けの短い形 */
export const ANALYSIS_READINGS: ReadingLink[] = [
  {
    href: "/analysis/sector-rotation-temperature",
    title: "暴落時に強い業種はどれ？温度帯×17業種の検証",
    kind: "分析",
  },
  {
    href: "/analysis/margin-ratio-temperature",
    title: "信用倍率 × 市場温度 — 過去10年の検証",
    kind: "分析",
  },
  {
    href: "/analysis/vix-threshold-sp500",
    title: "VIX が 30 を超えた日、その後の S&P500",
    kind: "分析",
  },
  {
    href: "/analysis/temperature-divergence",
    title: "日米の温度差が ±20 を超えた日、その後の相場",
    kind: "分析",
  },
];

/** すべての銘柄ページに載せる定番 */
const CORE_HREFS = [
  "/learn/when-to-buy-stocks",
  "/learn/what-is-fear-greed",
  "/analysis/sector-rotation-temperature",
];

export const ROTATING_COUNT = 3;

function learnReadings(): ReadingLink[] {
  return LEARN_ARTICLES.map((a) => ({
    href: `/learn/${a.slug}`,
    title: a.shortTitle,
    kind: "解説" as const,
  }));
}

function eventReadings(events: ReadingEvent[]): ReadingLink[] {
  return events.map((e) => ({
    href: `/events/${e.slug}`,
    title: `${e.label}（${e.date}）の市場温度`,
    kind: "イベント" as const,
  }));
}

/** 銘柄コードから決まる安定したハッシュ（同じコードなら常に同じ値） */
export function stableHash(text: string): number {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 定番以外の候補（解説 → 分析 → イベントの順） */
export function rotatingPool(events: ReadingEvent[]): ReadingLink[] {
  return [...learnReadings(), ...ANALYSIS_READINGS, ...eventReadings(events)].filter(
    (r) => !CORE_HREFS.includes(r.href)
  );
}

export function buildStockRelatedReading(
  code: string,
  events: ReadingEvent[]
): ReadingLink[] {
  const all = [...learnReadings(), ...ANALYSIS_READINGS];
  const core = CORE_HREFS.map((href) => all.find((r) => r.href === href)).filter(
    (r): r is ReadingLink => r != null
  );
  const pool = rotatingPool(events);
  if (pool.length === 0) return core;
  const start = stableHash(code) % pool.length;
  const picked: ReadingLink[] = [];
  for (let i = 0; i < Math.min(ROTATING_COUNT, pool.length); i++) {
    picked.push(pool[(start + i) % pool.length]);
  }
  return [...core, ...picked];
}
