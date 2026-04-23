/**
 * 記事ページ用 JSON-LD (schema.org Article) 生成ヘルパ。
 * /analysis/[slug] などの深掘り記事に埋め込み、Google の構造化データで評価を得る。
 */

export interface ArticleJsonLdInput {
  /** 絶対 URL or 相対 URL（相対の場合 NEXT_PUBLIC_SITE_URL と結合） */
  url: string;
  headline: string;
  description: string;
  datePublished: string; // ISO date
  dateModified: string; // ISO date
  /** OG 画像の絶対 URL */
  imageUrl?: string;
  /** author は運営組織としての "株温計" を既定にする */
  authorName?: string;
}

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

function toAbsolute(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

export function buildArticleJsonLd(input: ArticleJsonLdInput): string {
  const absoluteUrl = toAbsolute(input.url);
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl,
    },
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: {
      "@type": "Organization",
      name: input.authorName ?? "株温計",
      url: SITE_ORIGIN,
    },
    publisher: {
      "@type": "Organization",
      name: "株温計",
      url: SITE_ORIGIN,
    },
  };
  if (input.imageUrl) {
    payload.image = [toAbsolute(input.imageUrl)];
  }
  return JSON.stringify(payload);
}
