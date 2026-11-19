import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import {
  getNikkeiCrashAnalysis,
  NIKKEI_CRASH_ARTICLE,
} from "@/lib/nikkei-crash-analysis";
import { formatReturn } from "@/lib/format";
import { LearnDataTable } from "@/components/learn/ForwardReturnTable";

const ARTICLE_PATH = "/learn/what-is-drawdown";
const ARTICLE_TITLE =
  "ドローダウンとは？最大DDの意味と「リターンより怖い」理由を初心者向けに解説";
const ARTICLE_DESCRIPTION =
  "ドローダウン (DD) と最大ドローダウンの意味、計算式、過去の S&P500・日経225 のDD実績、なぜリターンより最大DDが投資判断で重要かを解説。株温計のバーチャルポートフォリオによる「温度信号は最大DDを浅くしたのか」の正直な検証結果との接続もまとめます。";
const PUBLISHED_AT = "2026-05-08";
const MODIFIED_AT = "2026-11-19";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "ドローダウン とは",
    "最大ドローダウン",
    "Max DD",
    "ドローダウン 計算",
    "リスク指標",
    "S&P500 暴落",
    "株温計",
    "バックテスト",
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
  { href: "#what", label: "ドローダウンとは" },
  { href: "#calc", label: "計算式と読み方" },
  { href: "#why", label: "なぜ最大DDが「リターンより怖い」のか" },
  { href: "#history", label: "S&P500・日経225 の歴史的DD" },
  { href: "#kabuonkei", label: "株温計のDD検証" },
  { href: "#how-to-mitigate", label: "DDを抑える 4 つの実用アプローチ" },
  { href: "#related", label: "関連用語・関連記事" },
];

const SP500_DRAWDOWNS = [
  {
    period: "2007-10 → 2009-03（リーマンショック）",
    dd: "-56.8 %",
    note: "戦後最大級。回復には約 5 年半",
  },
  {
    period: "2020-02 → 2020-03（コロナショック）",
    dd: "-34 %",
    note: "32 日間で底に到達した史上最速の弱気相場",
  },
  {
    period: "2022 通年（インフレ・利上げ局面）",
    dd: "-25 %",
    note: "年内インラレンジ。FRB の急速利上げに対する調整",
  },
  {
    period: "通常の年（1980 年以降の平均）",
    dd: "約 -14 %",
    note: "「年内インラドローダウン」の平均値。毎年これくらいはあると考えるのが自然",
  },
];

const NIKKEI_DRAWDOWNS = [
  {
    period: "1989-12 → 2003-04（バブル崩壊〜デフレ）",
    dd: "約 -80 %",
    note: "38,915 円 → 7,607 円。回復に 30 年以上を要した日本市場最大の DD",
  },
  {
    period: "2007 〜 2009（リーマン）",
    dd: "約 -60 %",
    note: "1989 年高値以降の長い低迷の延長線上",
  },
  {
    period: "2020-02 → 2020-03（コロナ）",
    dd: "約 -30 %",
    note: "S&P500 と同時連動",
  },
  {
    period: "2024-07-11 → 2024-08-05（令和のブラックマンデー）",
    dd: "約 -25 %",
    note: "1 ヶ月足らずの急落。8/5 単日で -12.4% を記録",
  },
];

export default function WhatIsDrawdownPage() {
  const crash = getNikkeiCrashAnalysis();
  const dd = crash.summary.drawdown;
  const crashFromYear = crash.dataRange.from.slice(0, 4);
  // 集計（summary.drawdown）と同じく、6ヶ月が経過して最安値が確定した局面だけを数える
  const deepFollowUps = crash.episodes.filter(
    (e) => e.isComplete && e.maxFurtherDrawdown <= -10
  ).length;
  // 「急落した日が底だったのは少数」と書けるのは半分未満のときだけ
  const bottomIsRare = dd.bottomOnCrashDay * 2 < dd.count;
  const crashBeatsBaseline =
    crash.summary.episodes["1y"].avgReturn > crash.summary.baseline["1y"].avgReturn;
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
    { name: "ドローダウンとは" },
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
            href="/glossary#drawdown"
            className="underline hover:text-gray-700"
          >
            用語集「ドローダウン」
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
              <strong>ドローダウン（DD, drawdown）</strong> = 過去の最高値からの下落幅。
              <strong>最大ドローダウン（max DD）</strong>はその期間中で最も深かった値で、リスク管理の中核指標
            </li>
            <li>
              年率リターンが同じでも、<strong>最大DDが浅い戦略のほうが投資家心理に優しい</strong>。
              暴落時に「狼狽売り」を回避しやすく、長期で複利を取りこぼさない
            </li>
            <li>
              <strong>S&amp;P500 の歴史的最大DD は -56.8%（リーマン）</strong>、
              日経225 の最大DD は<strong>約 -80%（バブル崩壊〜デフレ期）</strong>。
              「年に一度くらい -10〜-15% はあるもの」と覚えておくと心理が乱されにくい
            </li>
            <li>
              株温計の{" "}
              <Link href="/portfolio" className="underline hover:text-gray-900">
                バーチャルポートフォリオ検証
              </Link>
              では、温度信号がリターン向上にも最大DD抑制にも
              <strong>プラスに働いていなかった</strong>ことを正直に開示しています（DD が買い持ちより浅いのは配分効果）
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ドローダウンとは
          </h2>
          <p className="text-base leading-relaxed">
            <strong>ドローダウン（drawdown, 略 DD）</strong>は、ある運用戦略やポートフォリオの評価額が
            <strong>過去の最高値からどれだけ目減りしているか</strong>を示す指標です。
            日本語では<strong>「最高値からの下落率」</strong>と呼ぶこともあります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            たとえばあるポートフォリオの推移が「100 → 130 → 110」だったとすると、
            最高値 130 から見て現在 110 までの間に -15.4% の下落、つまり<strong>現時点の DD は -15.4%</strong>です。
            その後さらに下げて 100 まで戻ると DD は -23.1%。再び 130 を超えれば DD は 0% にリセットされます。
          </p>
          <p className="text-base leading-relaxed mt-3">
            この「過去最高値からの落差」を期間中ずっと記録し、最も深かった瞬間が
            <strong>最大ドローダウン（maximum drawdown, max DD）</strong>です。
            実務では「過去 10 年の最大 DD は -34% だった」というように、リスク評価の主役指標として使われます。
          </p>
        </section>

        <section id="calc" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            計算式と読み方
          </h2>
          <p className="text-base leading-relaxed">
            計算式はシンプルです。期間中の最高値（peak）を <code>P</code>、現在値を <code>V</code> とすると、
          </p>
          <p className="text-base leading-relaxed mt-2 text-center bg-gray-50 border border-gray-200 rounded-lg p-3 not-prose">
            <strong>ドローダウン = (V − P) ÷ P</strong>
          </p>
          <p className="text-base leading-relaxed mt-3">
            通常はマイナス値で表記されます（最高値からの下落なので）。日次データであれば毎日この値を計算し、
            最も深かった日の値が<strong>最大ドローダウン</strong>になります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            注意点は<strong>「最高値が更新されると DD が一旦リセットされる」</strong>こと。たとえば
            -30% から戻して新高値を取れば DD は 0%。次の調整局面ではその新高値から測り直す、という形で
            DD は連続的なロールオーバー値になります。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
            <p className="text-sm leading-relaxed">
              💡 <strong>関連指標</strong>: ドローダウンが回復するまでの期間を{" "}
              <strong>「リカバリー期間」</strong> と呼びます。年率リターン ÷ 最大DD は{" "}
              <strong>カルマー比率（Calmar Ratio）</strong> としてリターンとリスクをバランス評価する指標で、
              ヘッジファンドなどで広く使われます。
            </p>
          </div>
        </section>

        <section id="why" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            なぜ最大DDが「リターンより怖い」のか
          </h2>
          <p className="text-base leading-relaxed">
            投資の話では「リターンが何 % か」が最も注目されますが、
            実務では<strong>「最大DDが何 % か」のほうが命取りになる</strong>ことが多くあります。理由は 3 つ。
          </p>
          <ol className="list-decimal pl-6 mt-3 space-y-3 text-base leading-relaxed">
            <li>
              <strong>復元コストが非対称</strong>: -50% のドローダウンを取り返すには <strong>+100%</strong> 必要。
              -90% なら <strong>+900%</strong>。深い穴ほど復元の難しさが指数的に増します
            </li>
            <li>
              <strong>狼狽売りリスク</strong>: -20% を超えるあたりから、多くの個人投資家は感情的に売りに走ります。
              年率リターンが優秀な戦略でも、<strong>最大DDで投資家が降りてしまえば結果はゼロ</strong>。
              「投資家が乗り続けられる戦略かどうか」を測る指標としてDDは決定的です
            </li>
            <li>
              <strong>レバレッジ・取り崩しとの相性</strong>: 信用取引・FX 等のレバレッジ運用や、
              FIRE 後の取り崩し局面（シーケンスリスク）では、<strong>同じ年率でも最大DDが深いほど破綻確率が上がる</strong>。
              年率は同じでも経路が違えば結果は大きく変わります
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ ボラティリティ（標準偏差）も同じくリスク指標ですが、ボラは「上下両方向の振れ幅」を捉えます。
            投資家にとって本当に痛いのは下方向だけ——という意味で、<strong>最大DDのほうが投資家心理に近いリスク指標</strong>と言えます。
          </p>
        </section>

        <section id="history" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            S&amp;P500・日経225 の歴史的DD
          </h2>
          <p className="text-base leading-relaxed">
            「-30% って大きいの？小さいの？」という感覚は歴史を眺めると掴めます。
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            🇺🇸 S&amp;P500 主要DD
          </h3>
          <div className="overflow-x-auto not-prose mt-2">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">局面</th>
                  <th className="px-3 py-2 text-right font-semibold">DD</th>
                  <th className="px-3 py-2 text-left font-semibold">備考</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                {SP500_DRAWDOWNS.map((d) => (
                  <tr key={d.period}>
                    <td>{d.period}</td>
                    <td className="text-right font-mono font-semibold text-red-700">
                      {d.dd}
                    </td>
                    <td className="text-gray-700">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">
            🇯🇵 日経225 主要DD
          </h3>
          <div className="overflow-x-auto not-prose mt-2">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">局面</th>
                  <th className="px-3 py-2 text-right font-semibold">DD</th>
                  <th className="px-3 py-2 text-left font-semibold">備考</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100 [&>tr>td]:align-top">
                {NIKKEI_DRAWDOWNS.map((d) => (
                  <tr key={d.period}>
                    <td>{d.period}</td>
                    <td className="text-right font-mono font-semibold text-red-700">
                      {d.dd}
                    </td>
                    <td className="text-gray-700">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3 text-gray-600">
            S&amp;P500 は<strong>1980 年以降の平均インラ年DDが約 -14%</strong>、日経225 はバブル崩壊以降の長期低迷を経験しているため
            国によってリスクプロファイルがかなり異なります。「年に一度くらい -10〜-15% はあるもの」というのが米国の感覚、
            日本市場はそれに加えて<strong>長期低迷（バブル崩壊期は 30 年以上の回復を要した）</strong>のリスクも織り込んでおく必要があります。
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            急落した日は底だったか？（株温計の集計）
          </h3>
          <p className="text-base leading-relaxed">
            1 日で大きく下げた日は「もう十分下げた」と感じやすいものです。株温計では
            {crashFromYear} 年以降の日経225 で、前日比 {crash.threshold}% 以下の急落を{" "}
            {crash.mergeWindow} 営業日以内なら 1 回にまとめて{" "}
            <strong>{crash.episodes.length} 回</strong>の局面を拾いました。
            このうち 6ヶ月が経過した {dd.count} 回について、急落した日の終値から
            その後 6ヶ月の間にどこまで下がったかを調べています。
          </p>

          <LearnDataTable
            caption={`日経225 の急落日（前日比 ${crash.threshold}% 以下）から 6ヶ月以内の追加の下落（6ヶ月が経過した ${dd.count} 回、株温計調べ）`}
          >
              <tbody>
                <tr>
                  <th scope="row" className="text-left font-semibold">急落した日がそのまま底だった</th>
                  <td className="text-right font-mono">{dd.bottomOnCrashDay} 回 / {dd.count} 回</td>
                </tr>
                <tr>
                  <th scope="row" className="text-left font-semibold">さらに 10% 以上下げた</th>
                  <td className="text-right font-mono">{deepFollowUps} 回 / {dd.count} 回</td>
                </tr>
                <tr>
                  <th scope="row" className="text-left font-semibold">追加の下落（中央値 / 平均）</th>
                  <td className="text-right font-mono">
                    {dd.medianDrawdown.toFixed(1)}% / {dd.avgDrawdown.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="text-left font-semibold">底をつけるまで（中央値）</th>
                  <td className="text-right font-mono">{dd.medianDaysToLow} 営業日</td>
                </tr>
              </tbody>
          </LearnDataTable>

          <p className="text-base leading-relaxed mt-3">
            {bottomIsRare && (
              <>
                急落した日が底だったのは少数で、多くの局面では<strong>そこから中央値で {dd.medianDaysToLow} 営業日ほどかけて、さらに下げ</strong>ています。
                最大DD は「急落の 1 日」ではなく、その後の数週間〜数ヶ月で深くなるものだ、と分かります。
              </>
            )}
            {crashBeatsBaseline && (
              <>
                一方で、急落した日に買った場合の 1 年後の日経225 は平均（1 年が経過した{" "}
                {crash.summary.episodes["1y"].sampleSize} 回）{" "}
                {formatReturn(crash.summary.episodes["1y"].avgReturn)} で、全営業日に買った場合の平均{" "}
                {formatReturn(crash.summary.baseline["1y"].avgReturn)} を上回っていました。
              </>
            )}
            「さらに下がる前提で、資金を分けて買う」のが現実的な付き合い方です。
            局面ごとの一覧と、その後のリターンは{" "}
            <Link
              href={NIKKEI_CRASH_ARTICLE.path}
              className="underline hover:text-gray-900"
            >
              「{NIKKEI_CRASH_ARTICLE.title}」
            </Link>
            で公開しています。
          </p>
        </section>

        <section id="kabuonkei" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            株温計のDD検証
          </h2>
          <p className="text-base leading-relaxed">
            株温計の独自検証として、<strong>市場温度スコアでポートフォリオの株/現金配分を動かしたら、最大DDが浅くなるか？</strong>{" "}
            を過去約 10 年の日米市場で計算しています（{" "}
            <Link
              href="/portfolio"
              className="underline hover:text-gray-900"
            >
              温度連動バーチャルポートフォリオ
            </Link>
            ）。
          </p>
          <p className="text-base leading-relaxed mt-3">
            検証結果は正直に書くと、<strong>「リターンの timing シグナルとしてはマイナス（同じ平均配分の定数戦略を日米とも下回る）で、
            最大DD も定数戦略より日米とも 4〜5pp 深い」</strong>でした。
            買い持ちより DD が浅いのは温度の効果ではなく、平均株比率が 100% 未満という配分効果です。
            つまりバックテスト上は、温度計は「リターンを上げる道具」でも「最大DDを浅くする道具」でもありませんでした。
          </p>
          <p className="text-base leading-relaxed mt-3">
            それでも個人投資家にとって意味があるとすれば、
            「<strong>暴落時に慌てて全部売らないための心理的・機械的なブレーキ</strong>」という、数字に出にくい役割です。
            温度計は極寒で「売る」代わりに「買い増す」規律を与えます（その分、下落の谷では DD が深くなる点は覚悟が必要です）。
          </p>
        </section>

        <section id="how-to-mitigate" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            DDを抑える 4 つの実用アプローチ
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>分散</strong>: 単一資産（個別株・単一指数）よりも、
              地域・資産クラス・スタイルに分散したほうが最大DDは浅くなります。
              S&amp;P500 と日経225 は危機時に高相関になるので、債券や金など別アセットの組み入れも検討する価値あり
            </li>
            <li>
              <strong>株比率の上限を決めておく</strong>: 「常にフル投資」にするのではなく、
              「平時 80% / 沸騰時 50% に減らす」のようなルールを決めておく。
              株温計の温度連動ルールはまさにこの考え方を機械化したもの（{" "}
              <Link href="/glossary#dca" className="underline hover:text-gray-900">
                DCA
              </Link>
              {" "}との比較も{" "}
              <Link href="/portfolio" className="underline hover:text-gray-900">
                portfolio 記事
              </Link>
              で開示）
            </li>
            <li>
              <strong>狼狽売りのトリガーを定量化</strong>: 「-20% で見直し、-30% でリバランス」のように、
              事前にルール化しておけば感情に流されにくい。「最高値からの DD が一定値超えたらリスク資産比率を再点検する」など、
              機械的なトリガーが有効です
            </li>
            <li>
              <strong>取り崩しタイミングを工夫する</strong>: FIRE 後の取り崩しでは、
              暴落直後に大きく取り崩すと回復のチャンスを失います。
              <strong>「最大DD中は生活防衛資金（現金）から取り崩す」</strong>ルールを作っておくと、
              シーケンスリスクの影響を緩和できます
            </li>
          </ol>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              用語集:{" "}
              <Link href="/glossary#drawdown" className="underline hover:text-gray-900">
                ドローダウン
              </Link>
              {" "}/{" "}
              <Link href="/glossary#dca" className="underline hover:text-gray-900">
                DCA
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
              バックテスト記事:{" "}
              <Link href="/portfolio" className="underline hover:text-gray-900">
                温度連動バーチャルポートフォリオ
              </Link>
              （温度信号はリターンにもDD抑制にも効いていなかった、という正直な検証）
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
                href="/events/covid-crash-sp500-2020"
                className="underline hover:text-gray-900"
              >
                コロナショック S&amp;P 底（2020-03-23）
              </Link>
            </li>
            <li>
              FIRE 視点での解説:{" "}
              <Link
                href="/guide/fire-long-term"
                className="underline hover:text-gray-900"
              >
                FIRE を目指す人向けガイド
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事はドローダウンというリスク指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。引用している過去の DD 値は公表データの集計であり、将来の運用成果を保証するものではありません。
            投資判断はご自身のリスク許容度に応じて行ってください。データ出典: Yahoo Finance ^GSPC / ^N225、JPMorgan Asset Management、CBOE。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
