import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import JsonLd from "@/components/JsonLd";
import StockScoreList from "@/components/stock/StockScoreList";
import StockDisclaimer from "@/components/stock/StockDisclaimer";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import {
  buildRankings,
  formatJaDate,
  getAllStockSummaries,
  getStockTemperatureFile,
  getUniverseLabel,
} from "@/lib/stock-temperature";
import { buildStockPageMetadata } from "@/lib/stock-temperature/metadata";

const LIMIT = 50;
// 上昇・下落は HTML サイズ（目安 200KB）に収めるため件数を絞る
const MOVER_LIMIT = 20;

const PAGE_PATH = "/ranking";
const PAGE_TITLE = `株価の温度ランキング（${getUniverseLabel()}銘柄）`;
const PAGE_DESCRIPTION = `${getUniverseLabel()}銘柄を「株価の温度」で並べたランキング。今日いちばん熱い銘柄・冷えている銘柄の各TOP${LIMIT}と、前日から温度が上がった・下がった銘柄の各TOP${MOVER_LIMIT}を毎営業日更新しています。`;

export const metadata: Metadata = buildStockPageMetadata({
  path: PAGE_PATH,
  title: `${PAGE_TITLE} | 株温計`,
  description: PAGE_DESCRIPTION,
});

export default function RankingPage() {
  const file = getStockTemperatureFile();
  const all = getAllStockSummaries();
  const { hottest, coldest, risers, fallers } = buildRankings(all, LIMIT, MOVER_LIMIT);
  const breadcrumbItems = [{ name: "ホーム", path: "/" }, { name: "温度ランキング" }];

  const sections = [
    { id: "hottest", title: `温度が高い銘柄 TOP${LIMIT}`, items: hottest, rankBy: "score" },
    { id: "coldest", title: `温度が低い銘柄 TOP${LIMIT}`, items: coldest, rankBy: "score" },
    { id: "risers", title: `前日から温度が上がった銘柄 TOP${MOVER_LIMIT}`, items: risers, rankBy: "d1" },
    { id: "fallers", title: `前日から温度が下がった銘柄 TOP${MOVER_LIMIT}`, items: fallers, rankBy: "d1" },
  ] as const;

  return (
    <>
      <JsonLd json={buildBreadcrumbJsonLd(breadcrumbItems)} />
      <StaticPageLayout title={PAGE_TITLE}>
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-base">
          {formatJaDate(file.asOf)}終値時点の、{getUniverseLabel()} {all.length} 銘柄のランキングです。
          温度は銘柄ごとの値動きの大きさで換算しているため、値動きの大小に関係なく比べられます。
          同じ値の銘柄は同じ順位です。業種別の一覧は
          <Link href="/stock" className="underline">銘柄別の温度</Link>へ。
        </p>
        <nav aria-label="ランキング" className="not-prose flex flex-wrap gap-x-4 text-sm">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="underline text-gray-600">
              {s.title}
            </a>
          ))}
        </nav>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="not-prose">
            <h2 className="text-lg font-bold text-gray-900 mb-2">{s.title}</h2>
            {s.items.length > 0 ? (
              <StockScoreList items={s.items} rankBy={s.rankBy} />
            ) : (
              <p className="text-sm text-gray-500">該当する銘柄はありません。</p>
            )}
          </section>
        ))}
        <StockDisclaimer generatedAt={file.generatedAt} />
      </StaticPageLayout>
    </>
  );
}
