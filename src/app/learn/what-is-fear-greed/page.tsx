import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-fear-greed";
const ARTICLE_TITLE =
  "Fear & Greed Index とは？CNN 米国版の中身と、日本版を株温計でどう作っているか";
const ARTICLE_DESCRIPTION =
  "Fear & Greed Index（CNN 恐怖と欲望指数）の構成 7 要素・スコアの読み方・実用上の使いどころを腰を据えて解説。日本版を作るとしたら何が違うのかも、株温計の独自スコア（5 要素）と対比しながら整理します。";
const PUBLISHED_AT = "2026-04-28";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "Fear and Greed Index とは",
    "恐怖と欲望指数",
    "CNN Fear Greed",
    "市場センチメント",
    "Fear Greed 日本版",
    "株温計",
    "VIX",
    "S&P500",
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
  { href: "#what", label: "Fear & Greed Index とは" },
  { href: "#bands", label: "スコアの読み方（5 段階）" },
  { href: "#components", label: "構成 7 要素を 1 つずつ" },
  { href: "#vix-vs", label: "VIX との違い・関係" },
  { href: "#japan", label: "日本版を作るとしたら？— 株温計の 5 要素" },
  { href: "#how-to-use", label: "実用上の使いどころ" },
  { href: "#related", label: "関連用語・関連記事" },
];

const BANDS = [
  { range: "0 〜 24", label: "Extreme Fear（極度の恐怖）", color: "text-red-700" },
  { range: "25 〜 44", label: "Fear（恐怖）", color: "text-orange-600" },
  { range: "45 〜 54", label: "Neutral（中立）", color: "text-gray-600" },
  { range: "55 〜 74", label: "Greed（欲望）", color: "text-emerald-600" },
  { range: "75 〜 100", label: "Extreme Greed（極度の欲望）", color: "text-emerald-700" },
];

const COMPONENTS = [
  {
    name: "Market Momentum（市場モメンタム）",
    summary:
      "S&P500 が直近 125 日移動平均より上にあれば前向きなモメンタム、下なら警戒。「上昇 = Greed」「失速 = Fear」のシグナル。",
  },
  {
    name: "Stock Price Strength（株価の強さ）",
    summary:
      "NYSE の銘柄のうち、過去 52 週高値を更新した銘柄数と、52 週安値を更新した銘柄数の比率。高値更新が多ければ Greed、安値更新が多ければ Fear。",
  },
  {
    name: "Stock Price Breadth（市場の広がり）",
    summary:
      "上昇銘柄と下落銘柄の出来高（McClellan Volume Summation Index）。上昇銘柄に出来高が乗っていれば Greed、出来高がやせ細れば Fear。",
  },
  {
    name: "Put and Call Options（プット/コール比率）",
    summary:
      "売る権利（プット）と買う権利（コール）の取引量の比率。プットが多ければ投資家がヘッジを買っている＝Fear。",
  },
  {
    name: "Market Volatility（VIX）",
    summary:
      "おなじみの恐怖指数。50 日移動平均に対して VIX が高い水準にあれば Fear、低ければ Greed。",
  },
  {
    name: "Safe Haven Demand（安全資産需要）",
    summary:
      "直近 20 日の米国債と株式のリターン差。株よりも国債が買われている期間が長いと Fear、株式に資金が向かっていれば Greed。",
  },
  {
    name: "Junk Bond Demand（ジャンク債需要）",
    summary:
      "投資適格債と高利回り（ジャンク）債の利回りスプレッド。スプレッドが縮小（投資家がリスクを取りに行っている）なら Greed、拡大すれば Fear。",
  },
];

export default function WhatIsFearGreedPage() {
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
    { name: "Fear & Greed Index とは" },
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
            href="/glossary#fear-greed-index"
            className="underline hover:text-gray-700"
          >
            用語集「Fear &amp; Greed Index」
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
              <strong>Fear &amp; Greed Index</strong> は CNN Business が公開している
              <strong>米国株式市場のセンチメント指数</strong>。0（極度の恐怖）〜100（極度の欲望）の
              1 つの数字で「いま市場参加者は怖がっているのか、強欲になっているのか」を表します
            </li>
            <li>
              中身は<strong>株価モメンタム・高値更新銘柄数・出来高・プット/コール比率・VIX・国債リターン差・ジャンク債スプレッド</strong>
              の 7 要素を等ウェイトで統合したもの。VIX 単体では拾いきれない「需給面の不安・楽観」も含めて読める
            </li>
            <li>
              実用上は<strong>「25 以下（極度の恐怖）」「75 以上（極度の欲望）」</strong>の極端ゾーンに入ったときが
              逆張りの判断材料として使われる場面。中間ゾーンの数値はあまりアクション材料にならない
            </li>
            <li>
              日本版は CNN が公開していないため、株温計が独自に作っています（{" "}
              <Link href="/glossary#kabuonkei-score" className="underline hover:text-gray-900">
                市場温度スコア
              </Link>
              、5 要素）。CNN の 7 要素との違いも本記事で対比します
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            Fear &amp; Greed Index とは
          </h2>
          <p className="text-base leading-relaxed">
            <strong>Fear &amp; Greed Index（恐怖と欲望指数）</strong>は、米 CNN Business が
            「<a
              href="https://www.cnn.com/markets/fear-and-greed"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-900"
            >
              CNN Markets
            </a>
            」内で常時公開している、<strong>米国株式市場のセンチメントを 0〜100 の単一スコアで表す指数</strong>です。
            ゼロに近いほど「極度の恐怖」、100 に近いほど「極度の欲望」を示します。
          </p>
          <p className="text-base leading-relaxed mt-3">
            このスコアは 7 つの異なる指標から計算され、それぞれが<strong>「現状はその指標の長期平均からどれだけズレているか」</strong>を
            数値化し、<strong>等ウェイト</strong>で統合します。
            個別の指標は専門的でも、最終アウトプットが「0〜100 の 1 つの数字」になっているため、
            投資の素人にも市場の空気を直感的に伝えられる形になっているのが大きな特徴です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            データソース・計算式は CNN Business 側で管理されており、構成要素ごとの寄与度や
            過去スコアの推移は CNN 公式サイトに毎日リアルタイムで掲載されます。
            一般投資家でも誰でも閲覧できる無料公開指標で、米国株を中心に投資判断の補助線として広く参照されています。
          </p>
        </section>

        <section id="bands" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            スコアの読み方（5 段階）
          </h2>
          <p className="text-base leading-relaxed">
            CNN 公式は、0〜100 のスコアを以下の 5 段階のラベルに分けて表示しています。
            「中立」のレンジが意外と狭く、両極の「極度の恐怖 / 極度の欲望」のラベル幅が広いのが特徴で、
            <strong>「両極端に振れたときに気付ける」設計</strong>になっています。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">スコア</th>
                  <th className="px-3 py-2 text-left font-semibold">ラベル</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                {BANDS.map((b) => (
                  <tr key={b.range}>
                    <td className="font-mono">{b.range}</td>
                    <td className={`font-semibold ${b.color}`}>{b.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            実用的には<strong>「25 以下（極度の恐怖）」「75 以上（極度の欲望）」</strong>に入ったときに、
            「いつもと違う水準にいる」サインとして相場を見直すのが基本の使い方です。
            「中立」「やや恐怖」「やや欲望」のレンジで取引判断を変えると、ノイズを拾い続けるだけで終わりがちです。
          </p>
        </section>

        <section id="components" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            構成 7 要素を 1 つずつ
          </h2>
          <p className="text-base leading-relaxed">
            7 要素はそれぞれ「相場の何を見ているか」が違います。1 つずつ理解しておくと、
            総合スコアが動いたときに<strong>「何が変わって動いたのか」</strong>を読み解けるようになります。
          </p>

          <ol className="list-decimal pl-6 mt-4 space-y-3 text-base leading-relaxed">
            {COMPONENTS.map((c, i) => (
              <li key={c.name}>
                <strong>{c.name}</strong>
                <span className="text-gray-500 text-sm ml-1">／第 {i + 1} 要素</span>
                <br />
                {c.summary}
              </li>
            ))}
          </ol>

          <p className="text-base leading-relaxed mt-4 text-gray-600">
            7 つの中で<strong>VIX が 1 つの構成要素として組み込まれている</strong>のがポイントです。
            つまり Fear &amp; Greed Index は VIX を「もっと多面的に見る」進化形であり、
            VIX 単体では拾いきれない需給・社債市場・先物オプション市場の不安まで含めて統合した、
            より厚みのあるセンチメント指標になっています。
          </p>
        </section>

        <section id="vix-vs" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            VIX との違い・関係
          </h2>
          <p className="text-base leading-relaxed">
            VIX と Fear &amp; Greed Index は、どちらも「米国株のセンチメント」を測るという目的では似ていますが、
            性格はかなり違います。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">観点</th>
                  <th className="px-3 py-2 text-left font-semibold">VIX</th>
                  <th className="px-3 py-2 text-left font-semibold">Fear &amp; Greed Index</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td>計算元</td>
                  <td>S&amp;P500 オプションの IV（単一データ）</td>
                  <td>7 つの異なる指標を統合</td>
                </tr>
                <tr>
                  <td>方向</td>
                  <td>高い = 不安、低い = 平静</td>
                  <td>低い = 恐怖、高い = 欲望（VIX と方向が逆）</td>
                </tr>
                <tr>
                  <td>レンジ</td>
                  <td>理論上ゼロ〜上限なし（実績は 9〜83）</td>
                  <td>0〜100 に正規化</td>
                </tr>
                <tr>
                  <td>更新頻度</td>
                  <td>取引時間中はリアルタイム</td>
                  <td>新データ着次第（おおむね 1 日数回）</td>
                </tr>
                <tr>
                  <td>得意なシーン</td>
                  <td>瞬間的なリスクオフの強さを測る</td>
                  <td>持続的なセンチメント・需給の偏りを測る</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            実務的には<strong>「VIX で瞬間風速、Fear &amp; Greed で持続的な偏り」</strong>と覚えると整理しやすいです。
            VIX について深掘りした記事は{" "}
            <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
              「VIX（恐怖指数）とは？」
            </Link>
            に、過去 20 年の VIX 水準別 S&amp;P500 リターン検証は{" "}
            <Link
              href="/analysis/vix-threshold-sp500"
              className="underline hover:text-gray-900"
            >
              「VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？」
            </Link>
            で公開しています。
          </p>
        </section>

        <section id="japan" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            日本版を作るとしたら？— 株温計の 5 要素
          </h2>
          <p className="text-base leading-relaxed">
            残念ながら<strong>「日本版 Fear &amp; Greed Index」は CNN は公開していません</strong>。
            日経新聞や JPX も類似の統合指数は出していないため、日本市場で同じ思想の指数を見たい場合は
            自分で作る必要があります。株温計の{" "}
            <Link href="/glossary#kabuonkei-score" className="underline hover:text-gray-900">
              市場温度スコア
            </Link>
            は、まさに「日本版 Fear &amp; Greed Index」を独自設計したものです。
          </p>

          <p className="text-base leading-relaxed mt-3">
            CNN 米国版とは構成要素を変えています。米国版の 7 要素は<strong>NYSE の高値安値や
            ジャンク債スプレッドなど米国市場固有のデータ</strong>を多く含むため、日本市場ではそのまま
            流用できません。代わりに、日本市場で取得しやすく説明力のあるデータを 5 つ選び、等ウェイトで統合しています。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">要素</th>
                  <th className="px-3 py-2 text-left font-semibold">中身</th>
                  <th className="px-3 py-2 text-left font-semibold">CNN 版での近い要素</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-semibold">C1</td>
                  <td>日経225 の 125 日移動平均との乖離率</td>
                  <td>Market Momentum</td>
                </tr>
                <tr>
                  <td className="font-semibold">C2</td>
                  <td>裁定残バランス（買い残−売り残）</td>
                  <td>Stock Price Breadth に近い需給情報</td>
                </tr>
                <tr>
                  <td className="font-semibold">C3</td>
                  <td>投資主体別売買動向（外国人フロー）</td>
                  <td>Safe Haven Demand に近いリスク選好の方向</td>
                </tr>
                <tr>
                  <td className="font-semibold">C4</td>
                  <td>信用倍率</td>
                  <td>Put/Call 比率に近い「個人投資家のポジション偏り」</td>
                </tr>
                <tr>
                  <td className="font-semibold">C5</td>
                  <td>USDJPY 50 日モメンタム</td>
                  <td>日本固有要素（米国版にはない）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            米国版にあって日本版にないのが<strong>VIX 相当（日経VI）の組み込み</strong>です。
            これは技術的な理由で、Yahoo Finance などの一般データソースから日経VI を継続取得するのが現状難しいためです。
            将来 J-Quants や JPX 公式 API の整備が進めば、日経VI 相当の C6 要素を追加することも検討対象に置いています。
            日経VI そのものの定義は{" "}
            <Link href="/glossary#nikkei-vi" className="underline hover:text-gray-900">
              用語集「日経VI」
            </Link>
            にまとめています。
          </p>
        </section>

        <section id="how-to-use" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            実用上の使いどころ
          </h2>
          <p className="text-base leading-relaxed">
            Fear &amp; Greed Index（および日本版にあたる株温計の温度スコア）の典型的な使い道は次の 3 つです。
          </p>
          <ol className="list-decimal pl-6 mt-3 space-y-2 text-base leading-relaxed">
            <li>
              <strong>極端ゾーン警報</strong>: スコアが 25 以下の「極度の恐怖」、75 以上の「極度の欲望」に入ったら、
              いつもと違う相場局面に入ったサインとして見直す。中間ゾーンでの動きにはあまり反応しない
            </li>
            <li>
              <strong>逆張りの仮説づくり</strong>: 過去データで見ると「極度の恐怖」局面の後は中期で報われたケースが多く、
              「極度の欲望」局面の後はリターンが鈍化しがち。完全に逆張りで動くのは危険ですが、ポジションを傾ける材料には使える
            </li>
            <li>
              <strong>狼狽売りの心理ブレーキ</strong>: 自分が動揺している局面で「いま市場全体も恐怖に振れている」と
              俯瞰できるだけで、感情的な売りを止めやすくなる。これは数値の正確性より「使う習慣」のほうが大事
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3">
            株温計では、極端温度（米国版・日本版それぞれ ≤20 / ≥80）に到達したときに{" "}
            <Link
              href="/alerts"
              className="underline hover:text-gray-900"
            >
              メールアラート
            </Link>
            を送る仕組みも用意しています。「毎日見る必要はないけれど、見落としたくない」用途には便利です。
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
                href="/glossary#fear-greed-index"
                className="underline hover:text-gray-900"
              >
                Fear &amp; Greed Index
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
              {" "}/{" "}
              <Link
                href="/glossary#nikkei-vi"
                className="underline hover:text-gray-900"
              >
                日経VI
              </Link>
            </li>
            <li>
              解説記事:{" "}
              <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
                VIX（恐怖指数）とは？
              </Link>
            </li>
            <li>
              分析記事:{" "}
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？
              </Link>
              {" "}/{" "}
              <Link
                href="/analysis/temperature-divergence"
                className="underline hover:text-gray-900"
              >
                日米温度の乖離が ±20 を超えた日
              </Link>
            </li>
            <li>
              トップ:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                今日の日米市場温度（株温計のトップページ）
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は Fear &amp; Greed Index と類似指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。CNN Fear &amp; Greed Index に関する記述は CNN Business
            の公開資料に基づきますが、計算式の詳細・各要素のウェイトの最終的な根拠は CNN 側で管理されています。
            投資判断はご自身のリスク許容度に応じて行ってください。データ出典: CNN Business「Fear &amp; Greed Index」、Yahoo Finance、JPX。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
