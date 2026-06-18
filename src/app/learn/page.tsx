import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

export const metadata: Metadata = {
  title: "解説記事",
  description:
    "VIX・Fear & Greed・信用倍率など、株温計が扱う指標を初心者向けに腰を据えて解説する読み物。「○○とは？」というクエリに正面から答えます。",
  openGraph: {
    title: "解説記事 | 株温計",
    description:
      "VIX・Fear & Greed・信用倍率など、初心者向けに腰を据えて解説する読み物。",
  },
  alternates: {
    canonical: "/learn",
  },
};

interface LearnArticle {
  slug: string;
  icon: string;
  title: string;
  description: string;
  publishedAt: string;
}

const ARTICLES: LearnArticle[] = [
  {
    slug: "what-is-usdjpy-momentum",
    icon: "💴",
    title:
      "円安・円高と株価の関係とは？リスクオフで円高になる仕組みを初心者向けに解説",
    description:
      "なぜ円安は日本株に追い風で円高は逆風なのか、リスクオフで「円高＋株安」が同時に起きる仕組み（円キャリー巻き戻し）、単純な逆相関では読めない注意点、株温計が使う「ドル円モメンタム」（C5 要素）を初心者向けに整理。",
    publishedAt: "2026-06-18",
  },
  {
    slug: "what-is-drawdown",
    icon: "📉",
    title:
      "ドローダウンとは？最大DDの意味と「リターンより怖い」理由を初心者向けに解説",
    description:
      "ドローダウン (DD) と最大ドローダウンの意味、計算式、過去の S&P500・日経225 のDD実績、なぜリターンより最大DDが投資判断で重要かを解説。株温計の温度連動ポートフォリオで見えた「温度信号は最大DDを抑制する道具」という結論への接続も整理。",
    publishedAt: "2026-05-08",
  },
  {
    slug: "what-is-arbitrage-balance",
    icon: "⚖️",
    title:
      "裁定残とは？裁定買い残・売り残の意味と SQ 前後で気にすべき理由",
    description:
      "裁定残（裁定取引残高）の見方を初心者向けに解説。裁定買い残と裁定売り残の違い、JPX 毎営業日 16:00 公表データの読み方、メジャー SQ 前後で起きる「裁定解消売り／買い戻し」、株温計の温度スコア C2 要素としての扱いまで整理。",
    publishedAt: "2026-05-08",
  },
  {
    slug: "what-is-investor-flow",
    icon: "🌐",
    title:
      "投資部門別売買動向とは？外国人投資家のフローを毎週どう読むか",
    description:
      "投資部門別売買状況（JPX 公表）の見方を初心者向けに解説。主要 6 区分の主体・外国人フローが日本市場の主役と言われる根拠（2024 年シェア値）・読み方のコツ 4 つ・株温計 C3 要素としての扱いまで整理。",
    publishedAt: "2026-05-08",
  },
  {
    slug: "what-is-margin-ratio",
    icon: "📊",
    title:
      "信用倍率とは？見方・水準別の意味と、温度スコアと組み合わせて読むコツ",
    description:
      "信用倍率（信用買い残÷信用売り残）の意味、JPX 公表データの読み方、「4 倍超え=過熱」という通説の真偽、株温計の温度スコアと組み合わせた使いどころを初心者向けに解説。",
    publishedAt: "2026-04-28",
  },
  {
    slug: "what-is-fear-greed",
    icon: "🌡️",
    title:
      "Fear & Greed Index とは？CNN 米国版の中身と、日本版を株温計でどう作っているか",
    description:
      "CNN Fear & Greed Index の構成 7 要素・スコアの読み方・実用上の使いどころを解説。日本版を作るとしたら何が違うのかも、株温計の独自スコア（5 要素）と対比しながら整理します。",
    publishedAt: "2026-04-28",
  },
  {
    slug: "what-is-vix",
    icon: "📉",
    title:
      "VIX（恐怖指数）とは？S&P500 の不安心理を測る指標を初心者向けに解説",
    description:
      "VIX の定義、算出ロジック、水準別の意味、過去 20 年データで見た「VIX 30 超え＝危険」の真偽、日本投資家にとっての見方までを腰を据えて解説。",
    publishedAt: "2026-04-28",
  },
];

export default function LearnIndexPage() {
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "解説記事" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="learn-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title="📚 解説記事">
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-base leading-relaxed">
          市場で頻繁に言及される指標について、定義・読み方・実データでの検証を含めて
          腰を据えて解説する読み物です。「○○とは？」と検索するときに最初に当たる読みものを目指します。
        </p>
        <p className="text-xs text-gray-500 mt-2">
          短い定義だけ確認したい場合は{" "}
          <Link href="/glossary" className="underline hover:text-gray-700">
            用語集
          </Link>
          、独自データを使った検証記事は{" "}
          <Link href="/analysis" className="underline hover:text-gray-700">
            分析記事
          </Link>
          をご覧ください。
        </p>

        <ul className="grid grid-cols-1 gap-4 mt-6 list-none pl-0">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/learn/${a.slug}`}
                className="block border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">
                    {a.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">
                      {a.title}
                    </h2>
                    <p className="text-xs text-gray-400 mb-2">
                      公開: <time dateTime={a.publishedAt}>{a.publishedAt}</time>
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {a.description}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </StaticPageLayout>
    </>
  );
}
