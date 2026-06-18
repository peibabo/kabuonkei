import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-nikkei-vi";
const ARTICLE_TITLE =
  "日経VIとは？VIX との違いと日本市場の不安心理の測り方を初心者向けに解説";
const ARTICLE_DESCRIPTION =
  "日経VI（日経平均ボラティリティー・インデックス）の意味、VIX（米国の恐怖指数）との違い、平時20前後／30超で警戒／40超でパニックという水準別の目安、^JNV のデータ取得制約、株温計が VIX 系を主系列にしている理由を初心者向けに解説します。";
const PUBLISHED_AT = "2026-06-18";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "日経VI とは",
    "日経平均ボラティリティー・インデックス",
    "日経VI VIX 違い",
    "日経VI 水準",
    "恐怖指数 日本",
    "予想変動率",
    "^JNV",
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
  { href: "#what", label: "日経VIとは" },
  { href: "#vs-vix", label: "VIX との違い" },
  { href: "#levels", label: "水準別の意味" },
  { href: "#data", label: "データ取得の制約（^JNV）" },
  { href: "#kabuonkei", label: "株温計が VIX 系を主系列にする理由" },
  { href: "#related", label: "関連用語・関連記事" },
];

const LEVELS = [
  {
    band: "〜20 前後",
    label: "平静",
    color: "text-emerald-700",
    note: "市場が落ち着いている平常時の水準。投資家の不安は限定的",
  },
  {
    band: "20〜30",
    label: "やや警戒",
    color: "text-amber-600",
    note: "下落や不透明感が意識され始めた局面",
  },
  {
    band: "30〜40",
    label: "警戒",
    color: "text-orange-600",
    note: "調整・急落が進行し、ヘッジ需要が高まっている状態",
  },
  {
    band: "40 以上",
    label: "パニック",
    color: "text-red-700",
    note: "暴落局面。過去の危機では一時的に 60〜90 まで急騰したこともある",
  },
];

const VS_VIX = [
  {
    point: "対象",
    vix: "S&P500（米国株）",
    nikkeiVi: "日経225（日本株）",
  },
  {
    point: "算出元",
    vix: "CBOE（シカゴ・オプション取引所）",
    nikkeiVi: "JPX（日本取引所グループ）",
  },
  {
    point: "意味",
    vix: "向こう 30 日の予想変動率（年率）",
    nikkeiVi: "向こう 30 日の予想変動率（年率）※考え方は同じ",
  },
  {
    point: "ティッカー",
    vix: "^VIX（主要データソースで広く取得可能）",
    nikkeiVi: "^JNV（一般的なデータソースでは取得しにくい）",
  },
];

export default function WhatIsNikkeiViPage() {
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
    { name: "日経VIとは" },
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
            href="/glossary#nikkei-vi"
            className="underline hover:text-gray-700"
          >
            用語集「日経VI」
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
              <strong>日経VI（日経平均ボラティリティー・インデックス）</strong>は、
              JPX が公表する<strong>日本版の「恐怖指数」</strong>。日経225 オプション価格から逆算した
              「向こう 30 日の予想変動率（年率）」を示す
            </li>
            <li>
              考え方は米国の<strong>VIX とまったく同じ</strong>。違いは
              <strong>対象指数（日経225 か S&amp;P500 か）と算出元（JPX か CBOE か）</strong>
            </li>
            <li>
              水準の目安は<strong>平時 20 前後／30 超で警戒／40 超でパニック</strong>。
              過去の危機（リーマン・コロナ・令和のブラックマンデー）では一時 60〜90 まで急騰したこともある
            </li>
            <li>
              ティッカー <code>^JNV</code> は<strong>一般的なデータソース（Yahoo Finance 等）では取得しにくい</strong>。
              この制約もあり、株温計は<strong>米国版温度を VIX ベースの主系列</strong>で表示している（後述）
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            日経VIとは
          </h2>
          <p className="text-base leading-relaxed">
            <strong>日経VI（日経平均ボラティリティー・インデックス）</strong>は、日本取引所グループ（JPX）が算出・公表する、
            <strong>日経225 オプションの価格から逆算した予想変動率指数</strong>です。
            「向こう 30 日間で日経平均がどれくらい上下に動くと市場参加者が予想しているか」を年率換算した値で表します。
          </p>
          <p className="text-base leading-relaxed mt-3">
            投資家が先行きの急落に備えてオプション（保険）を買う動きが強まると、オプション価格が上がり、日経VI も上昇します。
            逆に相場が落ち着いていれば低位で推移します。このため日経VI は
            <strong>「日本版の恐怖指数」</strong>と呼ばれ、日経225 が急落する局面で跳ね上がる性質があります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            株価指数そのもの（上がった／下がった）ではなく<strong>「これからの揺れの大きさへの不安」</strong>を映すのがポイントで、
            センチメント（投資家心理）を測る指標として使われます。
          </p>
        </section>

        <section id="vs-vix" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            VIX との違い
          </h2>
          <p className="text-base leading-relaxed">
            「日経VI は VIX の日本版」と理解して大筋で問題ありません。
            <strong>算出ロジックの考え方は共通</strong>で、対象とする市場と算出元が違うだけです。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold"></th>
                  <th className="px-3 py-2 text-left font-semibold">VIX（米国）</th>
                  <th className="px-3 py-2 text-left font-semibold">日経VI（日本）</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                {VS_VIX.map((r) => (
                  <tr key={r.point}>
                    <td className="font-semibold whitespace-nowrap">{r.point}</td>
                    <td className="text-gray-700">{r.vix}</td>
                    <td className="text-gray-700">{r.nikkeiVi}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed mt-3">
            実務上は、日米の<strong>恐怖指数を見比べる</strong>ことで「今の不安は世界共通なのか、日本市場特有なのか」を読み分けられます。
            たとえば VIX が低位なのに日経VI だけ跳ねていれば、日本固有の材料（政策・為替・地政学）が意識されている可能性がある、という具合です。
            VIX 単体の詳しい解説は{" "}
            <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
              「VIX（恐怖指数）とは？」
            </Link>
            にまとめています。
          </p>
        </section>

        <section id="levels" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            水準別の意味
          </h2>
          <p className="text-base leading-relaxed">
            日経VI でよく語られる水準感の目安です。VIX とおおむね近い帯で読まれますが、
            日経225 は値動きがやや荒くなりやすく、平時の水準が VIX より高めに出る傾向があるとされます。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">水準</th>
                  <th className="px-3 py-2 text-left font-semibold">読み方</th>
                  <th className="px-3 py-2 text-left font-semibold">意味・目安</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                {LEVELS.map((l) => (
                  <tr key={l.band}>
                    <td className="font-mono font-semibold whitespace-nowrap">
                      {l.band}
                    </td>
                    <td className={`font-semibold ${l.color}`}>{l.label}</td>
                    <td className="text-gray-700">{l.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ VIX と同じく、日経VI は<strong>「高いから売り／低いから買い」と単純に逆張りできる指標ではありません</strong>。
            急騰は「すでに不安が織り込まれた＝底が近い」サインにも、「これから荒れる」前触れにもなり得ます。
            水準そのものより<strong>「急変したかどうか」と価格の動きを合わせて読む</strong>のが実務的です。
          </p>
        </section>

        <section id="data" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            データ取得の制約（^JNV）
          </h2>
          <p className="text-base leading-relaxed">
            日経VI のティッカーは公表上 <code>^JNV</code> ですが、
            <strong>VIX（<code>^VIX</code>）のように一般的なデータソースで手軽に取得できるわけではありません</strong>。
            Yahoo Finance では正式に提供されておらず、個人サイトで日次の時系列を完全にトラッキングするには、
            JPX の直接配信や J-Quants など別のデータソースが必要になります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            株温計でも、この取得制約を率直な事情として扱っています。
            「日本版の恐怖指数を主系列に据えられないのは、概念の問題ではなく<strong>安定して取得できるデータソースの問題</strong>」
            というのが実態です。日経VI が手軽に取れる環境であれば、日本版温度の有力な構成候補になり得ます。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            株温計が VIX 系を主系列にする理由
          </h2>
          <p className="text-base leading-relaxed">
            株温計の{" "}
            <Link
              href="/glossary#kabuonkei-score"
              className="underline hover:text-gray-900"
            >
              市場温度スコア
            </Link>
            は、米国版を<strong>VIX ベースの推定値</strong>で主系列としています。これは
            <strong>VIX が安定して取得でき、過去データも長く揃っている</strong>ため、検証や推移の表示に向いているからです。
          </p>
          <p className="text-base leading-relaxed mt-3">
            一方、日本版の市場温度スコアは VIX や日経VI のようなボラティリティ指数ではなく、
            日経225 の移動平均乖離率・裁定残・海外勢フロー・信用倍率・ドル円モメンタムという
            <strong>5 つの需給・マクロ要素</strong>を束ねて算出しています。
            日経VI を直接は使っていませんが、<strong>将来的な拡張候補</strong>として、
            データ取得環境が整えば日本版「恐怖指数」要素の検討対象に位置付けています。
          </p>
          <p className="text-base leading-relaxed mt-3">
            「米国は VIX、日本は需給・マクロの合成」という非対称な作り方は、
            <strong>『取れるデータで一番筋の良い指標を組む』という現実的な設計判断</strong>の結果です。
            今日の日米の温度は{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの市場温度ゲージ
            </Link>
            で見比べられます。
          </p>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              用語集:{" "}
              <Link href="/glossary#nikkei-vi" className="underline hover:text-gray-900">
                日経VI
              </Link>
              {" "}/{" "}
              <Link href="/glossary#vix" className="underline hover:text-gray-900">
                VIX
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#kabuonkei-score"
                className="underline hover:text-gray-900"
              >
                市場温度スコア
              </Link>
            </li>
            <li>
              関連するセンチメント解説:{" "}
              <Link
                href="/learn/what-is-vix"
                className="underline hover:text-gray-900"
              >
                VIX（恐怖指数）とは？
              </Link>
              {" "}/{" "}
              <Link
                href="/learn/what-is-fear-greed"
                className="underline hover:text-gray-900"
              >
                Fear &amp; Greed Index とは？
              </Link>
            </li>
            <li>
              VIX 水準別の独自検証:{" "}
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？
              </Link>
            </li>
            <li>
              主要イベント:{" "}
              <Link
                href="/events/reiwa-black-monday-2024"
                className="underline hover:text-gray-900"
              >
                令和のブラックマンデー（2024-08-05）
              </Link>
              {" "}/{" "}
              <Link
                href="/events/covid-crash-nikkei-2020"
                className="underline hover:text-gray-900"
              >
                コロナショック日経底（2020-03-19）
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は日経VI というボラティリティ指数の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。記載している水準の目安は一般的に語られてきた経験則であり、
            将来の相場や個別の投資成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
