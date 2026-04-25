/**
 * サイト全体の WebSite + Organization JSON-LD 生成ヘルパ。
 * ルート layout に埋め込み、Google サイトリンク検索ボックス候補・運営者情報の
 * 構造化データを供給する。
 */

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

const SITE_NAME = "株温計";
const SITE_ALT_NAME = "kabuonkei";
const PUBLISHER_NAME = "リブラボ";

export function buildWebSiteJsonLd(): string {
  const payload = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: SITE_NAME,
        alternateName: SITE_ALT_NAME,
        inLanguage: "ja",
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: PUBLISHER_NAME,
        url: SITE_ORIGIN,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_ORIGIN}/icon.svg`,
        },
      },
    ],
  };
  return JSON.stringify(payload);
}
