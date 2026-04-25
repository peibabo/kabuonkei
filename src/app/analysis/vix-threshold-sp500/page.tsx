import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import VixSp500AnalysisBody from "@/components/analysis/VixSp500AnalysisBody";
import Breadcrumb from "@/components/Breadcrumb";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/analysis/vix-threshold-sp500";
const ARTICLE_TITLE =
  "VIX が 30 を超えた日、その後 S&P500 はどう動いたか？— 過去20年の検証";
const ARTICLE_DESCRIPTION =
  "「VIX 30 超え＝パニック＝危険」は本当か？ 過去約 20 年・5000 取引日を集計すると、VIX が高いときほど S&P500 の翌 1/3/6ヶ月リターンと勝率は高い傾向。日本版株温計とのクロス市場ビューも併載。";
const PUBLISHED_AT = "2026-04-23";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "VIX",
    "VIX 30",
    "VIX 目安",
    "VIX 使い方",
    "恐怖指数",
    "S&P500",
    "日経225",
    "株温計",
    "市場センチメント",
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
  { href: "#term", label: "VIXとは" },
  { href: "#kabuonkei", label: "株温計との関係" },
  { href: "#quartile", label: "VIXの歴史的分布" },
  { href: "#primary", label: "VIX 別の日米リターン" },
  { href: "#joint", label: "VIX × 日本温度 クロス市場" },
  { href: "#implications", label: "示唆 — 逆張り指標としての VIX" },
  { href: "#method", label: "データと手法" },
  { href: "#related", label: "関連リンク" },
];

export default function VixThresholdSp500Page() {
  const analysis = getVixSp500Analysis();
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: analysis.generatedAt,
  });

  const highVixBand = analysis.primary.bands.find((b) => b.band === "30〜");
  const highVix3m = highVixBand?.sp500["3m"];

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "分析記事", path: "/analysis" },
    { name: "VIX 30 超えと S&P500" },
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
          最終更新:{" "}
          <time dateTime={analysis.generatedAt}>{analysis.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）
        </p>

        <section id="intro" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3">はじめに</h2>
          <p className="leading-relaxed">
            「VIX が 30 を超えたから株を売った方がいい」「VIX がパニック水準だから退避」——
            ニュースやSNSでよく見る経験則ですが、<strong>過去20年分のデータで検証されることは稀</strong>です。
          </p>
          {highVix3m && (
            <p className="leading-relaxed mt-3">
              この記事では ^VIX 日足を過去{" "}
              <strong>約 20 年 ({analysis.sampleSize.toLocaleString()} 取引日)</strong>{" "}
              集計しました。結論から言うと、
              <strong>
                VIX が 30 を超えた日 ({highVixBand.occurrences.toLocaleString()} 日) の翌 3ヶ月後、
                S&P500 は平均 {highVix3m.avgReturn >= 0 ? "+" : ""}
                {highVix3m.avgReturn.toFixed(1)}% / 勝率 {highVix3m.winRate.toFixed(0)}%
              </strong>
              。つまり<strong>「VIX 高騰＝むしろ買い場だった」</strong>のが過去 20 年のデータが示す事実です。
            </p>
          )}
          <p className="leading-relaxed mt-3">
            ただしこれは <strong>「過去そうだった」</strong> という統計であって、未来を保証するものではありません。データをどう読み、どう行動判断の補助にするか — 記事の後半で、日本版株温計とのクロス集計も交えながら解釈します。
          </p>
        </section>

        <section id="term" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            VIX（恐怖指数）とは
          </h2>
          <p className="leading-relaxed">
            <strong>VIX</strong>（CBOE Volatility Index）は、S&P500 オプションの
            インプライド・ボラティリティから算出される指標。<strong>今後 30 日間の市場予想変動率</strong>
            を年率換算した値です。米国では 1993 年から公表されており、いまでは「恐怖指数」として世界中で参照されます。
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mt-2">
            <li>
              <strong>15 未満</strong>: 極めて落ち着いた相場。油断ゾーン
            </li>
            <li>
              <strong>15〜20</strong>: 通常レベル
            </li>
            <li>
              <strong>20〜30</strong>: 警戒ゾーン。ヘッジ需要が高まる
            </li>
            <li>
              <strong>30 以上</strong>: パニック水準。リーマン危機・コロナショック等の大暴落時に一致
            </li>
          </ul>
          <p className="leading-relaxed mt-3 text-sm">
            ただし <strong>「VIX 30 超え = 売り」ではない</strong>のがこの記事の主題。投資家心理を示すセンチメント指標は、<strong>しばしば逆張り指標として機能</strong>します。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            株温計との関係
          </h2>
          <p className="leading-relaxed">
            株温計の米国版温度（0-100）は VIX を基に算出しているため、VIX と
            <strong>ほぼ 1:1 の反比例関係</strong>（VIX 低 = 温度高 / VIX 高 = 温度低）です。
            一方、株温計の<strong>日本版温度</strong>は独立した指標（日経225 × USD/JPY の需給ベース）なので、VIX と組み合わせた<strong>クロス市場</strong>ビューが可能になります。
            後半のヒートマップはその角度からの分析です。まずは{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの温度計
            </Link>
            で現在の日米温度を確認してから読み進めてみてください。
          </p>
        </section>

        <VixSp500AnalysisBody analysis={analysis} />

        <section id="implications" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            示唆 — 逆張り指標としての VIX
          </h2>
          <p className="leading-relaxed">
            集計結果から読み取れるのは、以下の三点です。
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-sm leading-relaxed mt-3">
            <li>
              <strong>VIX が高いほど、翌 1/3/6ヶ月の S&P500 平均リターンと勝率は上がる</strong>傾向。特に 30 以上のパニック帯では、3ヶ月後の勝率が 70% 台に達する日が多い
            </li>
            <li>
              これは「VIX 30 超えの時点では、すでに悲観は織り込み済み／売り圧力が一巡しているケースが多い」ことの経験的な表れ。逆に VIX 15 未満の平穏期は、<strong>目立たないがドローダウンに変わる可能性もある油断相場</strong>
            </li>
            <li>
              ただし <strong>「VIX 30 = 絶対買い」ではない</strong>。リーマンショックのように VIX がさらに上昇を続ける局面もある。日本版温度と組合せて、センチメントが本当に一巡したかを確認する使い方が実用的
            </li>
          </ol>
          <p className="leading-relaxed mt-3">
            同じ VIX 水準でも、日本版温度が<strong>極寒</strong>（すでに売り一巡）か<strong>平温以上</strong>（まだ調整が始まったばかり）かで、その後の動きは変わります。下のクロス市場ヒートマップで、自分が気になるセル（VIX 高 × 極寒 等）を確認してみてください。
          </p>
        </section>

        <section id="method" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            データと手法
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm leading-relaxed">
            <li>
              <strong>VIX</strong>: Yahoo Finance の ^VIX 日足終値
            </li>
            <li>
              <strong>S&amp;P500</strong>: Yahoo Finance の ^GSPC 日足終値
            </li>
            <li>
              <strong>日経225</strong>: Yahoo Finance の ^N225 日足終値
            </li>
            <li>
              <strong>日本版温度</strong>: 株温計の日本版スコア（C1 = 日経225 vs 125日MA、C5 = USDJPY 50日モメンタム の等ウェイト平均）
            </li>
            <li>
              <strong>集計対象</strong>: Primary は過去 20 年 ({analysis.dataRange.from} 〜{" "}
              {analysis.dataRange.to})、n={analysis.sampleSize}。Joint は日本版温度が計算できる {analysis.joint.dataRange.from} 以降、n={analysis.joint.sampleSize}
            </li>
            <li>
              <strong>将来リターン</strong>: 各取引日の終値から 30 / 90 / 180 カレンダー日先の同指数終値を比較。該当日が取引日でない場合は 7 日以内の直近取引日で補完
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
              — 米国センチメントを日本版温度と並べたクロス市場ビュー
            </li>
            <li>
              <Link
                href="/analysis/margin-ratio-temperature"
                className="underline hover:text-gray-900"
              >
                信用倍率 × 株温計 — 過去10年の検証
              </Link>{" "}
              — 需給指標 × 温度の日本市場クロス分析
            </li>
            <li>
              <Link href="/guide/fire-long-term" className="underline hover:text-gray-900">
                FIRE を目指す人向けガイド
              </Link>{" "}
              — VIX 高騰時のリバランス / 追加投資の考え方
            </li>
            <li>
              <Link href="/events" className="underline hover:text-gray-900">
                過去の主要イベント一覧
              </Link>{" "}
              — コロナショック・リーマンショック等、VIX が歴史的高値をつけた日
            </li>
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                今日の株温計と VIX を見る
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-xs text-gray-500 leading-relaxed">
            ※ 本記事は投資助言ではありません。過去のリターンは将来を保証するものではありません。VIX が高水準でも一時的な反発で終わることや、さらに下落することもあります。投資判断はご自身のリスク許容度に応じて行ってください。データ出典: Yahoo Finance（^VIX / ^GSPC / ^N225）。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
