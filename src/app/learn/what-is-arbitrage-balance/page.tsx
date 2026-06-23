import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/learn/what-is-arbitrage-balance";
const ARTICLE_TITLE =
  "裁定残とは？裁定買い残・売り残の意味と SQ 前後で気にすべき理由";
const ARTICLE_DESCRIPTION =
  "裁定残（裁定取引残高）の見方を初心者向けに解説。裁定買い残と裁定売り残の違い、JPX が毎営業日 16:00 に公表する日次データの読み方、メジャー SQ 前後で起きる「裁定解消売り／買い戻し」、株温計の温度スコア C4 要素としての扱いまでまとめます。";
const PUBLISHED_AT = "2026-05-08";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "裁定残 とは",
    "裁定買い残",
    "裁定売り残",
    "裁定取引",
    "JPX 裁定残",
    "SQ 解消売り",
    "メジャーSQ",
    "需給",
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
  { href: "#what", label: "裁定取引と裁定残" },
  { href: "#two-balances", label: "裁定買い残と裁定売り残の違い" },
  { href: "#sq", label: "SQ 前後で何が起きるか" },
  { href: "#how-to-read", label: "読み方のコツ 4 つ" },
  { href: "#temperature", label: "温度スコアとの関係（株温計 C4 要素）" },
  { href: "#where", label: "毎日どこで確認できるか" },
  { href: "#related", label: "関連用語・関連記事" },
];

export default function WhatIsArbitrageBalancePage() {
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
    { name: "裁定残とは" },
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
            href="/glossary#arbitrage-balance"
            className="underline hover:text-gray-700"
          >
            用語集「裁定残」
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
              <strong>裁定残</strong> = 現物株と先物の価格差を狙う「裁定取引」のうち、まだ反対売買で解消されていない
              現物ポジションの残高。<strong>裁定買い残</strong>と<strong>裁定売り残</strong>の 2 種類があります
            </li>
            <li>
              JPX が<strong>毎営業日 16:00</strong>に T+2 ベース（2 営業日前のデータ）で公表する日次指標。
              週次まとめも公表されます
            </li>
            <li>
              年 4 回（3 / 6 / 9 / 12 月の第 2 金曜日）の<strong>メジャー SQ</strong>前に、
              積み上がった裁定買い残が<strong>「解消売り」</strong>として現物売り圧力に転化することがあります。
              SQ 前後の値動きを読む素材として使われる
            </li>
            <li>
              ただし<strong>絶対水準だけでは判断材料にならない</strong>のが実情。
              株温計では裁定残バランスを温度スコアの C4 要素として、他 4 要素と合わせて統合しています
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            裁定取引と裁定残
          </h2>
          <p className="text-base leading-relaxed">
            <strong>裁定取引（アービトラージ）</strong>とは、本来同じ価値を持つ 2 つの資産の間に
            価格差が生じたとき、その差を利益として取る取引手法のことです。
            日経225 を例にすると、<strong>現物株（日経225 採用銘柄のバスケット）</strong>と
            <strong>日経225 先物</strong>の間にしばしば一時的な価格差が出ます。
            理論的には限月までの金利分だけ先物が現物より高くつくはず（ベーシス）ですが、
            需給で歪みが生まれる瞬間を狙って、機関投資家や証券会社が裁定ポジションを組みます。
          </p>
          <p className="text-base leading-relaxed mt-3">
            裁定取引には 2 通りあります:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1 text-base leading-relaxed">
            <li>
              <strong>順張り裁定（先物売り・現物買い）</strong>: 先物が現物より割高なときに、
              先物を売って現物を買う。両方を保有していれば価格差が縮まったところで利益確定できる
            </li>
            <li>
              <strong>逆張り裁定（先物買い・現物売り）</strong>: 先物が現物より割安なとき、その逆
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            <strong>裁定残</strong>は、これらのうち<strong>「まだ反対売買で解消されていない現物ポジションの残高」</strong>を指します。
            「先物売り・現物買い」を組んで、現物だけまだ持っているポジションが累積した数字が<strong>裁定買い残</strong>。
            「先物買い・現物売り」を組んで、現物だけまだ売っている分が<strong>裁定売り残</strong>。
            どちらも<strong>JPX が二市場合算で毎営業日 16:00 に公表</strong>します（T+2、つまり 2 営業日前のデータ）。
          </p>
        </section>

        <section id="two-balances" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            裁定買い残と裁定売り残の違い
          </h2>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">項目</th>
                  <th className="px-3 py-2 text-left font-semibold">裁定買い残</th>
                  <th className="px-3 py-2 text-left font-semibold">裁定売り残</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                <tr>
                  <td className="font-semibold whitespace-nowrap">組み方</td>
                  <td>先物売り・現物買い</td>
                  <td>先物買い・現物売り</td>
                </tr>
                <tr>
                  <td className="font-semibold whitespace-nowrap">解消の方向</td>
                  <td>先物買戻し・現物売り（= 現物売り圧力）</td>
                  <td>先物売り・現物買い戻し（= 現物買い圧力）</td>
                </tr>
                <tr>
                  <td className="font-semibold whitespace-nowrap">積み上がる局面</td>
                  <td>強気相場で先物がベーシスより上振れしたとき</td>
                  <td>弱気相場で先物が現物より割安に沈んだとき</td>
                </tr>
                <tr>
                  <td className="font-semibold whitespace-nowrap">水準感</td>
                  <td>歴史的には数千億円〜数兆円のレンジ</td>
                  <td>数百億〜数千億円。買い残より絶対値は小さい傾向</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            実務的には<strong>「買い残 − 売り残」</strong>を「裁定残バランス」として見ることが多く、
            このバランスが大きくプラス（買い残優勢）なら現物売り圧力、大きくマイナスなら現物買い圧力が積み上がっている、
            と読みます。<strong>株温計の C4 要素はこの「バランス」をスコア化</strong>しています。
          </p>
        </section>

        <section id="sq" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            SQ 前後で何が起きるか
          </h2>
          <p className="text-base leading-relaxed">
            裁定残が市場で最も意識される瞬間が<strong>SQ（特別清算指数）日</strong>の前後です。
            日経225 先物・オプションの取引には満期日があり、満期になったポジションは現金決済か反対売買で消える必要があります。
            この満期日が SQ 日です。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2 text-base leading-relaxed">
            <li>
              <strong>メジャー SQ</strong>: 3 / 6 / 9 / 12 月の<strong>第 2 金曜日</strong>。
              日経225 先物 + 個別株オプション + 日経225 オプションが同時に満期を迎える、市場最大の節目
            </li>
            <li>
              <strong>マイナー SQ</strong>: メジャー SQ 以外の月の第 2 金曜日。日経225 オプション＋個別株オプションのみが満期
            </li>
          </ul>

          <p className="text-base leading-relaxed mt-3">
            メジャー SQ 前に裁定買い残が積み上がっていると、
            <strong>「先物買戻し ＋ 現物売り」の解消売り</strong>が SQ に向けて出やすくなります。
            これがいわゆる「<strong>裁定解消売り</strong>」と呼ばれる現象で、
            SQ 直前の現物相場に下押し圧力をかける場合があります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ただし、<strong>解消売りが必ず出るとは限らない</strong>のもポイント。
            裁定ポジションは限月をロールオーバー（次の限月に乗り換え）して維持されることもあるため、
            残高が高いから即「下落要因」と単純化するのは正確ではありません。
            「下落要因として意識される<strong>可能性</strong>のあるストック量」として捉えるのが正確です。
          </p>
        </section>

        <section id="how-to-read" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            読み方のコツ 4 つ
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>絶対水準より「変化の方向」を見る</strong>: 裁定買い残の歴史的水準（数兆円規模）は時代によって動くので、
              「○ 兆円超えたら危険」という絶対閾値は当てにならない。
              <strong>「直近数週間でどちらに増えているか」のトレンドが大事</strong>
            </li>
            <li>
              <strong>SQ までの残営業日数とセットで見る</strong>: 同じ買い残水準でも、SQ まで 1 週間の局面と
              1 ヶ月以上ある局面では意味が変わる。SQ 直前の高水準ほど解消売りリスクとして意識される
            </li>
            <li>
              <strong>T+2 のタイムラグを意識する</strong>: 16:00 に公表されるのは 2 営業日前のデータ。
              急変相場ではこの時差で相場の現状とズレることがあります
            </li>
            <li>
              <strong>他の需給指標と組み合わせる</strong>:{" "}
              <Link
                href="/learn/what-is-margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率
              </Link>
              、{" "}
              <Link
                href="/learn/what-is-investor-flow"
                className="underline hover:text-gray-900"
              >
                投資部門別売買動向
              </Link>
              と合わせて見ると、需給の全体像（個人 / 外国人 / 自己ポジション）を立体的に捉えられる
            </li>
          </ol>
        </section>

        <section id="temperature" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            温度スコアとの関係（株温計 C4 要素）
          </h2>
          <p className="text-base leading-relaxed">
            株温計の<strong>日本版「市場温度スコア」</strong>では、
            裁定残のバランス（買い残 − 売り残）を<strong>C4 要素</strong>として組み込んでいます。
            裁定買い残優勢が長期分布の中で高水準なら<strong>「過熱（熱い）」側に温度を引き上げる</strong>、
            裁定売り残優勢が高水準なら<strong>「冷え込み（冷たい）」側に引き下げる</strong>方向に働きます。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">要素</th>
                  <th className="px-3 py-2 text-left font-semibold">中身</th>
                  <th className="px-3 py-2 text-left font-semibold">主に捉える主体</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-semibold">C1</td>
                  <td>日経225 の 125 日移動平均との乖離率</td>
                  <td>結果としての株価</td>
                </tr>
                <tr>
                  <td className="font-semibold">C2</td>
                  <td>投資主体別売買動向（外国人フロー）</td>
                  <td>海外投資家</td>
                </tr>
                <tr>
                  <td className="font-semibold">C3</td>
                  <td>信用倍率</td>
                  <td>個人投資家</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="font-semibold">C4</td>
                  <td>裁定残バランス</td>
                  <td>本記事の主題（証券会社・機関投資家の自己ポジション）</td>
                </tr>
                <tr>
                  <td className="font-semibold">C5</td>
                  <td>USDJPY 50 日モメンタム</td>
                  <td>マクロ要因（為替）</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            注目したいのは、<strong>C4（裁定残）/ C2（外国人）/ C3（信用倍率）</strong>がそれぞれ
            <strong>異なる主体（自己 / 外国人 / 個人）の動き</strong>を別個に拾っている設計です。
            裁定残単独だと SQ 前後のノイズに振り回されがちですが、
            5 要素の等ウェイト平均で統合することでノイズを相殺し、より安定した「市場の温度」として読めるようにしています。
          </p>
        </section>

        <section id="where" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            毎日どこで確認できるか
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong>JPX 公式</strong>:{" "}
              <a
                href="https://www.jpx.co.jp/markets/statistics-equities/program/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-900"
              >
                プログラム売買・裁定取引
              </a>
              {" "}— 日次データは毎営業日 16:00 に CSV / PDF で公表される一次情報源
            </li>
            <li>
              <strong>大手証券・トレーダーズウェブ等</strong>: 日次推移をグラフ化した二次情報。
              SQ までの残営業日と一緒に見ると分かりやすい
            </li>
            <li>
              <strong>株温計のトップページ</strong>: 日本市場データセクションで裁定残バランスの直近水準と推移を可視化。
              温度スコアの C4 要素として既に組み込まれた数値も毎日反映
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            毎日数字を追う必要はありません。<strong>メジャー SQ の 1 週間前から SQ 当日まで</strong>と、
            <strong>株価が大きく動いた直後</strong>に確認するくらいの頻度で十分。
            極端温度時の通知は{" "}
            <Link href="/alerts" className="underline hover:text-gray-900">
              温度メールアラート
            </Link>
            （温度スコア ≤20 / ≥80 で通知）でカバーできます。
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
                href="/glossary#arbitrage-balance"
                className="underline hover:text-gray-900"
              >
                裁定残
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#investor-type-trading"
                className="underline hover:text-gray-900"
              >
                投資主体別売買動向
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
              解説記事（需給三部作）:{" "}
              <Link
                href="/learn/what-is-margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率とは？
              </Link>
              {" "}/{" "}
              <Link
                href="/learn/what-is-investor-flow"
                className="underline hover:text-gray-900"
              >
                投資部門別売買動向とは？
              </Link>
            </li>
            <li>
              センチメント解説:{" "}
              <Link
                href="/learn/what-is-fear-greed"
                className="underline hover:text-gray-900"
              >
                Fear &amp; Greed Index とは？
              </Link>
              {" "}/{" "}
              <Link href="/learn/what-is-vix" className="underline hover:text-gray-900">
                VIX（恐怖指数）とは？
              </Link>
            </li>
            <li>
              トップ:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                今日の市場温度・裁定残バランスを確認する
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は裁定残という指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。記述している水準感や経験則は過去データの集計および市場の慣習であり、
            将来の運用成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。
            データ出典: 日本取引所グループ（JPX）「プログラム売買・裁定取引」。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
