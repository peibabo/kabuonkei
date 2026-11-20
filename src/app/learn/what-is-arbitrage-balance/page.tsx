import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import {
  LearnDataTable,
  learnReturnColorClass,
} from "@/components/learn/ForwardReturnTable";
import { getLearnExtraStats } from "@/lib/learn-extra-stats";
import { formatReturn } from "@/lib/format";

const ARTICLE_PATH = "/learn/what-is-arbitrage-balance";
const ARTICLE_TITLE =
  "裁定残とは？裁定買い残・売り残の意味と SQ 前後で気にすべき理由";
const ARTICLE_DESCRIPTION =
  "裁定残（裁定取引残高）の見方を初心者向けに解説。裁定買い残と裁定売り残の違い、JPX が毎営業日 16:00 に公表する日次データの読み方、メジャー SQ 前後で起きる「裁定解消売り／買い戻し」、株温計の温度スコアで構成要素から外した理由までまとめます。";
const PUBLISHED_AT = "2026-05-08";
const MODIFIED_AT = "2026-11-19";

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
  { href: "#temperature", label: "温度スコアとの関係（株温計で外した理由）" },
  { href: "#where", label: "毎日どこで確認できるか" },
  { href: "#related", label: "関連用語・関連記事" },
];

export default function WhatIsArbitrageBalancePage() {
  const extra = getLearnExtraStats();
  const sq = extra.sqWeeks;
  const none = sq.groups.find((g) => g.label === "SQ のない週");
  const sqGroups = sq.groups.filter((g) => g.label !== "SQ のない週");
  // 「動いた幅は SQ のない週と大差ない」は、どの SQ の週でも動いた幅の平均の差が 0.5 ポイント未満のときだけ書く
  const similarMoves =
    none != null &&
    sqGroups.length > 0 &&
    sqGroups.every((g) => Math.abs(g.avgAbsMove - none.avgAbsMove) < 0.5);
  // 「3% 以上動いた週は SQ の週のほうがやや多い」は、どの SQ の週でも割合が SQ のない週を上回るときだけ書く
  const moreBigMoves =
    none != null && sqGroups.length > 0 && sqGroups.every((g) => g.bigMoveShare > none.bigMoveShare);
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: MODIFIED_AT,
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
          更新: <time dateTime={MODIFIED_AT}>{MODIFIED_AT}</time>
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
              株温計でも以前は温度スコアの構成要素にしていましたが、値がほとんど動かないため 2026 年 11 月に外しました
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
            と読みます。
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

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            SQ の週は本当に荒れるのか（株温計の集計）
          </h3>
          <p className="text-base leading-relaxed">
            「SQ の週は相場が荒れる」とよく言われます。{extra.dataRange.from.slice(0, 4)} 年以降の日経225 で、
            1 週間（前の週の最後の終値からその週の最後の終値まで）の値動きを、SQ のある週とない週に分けて比べました。
            SQ 日は第 2 金曜日（休場なら前の営業日）としています。
          </p>

          <LearnDataTable
            caption={`SQ のある週・ない週の日経225 の値動き（${extra.dataRange.from}〜${extra.dataRange.to}、株温計調べ）`}
          >
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="text-left font-semibold">週の種類</th>
                <th scope="col" className="text-right font-semibold">週数</th>
                <th scope="col" className="text-right font-semibold">動いた幅の平均</th>
                <th scope="col" className="text-right font-semibold">
                  {sq.bigMoveThreshold}% 以上動いた週
                </th>
                <th scope="col" className="text-right font-semibold">騰落率の平均</th>
              </tr>
            </thead>
            <tbody>
              {sq.groups.map((g) => (
                <tr key={g.label}>
                  <th scope="row" className="text-left font-semibold">{g.label}</th>
                  <td className="text-right font-mono text-gray-600">{g.weeks.toLocaleString()}週</td>
                  <td className="text-right font-mono">{g.avgAbsMove.toFixed(1)}%</td>
                  <td className="text-right font-mono">{g.bigMoveShare.toFixed(0)}%</td>
                  <td className="text-right font-mono">
                    <span className={learnReturnColorClass(g.avgReturn)}>
                      {formatReturn(g.avgReturn)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </LearnDataTable>

          <p className="text-base leading-relaxed mt-3">
            {similarMoves && none && (
              <>
                1 週間に動いた幅の平均は、SQ の週が{" "}
                {sqGroups.map((g) => `${g.label.replace(" の週", "")} ${g.avgAbsMove.toFixed(1)}%`).join("・")}、
                SQ のない週が {none.avgAbsMove.toFixed(1)}% と大きな差はありませんでした。
              </>
            )}
            {moreBigMoves && none && (
              <>
                ただし {sq.bigMoveThreshold}% 以上動いた週の割合は、SQ のない週（{none.bigMoveShare.toFixed(0)}%）より
                SQ の週のほうがやや多くなっています。
              </>
            )}
            {similarMoves && (
              <>
                「SQ の週はいつも荒れる」とまでは言えず、ときどき大きく動く週が混ざる、という程度です。
              </>
            )}
            SQ の影響は、その時点で解消される裁定残の量や、先物の持ち高の偏りによって毎回変わります。
            「SQ の週は荒れる」と決めつけず、裁定残の水準と合わせて、その回ごとに見るのが現実的です。
          </p>
          <p className="text-sm leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ 週単位の比較なので、SQ 日当日の寄り付きだけが大きく動くような値動きは表に出ません。
            また日経225 の値動き全体を見ており、裁定残の多い・少ないで分けた集計ではありません（裁定残の長い過去データが手元にないため）。
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
            温度スコアとの関係（株温計で外した理由）
          </h2>
          <p className="text-base leading-relaxed">
            株温計の<strong>日本版「市場温度スコア」</strong>では、2026 年 11 月まで裁定残を構成要素の 1 つにしていました。
            「買い残 ÷（買い残 + 売り残）」を 0〜100 に換算し、買い残優勢なら温度を上げる設計です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ところが近年の日本市場は<strong>裁定売り残が極端に小さく、この比率は 0.93〜1.00 の狭い範囲</strong>でしか動きません。
            2026 年 4〜11 月の運用では、スコアは 4〜6 月と 10 月以降に 77〜100 の高い水準が続き、
            2026 年 11 月 6 日に日経平均が約 6% 下げた日も 79 と高いままでした。
            また裁定残は長期の履歴が手元になく、温度の材料として効いているのかを過去データで確かめることもできませんでした。
          </p>
          <p className="text-base leading-relaxed mt-3">
            そこで現在は、<strong>市場温度を日経225 の 125 日移動平均乖離だけで決め</strong>、裁定残は温度に含めていません。
            裁定残そのものは SQ 前後の需給を読む材料として有用なので、トップページの日本市場データでは引き続き直近水準と推移を表示しています。
            ゲージの下の需給の欄には、海外投資家フローと信用買い残の増減の 2 つを数字のまま出しています。
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
              <strong>株温計のトップページ</strong>: 日本市場データセクションで裁定残バランスの直近水準と推移を可視化
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
