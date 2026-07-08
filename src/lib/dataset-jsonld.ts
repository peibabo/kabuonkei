/**
 * データページ用 JSON-LD (schema.org Dataset) 生成ヘルパ。
 * /sectors のような「記事ではない統計データページ」に埋め込み、
 * Google のデータセット検索・構造化データ評価に乗せる。
 */

export interface DatasetJsonLdInput {
  /** 絶対 URL or 相対 URL（相対の場合 NEXT_PUBLIC_SITE_URL と結合） */
  url: string;
  name: string;
  description: string;
  /** データ生成日 (ISO date) */
  dateModified: string;
  /** データの対象期間。schema.org の temporalCoverage（ISO 8601 interval）に変換 */
  temporalCoverage?: { from: string; to: string };
}

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

function toAbsolute(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${SITE_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
}

export function buildDatasetJsonLd(input: DatasetJsonLdInput): string {
  const absoluteUrl = toAbsolute(input.url);
  const payload: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl,
    },
    name: input.name,
    description: input.description,
    url: absoluteUrl,
    dateModified: input.dateModified,
    isAccessibleForFree: true,
    inLanguage: "ja",
    creator: {
      "@type": "Organization",
      name: "リブラボ",
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/icon.svg`,
      },
    },
  };
  if (input.temporalCoverage) {
    payload.temporalCoverage = `${input.temporalCoverage.from}/${input.temporalCoverage.to}`;
  }
  return JSON.stringify(payload);
}
