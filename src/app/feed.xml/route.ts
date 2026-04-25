import { buildAtomFeed } from "@/lib/feed";

/** Atom 1.0 フィード `/feed.xml`。RSS リーダー（Feedly 等）からの購読対応。 */
export function GET() {
  const xml = buildAtomFeed();
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control":
        "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
