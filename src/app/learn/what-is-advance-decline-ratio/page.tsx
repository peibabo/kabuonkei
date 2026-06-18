import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-advance-decline-ratio";
const ARTICLE_TITLE =
  "騰落レシオとは？水準別の意味と過熱・底値圏の見方を初心者向けに解説";
const ARTICLE_DESCRIPTION =
  "騰落レシオ（値上がり銘柄数 ÷ 値下がり銘柄数）の意味、25 日移動平均の計算方法、「120 超え＝過熱／70 割れ＝底値圏」という水準別の目安、だましシグナルへの注意、株温計の市場温度スコアとの関係を初心者向けに解説します。";
const PUBLISHED_AT = "2026-06-18";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "騰落レシオ とは",
    "騰落レシオ 120",
    "騰落レシオ 70",
    "騰落レシオ 見方",
    "値上がり銘柄数",
    "過熱感",
    "売られすぎ",
    "底値圏",
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
  { href: "#what", label: "騰落レシオとは" },
  { href: "#calc", label: "計算式と算出方法" },
  { href: "#levels", label: "水準別の意味（過熱・中立・底値圏）" },
  { href: "#caveats", label: "使うときの 3 つの注意点" },
  { href: "#kabuonkei", label: "株温計の市場温度スコアとの関係" },
  { href: "#related", label: "関連用語・関連記事" },
];

const LEVELS = [
  {
    band: "130 以上",
    label: "過熱・買われすぎ",
    color: "text-red-700",
    note: "短期的な反落・調整に警戒する目安。上昇の勢いが強すぎる局面",
  },
  {
    band: "120 前後",
    label: "やや過熱",
    color: "text-orange-600",
    note: "古くから「警戒ライン」として最もよく語られる水準",
  },
  {
    band: "100 前後",
    label: "中立",
    color: "text-gray-600",
    note: "値上がり銘柄数と値下がり銘柄数がほぼ拮抗している状態",
  },
  {
    band: "80 以下",
    label: "売られすぎ",
    color: "text-blue-600",
    note: "反発が近いとされる目安。下げの勢いが一巡しつつある局面",
  },
  {
    band: "70 以下",
    label: "底値圏のサイン",
    color: "text-blue-800",
    note: "過去の大底（暴落の谷）付近で観測されやすい。逆張りの一材料",
  },
];

export default function WhatIsAdvanceDeclineRatioPage() {
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
    { name: "騰落レシオとは" },
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
            href="/glossary#advance-decline-ratio"
            className="underline hover:text-gray-700"
          >
            用語集「騰落レシオ」
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
              <strong>騰落レシオ</strong> = 値上がり銘柄数 ÷ 値下がり銘柄数 ×
              100。市場全体の「買われすぎ／売られすぎ」を測る代表的な需給・過熱感指標。通常は
              <strong>25 日移動平均</strong>で見る
            </li>
            <li>
              ざっくりの目安は<strong>120 超えで過熱・警戒、100 前後で中立、70 割れで売られすぎ・底値圏</strong>。
              逆張りの一材料として古くから使われてきた
            </li>
            <li>
              ただし<strong>強い上昇トレンドでは 120 超えが続いても上がり続ける</strong>こともあり、
              単独で売買を判断する指標ではない。「過熱・冷え込みの温度感」を掴む補助線として使うのが現実的
            </li>
            <li>
              株温計の{" "}
              <Link
                href="/glossary#kabuonkei-score"
                className="underline hover:text-gray-900"
              >
                市場温度スコア
              </Link>
              は騰落レシオを直接の構成要素にはしていないが、
              <strong>過熱感を測るという狙いは共通</strong>。複数のセンチメント指標を重ねて見ると判断がブレにくくなる
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            騰落レシオとは
          </h2>
          <p className="text-base leading-relaxed">
            <strong>騰落レシオ（とうらくレシオ）</strong>は、ある市場で
            <strong>値上がりした銘柄の数と値下がりした銘柄の数の比率</strong>を見て、
            相場全体が買われすぎか売られすぎかを測る指標です。英語では advance-decline ratio と呼ばれます。
          </p>
          <p className="text-base leading-relaxed mt-3">
            個別銘柄の株価ではなく<strong>「上がった銘柄と下がった銘柄の数」</strong>に注目するのがポイントです。
            指数（日経平均など）は値がさ株の影響を受けやすい一方、騰落レシオは
            <strong>市場の幅（マーケット・ブレッド）</strong>——つまり「多くの銘柄が買われているのか、一部だけが買われているのか」——を映します。
            東証プライム（旧東証一部）全銘柄を対象に計算されるのが一般的です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            値上がり銘柄が多ければレシオは 100 を超えて上昇し、値下がり銘柄が多ければ 100 を下回ります。
            この「100 を中立とした行き過ぎ」を眺めることで、相場の過熱感や底入れの気配を読み取ろうとするのが基本的な使い方です。
          </p>
        </section>

        <section id="calc" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            計算式と算出方法
          </h2>
          <p className="text-base leading-relaxed">
            計算式はシンプルです。一定期間の値上がり銘柄数の合計を{" "}
            <code>U</code>、値下がり銘柄数の合計を <code>D</code> とすると、
          </p>
          <p className="text-base leading-relaxed mt-2 text-center bg-gray-50 border border-gray-200 rounded-lg p-3 not-prose">
            <strong>騰落レシオ = U ÷ D × 100（%）</strong>
          </p>
          <p className="text-base leading-relaxed mt-3">
            1 日だけの値上がり／値下がり銘柄数で計算するとブレが大きすぎるため、実務では
            <strong>直近 25 営業日（約 1 ヶ月）の合計</strong>で割り算する
            <strong>「25 日騰落レシオ」</strong>が最も一般的に使われます。
            ニュースやマーケット欄で単に「騰落レシオ」と言うときは、ほぼこの 25 日版を指します。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ほかに 5 日・10 日・6 日といった短期版もありますが、期間が短いほど敏感に振れ、長いほどなだらかになります。
            まずは標準的な 25 日版で水準感を掴むのがおすすめです。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm leading-relaxed">
              💡 <strong>計算例</strong>: 直近 25 日間の値上がり銘柄数の合計が 24,000、値下がり銘柄数の合計が 20,000 だった場合、
              騰落レシオ = 24,000 ÷ 20,000 × 100 = <strong>120</strong>。値上がりが値下がりの 1.2 倍あった、という意味になります。
            </p>
          </div>
        </section>

        <section id="levels" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            水準別の意味（過熱・中立・底値圏）
          </h2>
          <p className="text-base leading-relaxed">
            25 日騰落レシオでよく語られる目安は以下のとおりです。あくまで<strong>伝統的な経験則</strong>で、
            厳密な閾値ではない点に注意してください。
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
          <p className="text-base leading-relaxed mt-3">
            実務でよく言われるのは<strong>「120 を超えたら過熱を疑い、70 を割ったら底入れを意識する」</strong>という非対称な見方です。
            天井圏では 120〜130 前後で頭打ちになりやすい一方、底値圏では<strong>パニック売りで 70・60 台まで急低下</strong>することがあり、
            「売られすぎ」のほうがシグナルとして分かりやすいと語られることが多い指標です。
          </p>
          <p className="text-base leading-relaxed mt-3 text-gray-600">
            ※ 株温計はこの指標を独自にバックテストした検証データを持たないため、本記事では具体的な「○○のとき勝率△%」といった集計値は提示しません。
            数値検証が必要な場面では、VIX・信用倍率など株温計が独自データを持つ指標の{" "}
            <Link href="/analysis" className="underline hover:text-gray-900">
              分析記事
            </Link>
            を参照してください。
          </p>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            使うときの 3 つの注意点
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>強いトレンドでは「過熱」が続く</strong>: 上昇相場の初動では 120 超えがしばらく続くことも珍しくありません。
              「120 を超えたから売り」と機械的に逆張りすると、上昇相場の大部分を取り逃すリスクがあります。
              <strong>トレンドの強さとセットで読む</strong>必要があります
            </li>
            <li>
              <strong>「だまし」シグナルがある</strong>: 一時的に 70 を割っても、そのまま下げ続ける（ナイフが落ち続ける）こともあります。
              騰落レシオの底打ちは「反発のきっかけになりやすい目安」であって、<strong>底を保証するものではありません</strong>。
              価格や出来高の反転確認と合わせるのが安全です
            </li>
            <li>
              <strong>市場・期間で水準感が変わる</strong>: 対象とする市場（プライム全体か、特定指数の構成銘柄か）や、
              25 日・10 日などの期間で数字の振れ方が変わります。<strong>同じ条件・同じ系列で時系列比較する</strong>ことが大切です
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ 騰落レシオは「相場の幅（ブレッド）」を見る指標であり、<strong>単独で売買タイミングを決める道具ではありません</strong>。
            VIX・信用倍率・投資主体別フローなど、性質の異なる指標を重ねて初めて「過熱・冷え込みの確からしさ」が高まります。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            株温計の市場温度スコアとの関係
          </h2>
          <p className="text-base leading-relaxed">
            株温計の{" "}
            <Link
              href="/glossary#kabuonkei-score"
              className="underline hover:text-gray-900"
            >
              市場温度スコア（日本版）
            </Link>
            は、C1（日経225 の移動平均乖離率）・C2（裁定残）・C3（海外勢フロー）・C4（信用倍率）・C5（ドル円モメンタム）の
            5 要素から算出しており、<strong>騰落レシオは現状の構成要素には含まれていません</strong>。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ただし、騰落レシオと市場温度スコアは<strong>「相場の過熱／冷え込みを 1 つの数字で掴む」という狙いが共通</strong>しています。
            騰落レシオが市場の<strong>幅（ブレッド）</strong>に注目するのに対し、市場温度スコアは
            <strong>需給・センチメント・マクロを横断的に</strong>束ねている、という役割の違いがあります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            実用上は、<strong>「騰落レシオが過熱を示し、かつ市場温度スコアも高い」</strong>といったように、
            異なる角度の指標が同じ方向を指したときほど判断の確度が上がります。逆に両者が食い違うときは「まだ方向感が定まっていない」と捉え、
            慎重になる材料として使えます。今日の温度は{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの市場温度ゲージ
            </Link>
            で確認できます。
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
                href="/glossary#advance-decline-ratio"
                className="underline hover:text-gray-900"
              >
                騰落レシオ
              </Link>
              {" "}/{" "}
              <Link href="/glossary#margin-ratio" className="underline hover:text-gray-900">
                信用倍率
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
              関連する需給・センチメント解説:{" "}
              <Link
                href="/learn/what-is-margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率とは？
              </Link>
              {" "}/{" "}
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
              独自データでの検証記事:{" "}
              <Link href="/analysis" className="underline hover:text-gray-900">
                分析記事インデックス
              </Link>
              （VIX・信用倍率・日米温度乖離の過去検証）
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は騰落レシオという需給・過熱感指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。記載している水準の目安は伝統的に語られてきた経験則であり、
            将来の相場や個別の投資成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
