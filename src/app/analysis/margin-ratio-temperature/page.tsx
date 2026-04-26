import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import MarginRatioAnalysisBody from "@/components/analysis/MarginRatioAnalysisBody";
import Breadcrumb from "@/components/Breadcrumb";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/analysis/margin-ratio-temperature";
const ARTICLE_TITLE = "信用倍率 × 株温計 — 過去10年の徹底検証";
const ARTICLE_DESCRIPTION =
  "「信用倍率 4 倍超えは危険」は本当か？JPX 公表の週次データと株温計を過去 10 年掛け合わせ、信用倍率の水準ごとに翌 1ヶ月・3ヶ月・6ヶ月の日経225 リターンを集計しました。";
const PUBLISHED_AT = "2026-04-23";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "信用倍率",
    "信用倍率 目安",
    "信用倍率 高い",
    "JPX",
    "日経225",
    "株温計",
    "市場センチメント",
    "需給",
  ],
  openGraph: {
    title: `${ARTICLE_TITLE} | 株温計`,
    description: ARTICLE_DESCRIPTION,
    type: "article",
    url: ARTICLE_PATH,
    locale: "ja_JP",
  },
  alternates: {
    canonical: ARTICLE_PATH,
  },
};

const TOC_ITEMS = [
  { href: "#intro", label: "はじめに" },
  { href: "#term", label: "信用倍率とは" },
  { href: "#kabuonkei", label: "株温計とは" },
  { href: "#quartile", label: "信用倍率の歴史的分布" },
  { href: "#heatmap", label: "信用倍率 × 株温計 × 日経225" },
  { href: "#marginal-ratio", label: "信用倍率だけで見るとどうか" },
  { href: "#marginal-temp", label: "株温計だけで見るとどうか" },
  { href: "#implications", label: "示唆 — 併用が効く理由" },
  { href: "#method", label: "データと手法" },
  { href: "#related", label: "関連リンク" },
];

export default function MarginRatioTemperaturePage() {
  const analysis = getMarginRatioAnalysis();
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: analysis.generatedAt,
  });

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "分析記事", path: "/analysis" },
    { name: "信用倍率 × 株温計" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="article-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="article-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={ARTICLE_TITLE}>
        <Breadcrumb items={breadcrumbItems} />
        <nav
          aria-label="目次"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm not-prose"
        >
          <p className="font-semibold text-gray-700 mb-2">📑 目次</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-none pl-0">
            {TOC_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-gray-600 hover:text-gray-900 hover:underline"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-gray-400">
          最終更新: <time dateTime={analysis.generatedAt}>{analysis.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）
        </p>

        <section id="intro" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3">はじめに</h2>
          <p className="leading-relaxed">
            「信用倍率が 4 倍を超えたら危険」「信用倍率が下がってきた＝そろそろ反発」——
            こうした経験則は投資本や掲示板でよく目にしますが、<strong>実際に過去 10 年で検証された数字</strong>
            はあまり出回っていません。
          </p>
          <p className="leading-relaxed mt-3">
            この記事では、JPX が公表する信用取引残高の週次データ（2002 年から公開）と、
            株温計の日本版温度スコアを過去約 10 年分掛け合わせ、
            <strong>「同じ水準だったとき、過去の日経225 はその後どう動いたか」</strong>
            を集計しました。結論から言うと、<strong>信用倍率だけを見る投資判断は意外と頼りない</strong>
            一方、<strong>温度との併用では読み方が明確に変わる組合せ</strong>があります。
          </p>
        </section>

        <section id="term" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            信用倍率とは
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            ※ 関連用語の短い定義は{" "}
            <Link
              href="/glossary#margin-ratio"
              className="underline hover:text-gray-700"
            >
              用語集「信用倍率」
            </Link>
            、{" "}
            <Link
              href="/glossary#kabuonkei-score"
              className="underline hover:text-gray-700"
            >
              「市場温度スコア」
            </Link>
            にもまとめています。
          </p>
          <p className="leading-relaxed">
            <strong>信用倍率</strong> = 信用買い残 ÷ 信用売り残。信用取引で買い建てしている投資家と売り建てしている投資家のバランスを示す需給指標です。JPX（日本取引所グループ）が毎週水曜日に前週金曜日時点の残高を公表しています。
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mt-2">
            <li>
              <strong>1 倍付近</strong>: 買い方と売り方がほぼ拮抗。信用取引ではどちらかと言うと稀な水準
            </li>
            <li>
              <strong>2〜3 倍</strong>: 買い方がやや優勢。日経平均が安値から戻り始めた局面に多い
            </li>
            <li>
              <strong>4〜5 倍</strong>: 買い方が明確に優勢。需給的には「上値が重くなりやすい」と言われる
            </li>
            <li>
              <strong>6 倍超</strong>: 歴史的にはかなり高水準。売り方の踏み上げ余地より、買い方の投げ売り余地が大きい
            </li>
          </ul>
          <p className="leading-relaxed mt-3 text-sm">
            ただし <strong>「買い方優勢 = 売られやすい」が常に成り立つわけではない</strong>のが、この指標の難しさです。それを裏付けるのが後半の集計結果になります。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            株温計（日本版 Fear & Greed）とは
          </h2>
          <p className="leading-relaxed">
            株温計の日本版温度スコアは、日経225 の 125 日移動平均乖離（C1）と USD/JPY の 50 日モメンタム（C5）の等ウェイト平均で算出する 0-100 のスコアです。20 以下が<strong>極寒（総悲観）</strong>、81 以上が<strong>沸騰（総楽観）</strong>。
            {" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの温度計
            </Link>
            で毎日の値を見られます。
          </p>
        </section>

        <MarginRatioAnalysisBody analysis={analysis} />

        <section id="implications" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            示唆 — なぜ「併用」が効くのか
          </h2>
          <p className="leading-relaxed">
            集計結果を並べると、同じ「信用倍率 5 倍超」でも、温度帯が異なれば過去の日経225 リターンは大きく変わります。直感的に言えば:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-sm leading-relaxed mt-2">
            <li>
              <strong>信用倍率は「仕掛けている投資家のポジションの偏り」</strong>を示すもので、状態量です
            </li>
            <li>
              <strong>株温計は「相場の熱量そのもの」</strong>を示すもので、モメンタム／乖離の加速度に近い
            </li>
            <li>
              同じ「買い方優勢（高倍率）」でも、熱量が極寒/冷え込み方向に振れていれば
              <strong>「買い方が踏まれて下落する前の最終局面」</strong>と「単に下がりすぎて買い方が溜まっている状態」は意味が違う
            </li>
          </ul>
          <p className="leading-relaxed mt-3">
            上のヒートマップで自分の気になるセル（現在の水準や、過去の暴落時近辺）をクリックして、同じ条件下で歴史的にどう推移したかを確認してみてください。参考値（サンプル数が少ないセル）は薄く表示されます。
          </p>
        </section>

        <section id="method" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            データと手法
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm leading-relaxed">
            <li>
              <strong>信用倍率</strong>: JPX「信用取引現在高 過去推移表」(二市場計・金額ベース)。週次、申込日（金曜日）基準
            </li>
            <li>
              <strong>温度スコア</strong>: 株温計の日本版温度（C1+C5 簡易 2 要素版）。日次
            </li>
            <li>
              <strong>日経225 終値</strong>: Yahoo Finance の ^N225 日足
            </li>
            <li>
              <strong>集計対象</strong>: 信用倍率と温度履歴が両方存在する期間 ({analysis.dataRange.from} 〜 {analysis.dataRange.to})、全{analysis.sampleSize}週
            </li>
            <li>
              <strong>将来リターン</strong>: 各週の申込日終値から 30 / 90 / 180 カレンダー日先の ^N225 終値を比較。該当日が取引日でない場合は 7 日以内の直近取引日で補完
            </li>
            <li>
              <strong>タイミング注意</strong>: JPX は申込日（金曜）の残高を翌週水曜 (T+5) に公表します。読者が実際にシグナルを元に売買できるのは公表日以降のため、上記集計には数営業日の先行情報優位が含まれる可能性があります。1ヶ月以上の horizon では結果に大きく影響しません
            </li>
          </ul>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            関連リンク
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>
              <Link
                href="/analysis/temperature-divergence"
                className="underline hover:text-gray-900"
              >
                日米温度の乖離 — 日本だけ熱い局面のその後
              </Link>{" "}
              — 日本市場の特異局面を米国センチメントと並べた独自集計
            </li>
            <li>
              <Link
                href="/guide/short-term-trader"
                className="underline hover:text-gray-900"
              >
                短期トレーダー向けの株温計ガイド
              </Link>{" "}
              — 地合い判定・需給指標との併用
            </li>
            <li>
              <Link
                href="/guide/fire-long-term"
                className="underline hover:text-gray-900"
              >
                FIRE を目指す人向けガイド
              </Link>{" "}
              — 温度スコアをリバランス補助として使う考え方
            </li>
            <li>
              <Link href="/events" className="underline hover:text-gray-900">
                過去の主要イベント一覧
              </Link>{" "}
              — コロナショック・令和のブラックマンデー等、極端温度の前後で何が起きたか
            </li>
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                今日の株温計を見る
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-xs text-gray-500 leading-relaxed">
            ※ 本記事は投資助言ではありません。過去のリターンは将来を保証するものではありません。信用取引にはレバレッジ・金利・追証リスクが伴うため、ご自身のリスク許容度に応じてご判断ください。データ出典: 日本取引所グループ (JPX) / Yahoo Finance
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
