import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import DivergenceAnalysisBody from "@/components/analysis/DivergenceAnalysisBody";
import Breadcrumb from "@/components/Breadcrumb";
import { getDivergenceAnalysis } from "@/lib/divergence-analysis";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/analysis/temperature-divergence";
const ARTICLE_TITLE =
  "日本だけ熱い・米国は冷静——日米温度の乖離が ±20 を超えた日、その後の日経225 と S&P500 はどう動いたか？";
const ARTICLE_DESCRIPTION =
  "日本版・米国版の株温計スコアが大きく乖離した日 (温度差 ±20 以上) の後、日経225 と S&P500 がどう動いたか？ 過去約 10 年・2,300 取引日の独自集計で、収斂・発散のパターンを検証します。";
const PUBLISHED_AT = "2026-04-24";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "日米株",
    "温度差",
    "乖離",
    "日経225",
    "S&P500",
    "市場センチメント",
    "Fear & Greed",
    "株温計",
    "クロス市場",
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
  { href: "#term", label: "温度差とは" },
  { href: "#kabuonkei", label: "株温計の使い方" },
  { href: "#quartile", label: "温度差の歴史的分布" },
  { href: "#primary", label: "乖離別の日米リターン" },
  { href: "#joint", label: "乖離 × 日本温度 クロス" },
  { href: "#implications", label: "示唆 — 収斂と発散" },
  { href: "#method", label: "データと手法" },
  { href: "#related", label: "関連リンク" },
];

export default function TemperatureDivergencePage() {
  const analysis = getDivergenceAnalysis();
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: analysis.generatedAt,
  });

  const jpHotBand = analysis.primary.bands.find(
    (b) => b.band === "日本が大幅優位 (≥ +20)"
  );
  const usSlightBand = analysis.primary.bands.find(
    (b) => b.band === "米国がやや優位 (-20〜-10)"
  );
  const jpHot3mN = jpHotBand?.nikkei225["3m"];
  const jpHot3mSp = jpHotBand?.sp500["3m"];

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "分析記事", path: "/analysis" },
    { name: "日米温度の乖離" },
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
            「米国は落ち着いているのに、日本だけ妙に熱い」「VIX は急騰したけど日本市場は別世界」——
            日米市場のセンチメントが食い違う局面は、年に数回必ず起きます。
            このとき<strong>その後どう動いてきたのか</strong>は、感覚的には知られていても{" "}
            <strong>過去のデータで定量化されることは稀</strong> です。
          </p>
          {jpHot3mN && jpHot3mSp && (
            <p className="leading-relaxed mt-3">
              この記事では、日米それぞれの株温計スコアの差 (<code>JP − US</code>) を
              <strong>温度差</strong>と呼び、過去約 10 年・
              <strong>{analysis.sampleSize.toLocaleString()} 取引日</strong>{" "}
              を集計しました。たとえば<strong>「日本が大幅に熱い (温度差 ≥ +20)」</strong>{" "}
              局面は過去 {jpHotBand!.occurrences} 日あり、その 3ヶ月後の日経225 は平均{" "}
              <strong>
                {jpHot3mN.avgReturn >= 0 ? "+" : ""}
                {jpHot3mN.avgReturn.toFixed(1)}% / 勝率{" "}
                {jpHot3mN.winRate.toFixed(0)}%
              </strong>
              、S&P500 は平均{" "}
              <strong>
                {jpHot3mSp.avgReturn >= 0 ? "+" : ""}
                {jpHot3mSp.avgReturn.toFixed(1)}%
              </strong>{" "}
              でした。<strong>「日本だけ熱い＝危険」とは限らない</strong>のが過去 10 年データの示す事実です。
            </p>
          )}
          <p className="leading-relaxed mt-3">
            ただしこれは <strong>「過去そうだった」</strong> という統計であり、未来を保証するものではありません。
            データをどう読み、どう判断の補助に使うか — 後半でクロス集計を交えながら解釈します。
          </p>
        </section>

        <section id="term" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            「温度差」とは
          </h2>
          <p className="leading-relaxed">
            株温計には日米それぞれ独立した温度スコア (0-100) があります。
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mt-2">
            <li>
              <strong>米国版温度</strong> — VIX (恐怖指数) を 0-100 にマッピングしたセンチメント指標。S&P500 のオプション市場の予想変動率がベース
            </li>
            <li>
              <strong>日本版温度</strong> — 日経225 の 125 日 MA 乖離 (C1) と USDJPY の 50 日モメンタム (C5) の等ウェイト平均。需給ベース
            </li>
          </ul>
          <p className="leading-relaxed mt-3">
            この 2 つは<strong>原理が完全に違う</strong>ため、しばしば乖離します。本記事では
            <strong>
              <code>温度差 = 日本版スコア − 米国版スコア</code>
            </strong>
            と定義し、
          </p>
          <ul className="list-disc pl-6 text-sm leading-relaxed mt-2">
            <li>
              <strong>正の温度差</strong> = 日本が相対的に熱い（米国は冷静）
            </li>
            <li>
              <strong>負の温度差</strong> = 米国が相対的に熱い（日本は冷静）
            </li>
            <li>
              <strong>±10 以内</strong> = ほぼ同温（健全な連動状態）
            </li>
          </ul>
          <p className="leading-relaxed mt-3 text-sm">
            VIX が急騰すれば米国版温度は急落しますが、日本版は需給ベースなので即座には反応しません。逆に円安・日経高で日本版だけ熱くなる局面もあります。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            株温計の使い方
          </h2>
          <p className="leading-relaxed">
            株温計は<strong>日米両方の温度を 1 画面で並べて表示</strong>します。これにより、{" "}
            <strong>同じ日にどちらが熱いか</strong> を一目で確認できます。
            まずは{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの温度計
            </Link>
            で現在の日米温度を確認してから、下の集計を読み進めてみてください。
          </p>
        </section>

        <DivergenceAnalysisBody analysis={analysis} />

        <section id="implications" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            示唆 — 収斂と発散のパターン
          </h2>
          <p className="leading-relaxed">
            集計結果から読み取れるのは、以下の三点です。
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-sm leading-relaxed mt-3">
            <li>
              <strong>過去 10 年は「米国が熱い」期間が標準</strong>。中央値が約{" "}
              {analysis.gapQuantiles.p50} ということは、半分以上の期間で「米国温度 &gt; 日本温度」だった。日本版温度はそもそも沸騰しにくい指標
            </li>
            <li>
              <strong>「日本が大幅に熱い (≥ +20)」局面は、両市場ともむしろ強い</strong>傾向
              （
              {jpHot3mN && jpHot3mSp && (
                <>
                  3 ヶ月後 N225 平均{" "}
                  <strong>
                    {jpHot3mN.avgReturn >= 0 ? "+" : ""}
                    {jpHot3mN.avgReturn.toFixed(1)}%
                  </strong>
                  / S&P500 平均{" "}
                  <strong>
                    {jpHot3mSp.avgReturn >= 0 ? "+" : ""}
                    {jpHot3mSp.avgReturn.toFixed(1)}%
                  </strong>
                </>
              )}
              ）。日本独自要因（円安・需給フィーバー）で乖離した後、米国が後追いするケースが多い
            </li>
            <li>
              <strong>意外な弱バンドは「米国がやや優位 (-20〜-10)」</strong>{" "}
              {usSlightBand && (
                <>
                  （n={usSlightBand.occurrences} 日、3 ヶ月後 N225 平均{" "}
                  <strong>
                    {usSlightBand.nikkei225["3m"].avgReturn >= 0 ? "+" : ""}
                    {usSlightBand.nikkei225["3m"].avgReturn.toFixed(1)}%
                  </strong>{" "}
                  / 勝率 {usSlightBand.nikkei225["3m"].winRate.toFixed(0)}%）
                </>
              )}
              。米国がじわっと熱くなり始めて日本がついていけない局面は、
              <strong>日経225 にとって最も停滞しがち</strong>
            </li>
          </ol>
          <p className="leading-relaxed mt-3">
            つまり「乖離している＝危険」ではなく、<strong>どちら向きの乖離か</strong>と{" "}
            <strong>日本の絶対水準</strong> の組み合わせで意味が変わります。下のヒートマップで、自分が気になるセル（日本沸騰 × 同温・米国優位など）を確認してみてください。
          </p>
        </section>

        <section id="method" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            データと手法
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm leading-relaxed">
            <li>
              <strong>米国版温度</strong>: Yahoo Finance の ^VIX 日足から{" "}
              <code>estimateFearGreedFromVix()</code> で 0-100 に変換 (VIX 10 →
              95、VIX 40 → 5 の線形マッピング)
            </li>
            <li>
              <strong>日本版温度</strong>: 株温計の日本版スコア (C1 = 日経225 vs
              125日MA、C5 = USDJPY 50日モメンタム の等ウェイト平均)
            </li>
            <li>
              <strong>S&amp;P500</strong>: Yahoo Finance の ^GSPC 日足終値
            </li>
            <li>
              <strong>日経225</strong>: Yahoo Finance の ^N225 日足終値
            </li>
            <li>
              <strong>集計対象</strong>: 米国取引日を anchor として、日本版温度が計算できる
              {analysis.dataRange.from} 〜 {analysis.dataRange.to} の{" "}
              {analysis.sampleSize.toLocaleString()} 取引日。日本休場時は 7 日以内の直近営業日の日本版温度で補完
            </li>
            <li>
              <strong>将来リターン</strong>: 各取引日の終値から 30 / 90 / 180 カレンダー日先の同指数終値を比較。該当日が取引日でない場合は 7 日以内の直近取引日で補完
            </li>
            <li>
              <strong>スプレッド</strong>: 同じバンド内での「日経225 平均リターン − S&amp;P500 平均リターン」(パーセントポイント)
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
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？
              </Link>{" "}
              — 米国センチメント単独で見る同種分析
            </li>
            <li>
              <Link
                href="/analysis/margin-ratio-temperature"
                className="underline hover:text-gray-900"
              >
                信用倍率 × 株温計 — 過去10年の検証
              </Link>{" "}
              — 日本市場の需給 × 温度クロス分析
            </li>
            <li>
              <Link
                href="/guide/short-term-trader"
                className="underline hover:text-gray-900"
              >
                短期トレーダー向けガイド
              </Link>{" "}
              — 日米温度差を逆張り判断にどう使うか
            </li>
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                今日の日米温度を見る
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-xs text-gray-500 leading-relaxed">
            ※ 本記事は投資助言ではありません。過去のリターンは将来を保証するものではありません。米国温度は VIX を線形変換した近似値で、CNN Fear &amp; Greed Index とは厳密には異なります。投資判断はご自身のリスク許容度に応じて行ってください。データ出典: Yahoo Finance（^VIX / ^GSPC / ^N225）、株温計 日本版温度履歴。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
