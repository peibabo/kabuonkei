import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/when-to-buy-stocks";
const ARTICLE_TITLE =
  "株の買い時はいつ？過熱感・底値の見極め方を指標から整理（まとめ）";
const ARTICLE_DESCRIPTION =
  "「株の買い時はいつ？」に 1 つの指標で答えは出ません。センチメント（VIX・Fear&Greed・日経VI）・需給（信用倍率・投資主体別・裁定残・騰落レシオ）・リスク（ドローダウン）・マクロ（ドル円）の 4 カテゴリで過熱感と底値圏を見極める考え方を、各指標の解説記事と株温計の市場温度スコアへの導線つきで整理します。";
const PUBLISHED_AT = "2026-06-18";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "株 買い時",
    "株価 底値 見極め",
    "暴落 買い場",
    "株 いつ買う",
    "過熱感 指標",
    "底値圏 サイン",
    "市場温度",
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
  { href: "#one-trap", label: "「1 指標で買い時が分かる」の罠" },
  { href: "#sentiment", label: "① センチメント（投資家心理）で見る" },
  { href: "#supply-demand", label: "② 需給（買われすぎ・売られすぎ）で見る" },
  { href: "#risk", label: "③ リスク（どこまで下がりうるか）で見る" },
  { href: "#macro", label: "④ マクロ（為替）で見る" },
  { href: "#practical", label: "実践：複数を重ねて温度感で掴む" },
  { href: "#caveats", label: "買い時は「点」ではなく「幅」" },
  { href: "#related", label: "関連用語・関連記事" },
];

interface IndicatorLink {
  href: string;
  label: string;
  desc: string;
}

const SENTIMENT: IndicatorLink[] = [
  {
    href: "/learn/what-is-vix",
    label: "VIX（恐怖指数）",
    desc: "S&P500 の予想変動率。急騰は不安のピーク＝底が近いサインにも",
  },
  {
    href: "/learn/what-is-fear-greed",
    label: "Fear & Greed Index",
    desc: "米国株のセンチメントを 0〜100 で表す。極度の恐怖は逆張りの目安",
  },
  {
    href: "/learn/what-is-nikkei-vi",
    label: "日経VI",
    desc: "VIX の日本版。日本市場固有の不安が高まっているかを見る",
  },
];

const SUPPLY_DEMAND: IndicatorLink[] = [
  {
    href: "/learn/what-is-margin-ratio",
    label: "信用倍率",
    desc: "信用買い残÷売り残。買い偏重は将来の売り圧力＝過熱の目安",
  },
  {
    href: "/learn/what-is-investor-flow",
    label: "投資部門別売買動向",
    desc: "市場の主役・外国人フローの方向。買越/売越で地合いを読む",
  },
  {
    href: "/learn/what-is-arbitrage-balance",
    label: "裁定残",
    desc: "先物絡みの需給。SQ 前後の解消売り・買い戻しに注意",
  },
  {
    href: "/learn/what-is-advance-decline-ratio",
    label: "騰落レシオ",
    desc: "値上がり÷値下がり銘柄数。120 超で過熱、70 割れで底値圏の目安",
  },
];

const RISK: IndicatorLink[] = [
  {
    href: "/learn/what-is-drawdown",
    label: "ドローダウン（最大DD）",
    desc: "高値からどこまで下がりうるか。狼狽売りを防ぐ心構えの軸",
  },
];

const MACRO: IndicatorLink[] = [
  {
    href: "/learn/what-is-usdjpy-momentum",
    label: "円安・円高と株価（ドル円モメンタム）",
    desc: "為替の勢い。リスクオフでは円高＋株安が同時に進むことも",
  },
];

function IndicatorList({ items }: { items: IndicatorLink[] }) {
  return (
    <ul className="list-none pl-0 mt-3 space-y-2 not-prose">
      {items.map((it) => (
        <li
          key={it.href}
          className="border border-gray-200 rounded-lg p-3 hover:border-gray-400 hover:bg-gray-50 transition-colors"
        >
          <Link href={it.href} className="block">
            <span className="font-semibold text-gray-900 underline">
              {it.label}
            </span>
            <span className="block text-sm text-gray-600 mt-1 leading-relaxed">
              {it.desc}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function WhenToBuyStocksPage() {
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
    { name: "株の買い時はいつ？" },
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
          各指標の用語定義は{" "}
          <Link href="/glossary" className="underline hover:text-gray-700">
            用語集
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
              <strong>「株の買い時」を 1 つの指標で当てることはできません</strong>。
              できるのは「今が過熱気味か、冷え込み気味か」という<strong>温度感を掴む</strong>ことまで
            </li>
            <li>
              見るべき角度は大きく 4 つ:{" "}
              <strong>①センチメント ②需給 ③リスク ④マクロ（為替）</strong>。
              それぞれに代表的な指標があり、複数が同じ方向を指すほど確度が上がる
            </li>
            <li>
              <strong>底値圏ほど指標は「悲観一色」になりやすい</strong>。恐怖がピークのときこそ、
              逆張りの好機が潜んでいることが多い（ただし「落ちるナイフ」には注意）
            </li>
            <li>
              株温計の{" "}
              <Link href="/" className="underline hover:text-gray-900">
                市場温度スコア
              </Link>
              は、これら複数の需給・センチメント・マクロ要素を <strong>1 つの 0〜100 の温度</strong>に束ねた指標。
              「今は熱い？冷たい？」を一目で掴むための出発点として使える
            </li>
          </ul>
        </section>

        <section id="one-trap" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            「1 指標で買い時が分かる」の罠
          </h2>
          <p className="text-base leading-relaxed">
            「○○が△△になったら買い」というシンプルなルールは魅力的ですが、
            <strong>どの単独指標も万能ではありません</strong>。VIX が高いからといってすぐ反発するとは限らず、
            騰落レシオが過熱を示しても上昇相場ではしばらく上がり続けることがあります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            指標にできるのは、未来の株価を当てることではなく、
            <strong>「今の相場が過熱しているか、冷え込んでいるか」という温度感を測る</strong>ことです。
            だからこそ、性質の異なる複数の角度から眺めて「だいたい今はこういう局面だ」と捉えるのが現実的なアプローチになります。
            以下、4 つのカテゴリに分けて代表的な指標を整理します。
          </p>
        </section>

        <section id="sentiment" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ① センチメント（投資家心理）で見る
          </h2>
          <p className="text-base leading-relaxed">
            投資家が今どれだけ不安／強気かを測る角度です。
            <strong>恐怖が極まったときほど底が近い</strong>——という逆張りの発想と相性がよいカテゴリです。
          </p>
          <IndicatorList items={SENTIMENT} />
        </section>

        <section id="supply-demand" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ② 需給（買われすぎ・売られすぎ）で見る
          </h2>
          <p className="text-base leading-relaxed">
            「誰がどれだけ買って／売っているか」という需給の偏りを見る角度です。
            買いが積み上がりすぎていれば将来の売り圧力に、売られすぎていれば反発余地に注目します。
          </p>
          <IndicatorList items={SUPPLY_DEMAND} />
        </section>

        <section id="risk" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ③ リスク（どこまで下がりうるか）で見る
          </h2>
          <p className="text-base leading-relaxed">
            「買い時」を考えるうえで見落とされがちですが、
            <strong>「想定される下落の深さ」を知っておくこと</strong>は狼狽売りを防ぐ土台になります。
            底値を完璧に当てられなくても、「ここから最大どれくらい下がりうるか」を把握していれば、
            途中の下落に耐えて買い増す判断がしやすくなります。
          </p>
          <IndicatorList items={RISK} />
        </section>

        <section id="macro" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ④ マクロ（為替）で見る
          </h2>
          <p className="text-base leading-relaxed">
            とくに日本株では、為替（ドル円）が業績見通しと投資家心理の両面に効きます。
            平常時は「円安＝株高」が基本線ですが、<strong>リスクオフ局面では「円高＋株安」が同時に進む</strong>点が重要です。
          </p>
          <IndicatorList items={MACRO} />
        </section>

        <section id="practical" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            実践：複数を重ねて温度感で掴む
          </h2>
          <p className="text-base leading-relaxed">
            4 カテゴリの指標を毎回ひとつずつチェックするのは大変です。そこで株温計は、
            <strong>日本市場の需給・センチメント・マクロ要素を 1 つの 0〜100 の「市場温度スコア」に束ねて</strong>表示しています。
            日経225 の移動平均乖離率・裁定残・海外勢フロー・信用倍率・ドル円モメンタムを等ウェイトで合成した指標です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            使い方はシンプルです。<strong>温度が低い（冷たい）＝悲観が強い局面</strong>、
            <strong>温度が高い（熱い）＝楽観が強い局面</strong>。
            「冷えているときに少しずつ買い、熱すぎるときは慎重になる」という逆張りの土台として眺めます。
            今日の日米の温度は{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページの市場温度ゲージ
            </Link>
            で確認できます。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm leading-relaxed">
              💡 <strong>過去の似た局面も参考に</strong>: 株温計は、現在の温度に近かった過去日とその後のリターンを並べる{" "}
              <Link href="/glossary#similar-days" className="underline hover:text-gray-900">
                類似日機能
              </Link>
              や、温度に連動して株/現金配分を動かす{" "}
              <Link href="/portfolio" className="underline hover:text-gray-900">
                バーチャルポートフォリオ検証
              </Link>
              も公開しています。後者では「温度信号はリターン向上より<strong>最大DD 抑制</strong>に効いた」という正直な結果も開示しています。
            </p>
          </div>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            買い時は「点」ではなく「幅」
          </h2>
          <p className="text-base leading-relaxed">
            最後に、いちばん大事な心構えです。<strong>底値をピンポイントで当てようとしない</strong>こと。
            プロでも「いちばん安い 1 日」を狙うのは至難で、狙うほど機会を逃しがちです。
          </p>
          <p className="text-base leading-relaxed mt-3">
            現実的なのは、<strong>「冷え込んでいる局面で、何回かに分けて買う」</strong>という考え方です。
            一定額を定期的に買い続ける{" "}
            <Link href="/glossary#dca" className="underline hover:text-gray-900">
              DCA（ドルコスト平均法）
            </Link>
            はその代表で、買い時の判断を「点」から「幅」に変えてくれます。
            指標や温度は、その<strong>「買うペースを少し速める／緩める」ための補助線</strong>として使うのが、無理がなく続けやすい付き合い方です。
          </p>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ 本記事は指標の読み方の整理であり、特定の売買タイミングを推奨するものではありません。
            指標が示すのは確率の偏りであって確実な未来ではない、という前提を忘れずに。
          </p>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              指標の定義をまとめて見る:{" "}
              <Link href="/glossary" className="underline hover:text-gray-900">
                用語集
              </Link>
            </li>
            <li>
              独自データでの検証記事:{" "}
              <Link href="/analysis" className="underline hover:text-gray-900">
                分析記事インデックス
              </Link>
              （VIX 水準別・信用倍率 × 温度・日米温度乖離）
            </li>
            <li>
              投資スタイル別の読み方:{" "}
              <Link href="/guide" className="underline hover:text-gray-900">
                投資家タイプ別ガイド
              </Link>
              （NISA 積立 / 短期トレード / FIRE 長期）
            </li>
            <li>
              温度連動の検証:{" "}
              <Link href="/portfolio" className="underline hover:text-gray-900">
                温度連動バーチャルポートフォリオ
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は株式の買い時を見極める際の指標の読み方を整理した解説記事であり、
            特定の金融商品の売買や売買タイミングを推奨するものではありません。
            各指標が示すのは過去の傾向・確率の偏りであり、将来の相場や個別の投資成果を保証するものではありません。
            投資判断はご自身のリスク許容度に応じて行ってください。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
