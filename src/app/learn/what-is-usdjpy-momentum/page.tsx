import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-usdjpy-momentum";
const ARTICLE_TITLE =
  "円安・円高と株価の関係とは？リスクオフで円高になる仕組みを初心者向けに解説";
const ARTICLE_DESCRIPTION =
  "なぜ円安は日本株に追い風で円高は逆風になりやすいのか、リスクオフ局面で「円高＋株安」が同時に起きる仕組み（円キャリー取引の巻き戻し）、単純な逆相関では読めない注意点、株温計が使う「ドル円モメンタム」という指標を初心者向けに解説します。";
const PUBLISHED_AT = "2026-06-18";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "円安 株価",
    "円高 株安",
    "ドル円 株価 関係",
    "リスクオフ 円高",
    "円キャリー 巻き戻し",
    "ドル円モメンタム",
    "為替 日本株",
    "株温計",
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
  { href: "#tldr", label: "結論を先に" },
  { href: "#basic", label: "ドル円と日本株の基本関係" },
  { href: "#why", label: "なぜ円安が株高になりやすいのか" },
  { href: "#risk-off", label: "リスクオフで「円高＋株安」が起きる仕組み" },
  { href: "#momentum", label: "ドル円モメンタムという指標" },
  { href: "#caveats", label: "単純な逆相関では読めない注意点" },
  { href: "#related", label: "関連用語・関連記事" },
];

export default function WhatIsUsdjpyMomentumPage() {
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: PUBLISHED_AT,
  });

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "解説記事", path: "/learn" },
    { name: "円安・円高と株価の関係とは" },
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

        <p className="text-xs text-gray-500 not-prose">
          公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>
          {" / "}
          短い定義だけ確認したい場合は{" "}
          <Link
            href="/glossary#usdjpy-momentum"
            className="underline hover:text-gray-700"
          >
            用語集「ドル円モメンタム」
          </Link>
          へ。
        </p>

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

        <section
          id="tldr"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">
            📖 結論を先に
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base text-gray-800 leading-relaxed">
            <li>
              日本企業は輸出比率が高いため、<strong>円安は日本株（特に大型輸出株）に追い風、円高は逆風</strong>になりやすい。
              これが「ドル円と日経平均は同じ方向に動きやすい」と言われる基本構造
            </li>
            <li>
              ただし<strong>世界的なリスクオフ局面では「円高＋株安」が同時に起きる</strong>。
              円が「安全資産」として買い戻され、同時にリスク資産である株が売られるため
            </li>
            <li>
              その引き金になりやすいのが<strong>円キャリー取引の巻き戻し</strong>。
              2024 年 8 月 5 日「令和のブラックマンデー」はこの典型例だった
            </li>
            <li>
              株温計は<strong>ドル円の 50 日モメンタム（変化率）</strong>を市場温度スコア（日本版）の
              C5 要素として採用。為替の勢いを日本株のセンチメント材料として組み込んでいる
            </li>
          </ul>
        </section>

        <section id="basic" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ドル円と日本株の基本関係
          </h2>
          <p className="text-base leading-relaxed">
            「<strong>ドル円</strong>」は 1 ドルを何円で交換できるかを表すレート（USD/JPY）です。
            数字が大きくなる（例: 140 円 → 150 円）のが<strong>円安</strong>、小さくなる（150 円 → 140 円）のが
            <strong>円高</strong>です。円の価値が下がるのが円安、上がるのが円高、と整理すると分かりやすいでしょう。
          </p>
          <p className="text-base leading-relaxed mt-3">
            日本株、とりわけ日経225 のような大型株指数は、自動車・電機・機械といった
            <strong>輸出企業の比率が高い</strong>のが特徴です。このため為替の動きが企業業績の見通しに直結し、
            <strong>ドル円と日経平均はおおむね同じ方向に動きやすい</strong>——「円安なら株高、円高なら株安」という関係が基本線として語られます。
          </p>
        </section>

        <section id="why" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            なぜ円安が株高になりやすいのか
          </h2>
          <p className="text-base leading-relaxed">
            円安が日本株に追い風になりやすい理由は、大きく 2 つあります。
          </p>
          <ol className="list-decimal pl-6 mt-3 space-y-3 text-base leading-relaxed">
            <li>
              <strong>輸出企業の採算改善</strong>: 海外で稼いだドルを円に換算するとき、円安だと
              <strong>円ベースの売上・利益が膨らみます</strong>。たとえば 1 ドル＝140 円より 150 円のほうが、
              同じ 1 万ドルの売上でも円換算額は大きくなります。為替が想定より円安に振れると、輸出企業の業績見通しが上振れしやすくなります
            </li>
            <li>
              <strong>海外投資家から見た割安感</strong>: 円安は、外貨を持つ海外投資家から見ると
              <strong>日本株を割安に買える</strong>ことを意味します。日本市場は海外勢の売買シェアが大きいため、
              円安局面では海外マネーの流入期待も株高材料として意識されます（{" "}
              <Link
                href="/learn/what-is-investor-flow"
                className="underline hover:text-gray-900"
              >
                投資部門別売買動向
              </Link>
              {" "}も参照）
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3 text-gray-600">
            逆に円高は、輸出企業の採算悪化・海外投資家から見た割高化につながり、株価の逆風として働きやすくなります。
          </p>
        </section>

        <section id="risk-off" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            リスクオフで「円高＋株安」が起きる仕組み
          </h2>
          <p className="text-base leading-relaxed">
            ここが為替と株の関係でいちばん誤解されやすいポイントです。
            「円安＝株高」が基本線なのに、<strong>暴落局面ではしばしば「円高＋株安」が同時に進みます</strong>。
            平常時の関係が、危機時には逆転して見えるのです。
          </p>
          <p className="text-base leading-relaxed mt-3">
            背景にあるのが<strong>「リスクオフ」</strong>と呼ばれる、投資家が一斉にリスク資産を手放して安全とされる資産に逃げる動きです。
            円は伝統的に<strong>「有事に買われる安全通貨」</strong>とみなされており、世界的な不安が高まると円が買い戻されて円高に振れます。
            同時に、リスク資産である株式は売られて株安になります。結果として
            <strong>「円高（リスクオフ）＋株安（リスクオフ）」が同居</strong>するわけです。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm leading-relaxed">
              💡 <strong>円キャリー取引の巻き戻し</strong>: 低金利の円を借りて高金利通貨や株などで運用する取引を
              「円キャリー取引」と呼びます。リスクオフでこれが一斉に手仕舞われると、
              <strong>借りた円を買い戻す（円高）＋運用していた資産を売る（株安）</strong>が同時多発的に起き、
              値動きが急激になります。<strong>2024 年 8 月 5 日「令和のブラックマンデー」</strong>はこの巻き戻しが
              急騰した典型例で、ドル円の急変と日経平均の急落が連動しました（{" "}
              <Link
                href="/events/reiwa-black-monday-2024"
                className="underline hover:text-gray-900"
              >
                当時のイベント解説
              </Link>
              ）。
            </p>
          </div>
        </section>

        <section id="momentum" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ドル円モメンタムという指標
          </h2>
          <p className="text-base leading-relaxed">
            為替の「水準（今 150 円か 140 円か）」だけでなく、
            <strong>「どちらにどれだけの勢いで動いているか」</strong>を見るのが
            <strong>ドル円モメンタム</strong>です。株温計では、ドル円の
            <strong>直近 50 営業日の変化率</strong>を中心に算出し、日本版の{" "}
            <Link
              href="/glossary#kabuonkei-score"
              className="underline hover:text-gray-900"
            >
              市場温度スコア
            </Link>
            の<strong>C5 要素</strong>として採用しています。
          </p>
          <p className="text-base leading-relaxed mt-3">
            勢いよく円安が進んでいる局面は、日本株のセンチメントを温める方向に働きやすく、
            逆に急速な円高はリスクオフのサインとして温度を冷やす方向に効きます。
            水準そのものより<strong>変化の方向と速さ</strong>を見ることで、相場の「気分」をより敏感に捉えようという狙いです。
          </p>
          <p className="text-base leading-relaxed mt-3">
            市場温度スコアは、このドル円モメンタム（C5）に加えて、日経225 の移動平均乖離率（C1）・海外勢フロー（C2）・
            信用倍率（C3）・裁定残（C4）を等ウェイトで束ねています。為替はその<strong>マクロ要因の一翼</strong>を担う位置づけです。
          </p>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            単純な逆相関では読めない注意点
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>関係は局面で変わる</strong>: 「円安＝株高」は平常時の傾向であって、
              リスクオフ局面では崩れます。<strong>『今はどちらのモードか』を意識せずに機械的に当てはめると逆方向の判断</strong>になりかねません
            </li>
            <li>
              <strong>行き過ぎた円安は逆風にもなる</strong>: 輸入コストの上昇（エネルギー・原材料）や、
              急速すぎる円安への警戒・為替介入観測などが意識されると、円安でも株が伸びにくくなることがあります
            </li>
            <li>
              <strong>為替単独では決まらない</strong>: 株価は金利・海外市況・企業業績など多くの要因で動きます。
              ドル円はあくまで<strong>重要な材料の 1 つ</strong>であり、VIX・需給指標などと合わせて読むべきです
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ 「円安だから必ず株高」「円高だから必ず株安」と短絡せず、
            <strong>平常時モードかリスクオフモードかを見極める</strong>のがいちばんのコツです。
            株温計の温度スコアは、この為替の勢いを他の需給・センチメント要素と一緒に眺めるための道具として使えます。
          </p>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              用語集:{" "}
              <Link
                href="/glossary#usdjpy-momentum"
                className="underline hover:text-gray-900"
              >
                ドル円モメンタム
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#kabuonkei-score"
                className="underline hover:text-gray-900"
              >
                市場温度スコア
              </Link>
              {" "}/{" "}
              <Link href="/glossary#vix" className="underline hover:text-gray-900">
                VIX
              </Link>
            </li>
            <li>
              関連する解説:{" "}
              <Link
                href="/learn/what-is-vix"
                className="underline hover:text-gray-900"
              >
                VIX（恐怖指数）とは？
              </Link>
              {" "}/{" "}
              <Link
                href="/learn/what-is-investor-flow"
                className="underline hover:text-gray-900"
              >
                投資部門別売買動向とは？
              </Link>
              {" "}/{" "}
              <Link
                href="/learn/what-is-drawdown"
                className="underline hover:text-gray-900"
              >
                ドローダウンとは？
              </Link>
            </li>
            <li>
              主要イベント:{" "}
              <Link
                href="/events/reiwa-black-monday-2024"
                className="underline hover:text-gray-900"
              >
                令和のブラックマンデー（2024-08-05、円キャリー巻き戻し）
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は為替（ドル円）と株価の関係の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。記載している関係は一般的に語られる傾向であり、
            局面によって変化し、将来の相場や個別の投資成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
