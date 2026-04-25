import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://kabuonkei.com";

export const metadata: Metadata = {
  title: "株温計とは",
  description:
    "株温計は、日本市場と米国市場のセンチメント（恐怖・欲望）を1画面で俯瞰できる日本語Webサービスです。",
  alternates: {
    canonical: "/about",
  },
};

const ABOUT_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AboutPage",
      "@id": `${SITE_ORIGIN}/about#page`,
      url: `${SITE_ORIGIN}/about`,
      name: "株温計とは",
      isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
      mainEntity: { "@id": `${SITE_ORIGIN}/#organization` },
    },
    {
      "@type": "Person",
      "@id": `${SITE_ORIGIN}/about#author`,
      name: "ao",
      url: `${SITE_ORIGIN}/about`,
      jobTitle: "個人開発者・株温計 企画/分析担当",
      worksFor: { "@id": `${SITE_ORIGIN}/#organization` },
    },
    {
      "@type": "ContactPoint",
      "@id": `${SITE_ORIGIN}/about#contact`,
      contactType: "customer support",
      email: "info@kabuonkei.com",
      areaServed: "JP",
      availableLanguage: ["ja"],
    },
  ],
});

export default function AboutPage() {
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "株温計とは" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <StaticPageLayout title="🌡 株温計とは">
      <Script
        id="about-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: ABOUT_JSONLD }}
      />
      <Script
        id="about-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <Breadcrumb items={breadcrumbItems} />
      <p>
        株温計（かぶおんけい）は、「今日の相場、熱い？冷たい？」を一目で把握できる日本語ダッシュボードです。
        日本市場と米国市場のセンチメント指標を 1 画面で俯瞰できるよう設計しています。
      </p>
      <p className="mt-3 text-sm text-gray-600">
        本サイトは、公開されている市場統計から独自に計算した「市場温度スコア（0-100）」を発表する個人運営の情報サイトです。価格データや指数値そのものを配信する商用データサービスではありません。
      </p>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          できること
        </h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>市場温度（日本版）</strong>: 日経225モメンタム、海外投資家フロー、信用倍率、裁定残バランス、ドル円モメンタムの 5 要素から算出した独自スコア
          </li>
          <li>
            <strong>Fear &amp; Greed（米国版）</strong>: CNN Fear &amp; Greed Index をベースに、S&amp;P500 に紐づくセンチメントを表示
          </li>
          <li>
            <strong>温度推移チャート</strong>: 過去データから算出した温度スコアの時系列（最大 10 年）
          </li>
          <li>
            <strong>過去の統計</strong>: 同じ温度帯だった過去の日経225 / S&amp;P500 の 1 / 3 / 6 ヶ月後リターン
          </li>
          <li>
            <strong>今日の類似日</strong>: 今日の温度に最も近かった過去日 TOP5 と、その日以降のリターンをナラティブで表示
          </li>
          <li>
            <strong>
              <Link
                href="/events"
                className="underline hover:text-gray-900"
              >
                主要イベント詳細ページ
              </Link>
            </strong>
            : コロナショック・Brexit・令和のブラックマンデー等、14 件の主要市場イベントの当時の温度、前後の推移、その後のリターン、背景解説
          </li>
          <li>
            <strong>日本市場の需給</strong>: 投資主体別売買動向・裁定残・信用倍率（JPX 公開データ）
          </li>
          <li>
            <strong>
              <Link href="/guide" className="underline hover:text-gray-900">
                投資家タイプ別ガイド
              </Link>
            </strong>
            : NISA積立 / 短期トレーダー / FIRE目指し の 3 タイプ別に、温度帯ごとの具体的なアクション指針を解説
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          使い方
        </h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>トップ画面のゲージで今日の市場温度を把握する</li>
          <li>温度推移チャートで直近のトレンドを確認する</li>
          <li>「過去の統計」で同じ温度帯の過去リターンを眺める</li>
          <li>「今日の類似日」で過去の類似局面と照らし合わせる</li>
        </ol>
        <p className="mt-3 text-sm text-gray-600">
          ※ 毎日チェックする必要はありません。相場が大きく動いた節目に開くとより役立ちます。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          データソース
        </h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Yahoo Finance（主要指数・為替・VIX・日経平均 等）</li>
          <li>CNN Fear &amp; Greed Index（米国版センチメント）</li>
          <li>日本取引所グループ JPX 公開データ（投資主体別売買動向・裁定残・信用残）</li>
        </ul>
        <p className="mt-3 text-sm text-gray-600">
          これらの公開データを参照し、<strong>独自の計算ロジックで市場温度スコアを算出</strong>して発表しています。本サイトは一次市場データの再配信サービスではありません。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          運営
        </h2>
        <dl className="grid grid-cols-[100px_1fr] gap-y-1 gap-x-4 text-sm">
          <dt className="text-gray-500">屋号</dt>
          <dd className="text-gray-800">リブラボ</dd>
          <dt className="text-gray-500">企画・分析</dt>
          <dd className="text-gray-800">ao</dd>
          <dt className="text-gray-500">お問い合わせ</dt>
          <dd>
            <a
              href="mailto:info@kabuonkei.com"
              className="underline hover:text-gray-900"
            >
              info@kabuonkei.com
            </a>
          </dd>
        </dl>
        <p className="mt-4 text-sm text-gray-600 leading-relaxed">
          株温計はリブラボ（個人運営）が開発・運営している情報サイトです。公開データから独自計算したスコアや解説コンテンツを提供することが目的で、一次市場データ（価格・指数値等）を再配信する商用データサービスではありません。
        </p>
        <p className="mt-2 text-sm text-gray-600">
          ご利用に際しては{" "}
          <Link href="/terms" className="underline hover:text-gray-900">
            利用規約
          </Link>
          {" "}と{" "}
          <Link href="/privacy" className="underline hover:text-gray-900">
            プライバシーポリシー
          </Link>
          {" "}をご確認ください。
        </p>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          編集方針
        </h2>
        <ul className="list-disc pl-6 space-y-2 text-sm text-gray-700">
          <li>
            <strong>独自指標特化</strong>: 価格データの再配信ではなく、公開データから独自計算した
            「市場温度スコア」と、その応用検証（{" "}
            <Link href="/analysis" className="underline hover:text-gray-900">
              分析記事
            </Link>
            ・{" "}
            <Link href="/portfolio" className="underline hover:text-gray-900">
              バーチャルポートフォリオ
            </Link>
            ）に集中する
          </li>
          <li>
            <strong>正直な開示</strong>: バックテストの不利な結果（温度信号の純寄与が小さい / マイナスの局面など）も隠さず公開する
          </li>
          <li>
            <strong>投資助言ではない</strong>: 個別銘柄の売買推奨は行わない。あくまで「相場の温度感を共通語彙にする」ことが目的
          </li>
          <li>
            <strong>用語と前提の透明化</strong>: 使われる指標は{" "}
            <Link href="/glossary" className="underline hover:text-gray-900">
              用語集
            </Link>
            にまとめ、各分析記事には前提・バイアス・データ範囲の明示セクションを必ず置く
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
          ご利用にあたって
        </h2>
        <p className="text-sm text-gray-600">
          株温計が提供する情報・分析結果は投資判断の参考情報であり、特定の金融商品の売買を推奨するものではありません。また、過去の統計や類似日のリターンはあくまで歴史的データの集計であり、将来の運用成果を保証するものではありません。投資はご自身の判断と責任で行ってください。
        </p>
      </section>
    </StaticPageLayout>
  );
}
