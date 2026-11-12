import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import StockScoreList from "@/components/stock/StockScoreList";
import StockDisclaimer from "@/components/stock/StockDisclaimer";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import {
  getAllStockSummaries,
  getStockTemperatureFile,
  groupBySector,
} from "@/lib/stock-temperature";
import { formatJaDate } from "@/lib/stock-temperature/format";

const PAGE_PATH = "/stock";
const PAGE_TITLE = "銘柄別の株価の温度（日経225採用銘柄）";
const PAGE_DESCRIPTION =
  "日経225採用銘柄の「株価の温度」（0〜100）を東証33業種別に一覧。125日移動平均からの乖離を銘柄ごとの値動きの大きさで換算した株温計の独自指標で、毎営業日更新しています。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: PAGE_PATH },
  openGraph: {
    title: `${PAGE_TITLE} | 株温計`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: PAGE_PATH,
    locale: "ja_JP",
    images: ["/opengraph-image"],
  },
};

export default function StockIndexPage() {
  const file = getStockTemperatureFile();
  const all = getAllStockSummaries();
  const sectors = groupBySector(all);

  const breadcrumbItems = [{ name: "ホーム", path: "/" }, { name: "銘柄別の温度" }];
  const datasetJsonLd = buildDatasetJsonLd({
    url: PAGE_PATH,
    name: `${PAGE_TITLE}（株温計）`,
    description: PAGE_DESCRIPTION,
    dateModified: file.generatedAt.slice(0, 10),
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: datasetJsonLd }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(breadcrumbItems) }}
      />
      <StaticPageLayout title={PAGE_TITLE}>
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-base">
          {formatJaDate(file.asOf)}終値時点の、日経225採用 {all.length} 銘柄の株価の温度です。
          銘柄名から過去1年の推移・分布・業種内の順位を確認できます。温度の高い順・低い順は
          <Link href="/ranking" className="underline">温度ランキング</Link>へ。
        </p>

        <nav aria-label="業種" className="not-prose flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {sectors.map(([sector, items]) => (
            <a key={sector} href={`#${encodeURIComponent(sector)}`} className="underline text-gray-600">
              {sector}（{items.length}）
            </a>
          ))}
        </nav>

        {sectors.map(([sector, items]) => (
          <section key={sector} id={encodeURIComponent(sector)} className="not-prose">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{sector}</h2>
            <StockScoreList items={items} showDiff={false} />
          </section>
        ))}

        <StockDisclaimer generatedAt={file.generatedAt} />
      </StaticPageLayout>
    </>
  );
}
