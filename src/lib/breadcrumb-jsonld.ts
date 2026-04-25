/**
 * BreadcrumbList JSON-LD 生成ヘルパ。
 * 詳細ページに埋め込み、SERP のパンくず表示候補に乗せる。
 */

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

export interface BreadcrumbItem {
  /** 表示名 */
  name: string;
  /** "/" 起点の相対パス。最終項目は省略可（現在ページ） */
  path?: string;
}

function toAbsolute(path: string): string {
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): string {
  const payload = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const entry: Record<string, unknown> = {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
      };
      if (item.path) {
        entry.item = toAbsolute(item.path);
      }
      return entry;
    }),
  };
  return JSON.stringify(payload);
}
