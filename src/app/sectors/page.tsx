import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import SectorsPageBody from "@/components/sectors/SectorsPageBody";
import { getJapanSectorHeatmap } from "@/lib/japan-sector-heatmap";
import { buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const PAGE_PATH = "/sectors";
const PAGE_TITLE = "温度帯別 業種（セクター）ヒートマップ";
const PAGE_DESCRIPTION =
  "日本の市場温度が「極寒・冷え込み・平温・過熱・沸騰」の各温度帯だったとき、どの業種（セクター）がその後 1・3・6 ヶ月で強かったかを過去10年のデータで集計。TOPIX-17 の 17 業種 × 5 温度帯の平均リターン・勝率をヒートマップで公開しています。";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: [
    "業種別 リターン",
    "セクター ローテーション",
    "TOPIX-17",
    "セクター 温度",
    "業種 ヒートマップ",
    "市場センチメント 業種",
    "株温計",
    "どの業種を買う",
  ],
  openGraph: {
    title: `${PAGE_TITLE} | 株温計`,
    description: PAGE_DESCRIPTION,
    type: "website",
    url: PAGE_PATH,
    locale: "ja_JP",
  },
  alternates: {
    canonical: PAGE_PATH,
  },
};

export default function SectorsPage() {
  const heatmap = getJapanSectorHeatmap();

  const datasetJsonLd = buildDatasetJsonLd({
    url: PAGE_PATH,
    name: `${PAGE_TITLE}（株温計）`,
    description: PAGE_DESCRIPTION,
    dateModified: heatmap.generatedAt,
    temporalCoverage: heatmap.dataRange,
  });

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "業種別ヒートマップ" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="sectors-dataset-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: datasetJsonLd }}
      />
      <Script
        id="sectors-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={`📊 ${PAGE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />

        <p className="text-base leading-relaxed">
          株温計の日本版温度スコア（0-100）が同じくらいだったとき、
          <strong>どの業種がその後強かったのか</strong>。
          過去10年の日次データを 5 つの温度帯に分け、東証 TOPIX-17 の 17 業種それぞれの
          1・3・6 ヶ月後の平均リターンと勝率を集計したのがこのヒートマップです。
          「極寒のときに強いディフェンシブ業種はどれか」「沸騰時に買われやすい業種はどれか」
          といったセクターローテーションの傾向を一覧できます。
        </p>

        <div
          role="note"
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 not-prose"
        >
          <p className="text-sm font-semibold text-blue-900 mb-1">📖 読み方のポイント</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
            <li>
              セルの<strong>赤が濃いほど平均リターンが高く</strong>、緑が濃いほど低い（日本式の配色）
            </li>
            <li>
              温度は<strong>C1（日経225 vs 125日移動平均）+ C5（ドル円モメンタム）の 2 要素簡易版</strong>で、トップページの 5 要素スコアとは計算が異なります
            </li>
            <li>
              業種リターンは <strong>TOPIX-17 シリーズ連動 ETF（NEXT FUNDS 1617〜1633）の終値</strong>を proxy にしています（東証33業種ベースではありません）
            </li>
            <li>
              薄く表示された温度帯はサンプル数が少なく<strong>参考値</strong>です
            </li>
          </ul>
        </div>

        <SectorsPageBody />

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">関連リンク</h2>
          <ul className="list-disc pl-6 space-y-1 text-base">
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                ダッシュボード（今日の日米温度）
              </Link>{" "}
              — 現在の温度と類似日をチェック
            </li>
            <li>
              <Link href="/portfolio" className="underline hover:text-gray-900">
                温度連動バーチャルポートフォリオ
              </Link>{" "}
              — 温度で株/現金比率を切り替えるとどうなるかの検証
            </li>
            <li>
              <Link
                href="/analysis/sector-rotation-temperature"
                className="underline hover:text-gray-900"
              >
                暴落時に強い業種はどれ？— 温度帯×17業種の検証記事
              </Link>{" "}
              — このデータを「業種選びの通説」の切り口で読み解いた分析
            </li>
            <li>
              <Link
                href="/analysis/margin-ratio-temperature"
                className="underline hover:text-gray-900"
              >
                信用倍率 × 株温計
              </Link>{" "}
              — 需給 × 温度のクロス分析
            </li>
          </ul>
        </section>

        <p className="text-sm text-gray-500 leading-relaxed">
          ※ 本ページの情報は投資助言ではありません。掲載する統計は過去データの集計であり、将来のリターンを保証するものではありません。特定業種・銘柄の売買を推奨するものでもありません。データ出典: Yahoo
          Finance（^N225 / USDJPY=X / TOPIX-17 連動 ETF）、温度スコアは株温計独自計算。
        </p>
      </StaticPageLayout>
    </>
  );
}
