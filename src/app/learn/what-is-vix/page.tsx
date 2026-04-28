import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";

const ARTICLE_PATH = "/learn/what-is-vix";
const ARTICLE_TITLE =
  "VIX（恐怖指数）とは？S&P500 の不安心理を測る指標を初心者向けに解説";
const ARTICLE_DESCRIPTION =
  "VIX (CBOE Volatility Index) の意味・算出ロジック・水準別の目安と、過去20年データで「VIX 30 超え=危険」の通説を検証。日本投資家として日経225・ドル円との関係も含めて、株温計が独自視点で解説します。";
const PUBLISHED_AT = "2026-04-28";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "VIX とは",
    "恐怖指数",
    "VIX 30",
    "VIX 目安",
    "VIX 見方",
    "CBOE Volatility Index",
    "株温計",
    "S&P500",
    "日経225",
    "ボラティリティ",
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
  { href: "#what", label: "VIX とは何か" },
  { href: "#bands", label: "VIX の水準別の意味" },
  { href: "#myth", label: "「VIX 30 超え=危険」は本当か" },
  { href: "#japan", label: "日本投資家として VIX をどう見るか" },
  { href: "#daily", label: "毎日チェックすべき？株温計での扱い" },
  { href: "#related", label: "関連用語・関連記事" },
];

export default function WhatIsVixPage() {
  const analysis = getVixSp500Analysis();
  const high = analysis.primary.bands.find((b) => b.band === "30〜");
  const mid20 = analysis.primary.bands.find((b) => b.band === "20〜30");
  const low15 = analysis.primary.bands.find((b) => b.band === "〜15");

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
    { name: "VIX とは" },
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
          <Link href="/glossary#vix" className="underline hover:text-gray-700">
            用語集「VIX」
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
              <strong>VIX</strong> は米シカゴ・オプション取引所（CBOE）が公表する、
              S&amp;P500 オプションの価格から逆算した
              <strong>「向こう 30 日の予想変動率（年率換算）」</strong>を示す指数
            </li>
            <li>
              通称<strong>「恐怖指数」</strong>。20 以下が平静、30 を超えると不安、40 以上はパニック、
              というのが大づかみな目安
            </li>
            <li>
              ただし<strong>「VIX 高い＝株は危険」は実データでは成り立たない</strong>。
              過去約 20 年（{analysis.sampleSize.toLocaleString()} 取引日）の集計では、
              {high && (
                <>
                  {" "}
                  VIX 30 超えだった日（{high.occurrences} 日）の翌 6ヶ月後 S&amp;P500 は
                  <strong>
                    {" "}平均 +{high.sp500["6m"].avgReturn.toFixed(1)}% / 勝率{" "}
                    {high.sp500["6m"].winRate.toFixed(0)}%
                  </strong>
                  という強さで、むしろ買い場だったケースが多い
                </>
              )}
            </li>
            <li>
              この記事では VIX の定義から日本投資家としての見方までを腰を据えて解説します
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            VIX とは何か
          </h2>
          <p className="text-base leading-relaxed">
            <strong>VIX（CBOE Volatility Index）</strong>は、米シカゴ・オプション取引所（CBOE）が 1993 年から公表している指数です。
            S&amp;P500 を原資産とする<strong>株価指数オプションの価格から逆算</strong>して、
            <strong>向こう 30 日間に投資家が予想している S&amp;P500 の変動率（年率換算、%）</strong>
            を表します。たとえば VIX = 20 のとき、市場は「向こう 30 日に S&amp;P500 が年率 20% 程度の振れ幅で動くとすれば説明できる水準のオプション価格」を付けている、という意味になります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            ポイントは、VIX が「株が下がる」とも「上がる」とも直接予測している指数ではなく、
            <strong>「これからの値動きの大きさ（ボラティリティ）の予想」</strong>を表していることです。
            ただし株価が急落するときほど投資家はヘッジ目的でプットオプションを買い込み、オプション価格が膨らむため、
            結果として<strong>「株安 = VIX 急騰」「株高 = VIX 低下」</strong>というはっきりした逆相関が観察されます。
            この性質から「恐怖指数」というニックネームが定着しました。
          </p>
          <p className="text-base leading-relaxed mt-3">
            VIX 自体は数式で機械的に計算されるため、誰かの主観で動かすことはできません。
            S&amp;P500 オプション市場で実際に成立している買い気配・売り気配を集計した、いわば<strong>「市場のコンセンサス・恐怖度」</strong>です。
            ティッカーは{" "}
            <code className="text-sm bg-gray-100 px-1 rounded">^VIX</code>。
            Yahoo Finance、TradingView、各証券会社のチャートで誰でも閲覧できます。
          </p>
        </section>

        <section id="bands" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            VIX の水準別の意味
          </h2>
          <p className="text-base leading-relaxed">
            VIX に厳密な「閾値」はありませんが、長期の歴史的な分布から、以下のような大づかみの目安が広く使われています。
            ここでは過去 20 年間の取引日を 4 つのバンドに分け、それぞれの局面での意味合いを整理します。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">VIX 水準</th>
                  <th className="px-3 py-2 text-left font-semibold">市場の状態</th>
                  <th className="px-3 py-2 text-right font-semibold">該当日数（過去20年）</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-mono">〜15</td>
                  <td>超低位。極端な平静、楽観の張り付き</td>
                  <td className="text-right font-mono">
                    {low15?.occurrences.toLocaleString() ?? "—"} 日
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">15〜20</td>
                  <td>長期平均（19 前後）。通常運転</td>
                  <td className="text-right font-mono">
                    {analysis.primary.bands
                      .find((b) => b.band === "15〜20")
                      ?.occurrences.toLocaleString() ?? "—"}{" "}
                    日
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">20〜30</td>
                  <td>やや警戒。調整局面の入り口、政策イベント前後</td>
                  <td className="text-right font-mono">
                    {mid20?.occurrences.toLocaleString() ?? "—"} 日
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">30〜</td>
                  <td>不安〜パニック。歴史的な暴落局面の多くがこのゾーン</td>
                  <td className="text-right font-mono">
                    {high?.occurrences.toLocaleString() ?? "—"} 日
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            参考までに、VIX の<strong>歴史的な最高値は 82.69（2020 年 3 月 16 日、コロナショック）</strong>。
            2008 年リーマンショックでも一時 80 台に達しました。逆に 2017 年の超低ボラ局面では 9 台まで沈むなど、
            極値は両方向に大きく振れます。長期の中央値はおおよそ 17、平均は 19 前後です。
          </p>
        </section>

        <section id="myth" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            「VIX 30 超え＝株は危険」は本当か？
          </h2>
          <p className="text-base leading-relaxed">
            一般的な経験則では「VIX が 30 を超えたらリスクオフ、株は売り」と語られます。実際、急落の渦中ではこの感覚は正しい——
            その瞬間、株価は明らかに下がっています。問題は「<strong>その後どうなったか</strong>」です。
            株温計では VIX を過去約 20 年（{analysis.sampleSize.toLocaleString()} 取引日）にわたって集計し、
            水準別に翌 1 / 3 / 6ヶ月後の S&amp;P500 リターンを計算しています。
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">VIX 水準</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    翌 3ヶ月後 S&amp;P500 平均
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">勝率</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    翌 6ヶ月後 S&amp;P500 平均
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">勝率</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-mono">〜15</td>
                  <td className="text-right font-mono">
                    +{low15?.sp500["3m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono text-gray-500">
                    {low15?.sp500["3m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                  <td className="text-right font-mono">
                    +{low15?.sp500["6m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono text-gray-500">
                    {low15?.sp500["6m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                </tr>
                <tr>
                  <td className="font-mono">20〜30</td>
                  <td className="text-right font-mono">
                    +{mid20?.sp500["3m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono text-gray-500">
                    {mid20?.sp500["3m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                  <td className="text-right font-mono">
                    +{mid20?.sp500["6m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono text-gray-500">
                    {mid20?.sp500["6m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="font-mono font-semibold">30〜</td>
                  <td className="text-right font-mono font-bold text-emerald-700">
                    +{high?.sp500["3m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono font-semibold">
                    {high?.sp500["3m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-700">
                    +{high?.sp500["6m"].avgReturn.toFixed(1) ?? "—"}%
                  </td>
                  <td className="text-right font-mono font-semibold">
                    {high?.sp500["6m"].winRate.toFixed(0) ?? "—"}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            VIX 30 超えのバンドが、他のどのバンドよりも<strong>翌 6ヶ月後の平均リターンと勝率が最も高い</strong>のは、
            一見不思議ですが、メカニズム的には自然です。VIX が 30 を超えるのは、
            すでに株価が大きく下落して投資家心理が悲観に振れた局面が多く、
            その後は「<strong>下げすぎの巻き戻し（メアン回帰）</strong>」が起きやすいためです。
          </p>
          <p className="text-base leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ ただし、これは<strong>「過去そうだった」</strong>という統計です。
            リーマンショックや 2022 年のインフレ・利上げ局面のように、
            <strong>30 超えから更に深い下落・長期低迷へ向かうケース</strong>も含まれています。
            「VIX 30 超え＝確実に底」ではなく、「平均的には買い場が混ざる確率が高い」という読み方が正確です。
            個別水準別の詳細と、日本版温度との掛け合わせは{" "}
            <Link
              href="/analysis/vix-threshold-sp500"
              className="underline hover:text-gray-900"
            >
              「VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？」
            </Link>
            で全データを公開しています。
          </p>
        </section>

        <section id="japan" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            日本投資家として VIX をどう見るか
          </h2>
          <p className="text-base leading-relaxed">
            VIX は米国市場の指標ですが、日本の投資家にとっても見過ごせない理由が 3 つあります。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-2 text-base leading-relaxed">
            <li>
              <strong>日経225 への波及</strong>: 米国市場が大きく動いた翌日、日本市場はその余波を受けやすい構造です。
              VIX 急騰の翌営業日は、日経225 もリスクオフで売られる傾向が強くあります。
              特に 2020 年 3 月のコロナショックや、2024 年 8 月の{" "}
              <Link
                href="/events/reiwa-black-monday-2024"
                className="underline hover:text-gray-900"
              >
                令和のブラックマンデー
              </Link>
              のような局面では、VIX が 40 以上に跳ね上がった直後に日経が歴史的な暴落を演じました
            </li>
            <li>
              <strong>円高との連動</strong>: VIX 急騰のタイミングでは「リスクオフの円買い」が起きやすく、
              ドル円が短時間で数円動くこともあります。日本企業は輸出比率が高いため、
              この円高は日経の追加下落要因になりやすい——「VIX 急騰 → 円高 → 日経も売られる」の連鎖が
              典型パターンです
            </li>
            <li>
              <strong>日本の投資家の心理アンカー</strong>: 日経VI（日経平均 VI）も同じ思想で算出されていますが、
              データ取得の難しさから個人投資家の間では VIX ほど普及していません。実務的に
              「<strong>米国の不安心理を一番手早く読む</strong>」道具として、VIX は日本投資家にとっても十分有用です
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            上のリターン表の通り、過去 20 年では VIX 30 超えの後の日経225 も{" "}
            {high && (
              <>
                <strong>
                  6ヶ月後 平均 +{high.nikkei225["6m"].avgReturn.toFixed(1)}% / 勝率{" "}
                  {high.nikkei225["6m"].winRate.toFixed(0)}%
                </strong>
              </>
            )}
            と、米株と同様に強い反発を見せています。米国の恐怖は日本にも波及しますが、その後の戻りも一緒に来やすい——という覚え方ができます。
          </p>
        </section>

        <section id="daily" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            毎日チェックすべき？株温計での扱い
          </h2>
          <p className="text-base leading-relaxed">
            結論から言うと、<strong>VIX を毎日数値レベルで追う必要はありません</strong>。
            VIX 自体は普段 15〜20 のレンジで動き、平常時は方向感の判断にはあまり寄与しないからです。
            一方で、<strong>20 を超えてきたとき、30 を超えたとき、40 を超えたとき</strong>—
            この 3 つの節目を超えるタイミングだけは、相場の景色が明確に変わる瞬間として押さえておくと役立ちます。
          </p>
          <p className="text-base leading-relaxed mt-3">
            株温計では、米国版の<strong>「市場温度スコア（0〜100）」</strong>を VIX から線形推定して算出しています。
            VIX が低いほどスコアは熱く、VIX が高いほどスコアは冷たくなる、という設計です。
            これにより、VIX の数値そのものを見なくても、<strong>「いま米国市場は熱いのか冷たいのか」を 0〜100 のひとつの数字で読める</strong>
            ようにしています。
          </p>
          <p className="text-base leading-relaxed mt-3">
            毎日チェックする習慣を作るなら、まずは{" "}
            <Link href="/" className="underline hover:text-gray-900">
              トップページのゲージ
            </Link>
            を見るのが最短です。VIX が節目を超えそうな局面は、温度スコアが「冷え込み」「極寒」ゾーンへ入るのでひと目で分かります。
            その後は{" "}
            <Link
              href="/analysis/vix-threshold-sp500"
              className="underline hover:text-gray-900"
            >
              分析記事
            </Link>
            で水準別の過去データを参照して、自分の判断材料にする、という流れが現実的です。
          </p>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連用語・関連記事
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              用語集:{" "}
              <Link href="/glossary#vix" className="underline hover:text-gray-900">
                VIX
              </Link>
              {" "}/{" "}
              <Link
                href="/glossary#fear-greed-index"
                className="underline hover:text-gray-900"
              >
                Fear &amp; Greed Index
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
              分析記事:{" "}
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？— 過去20年の検証
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
                href="/events/covid-crash-sp500-2020"
                className="underline hover:text-gray-900"
              >
                コロナショック S&amp;P 底（2020-03-23）
              </Link>
            </li>
            <li>
              トップ:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                今日の市場温度を確認する
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は VIX という指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。引用している統計は過去データの集計であり、将来の運用成果を保証するものではありません。
            投資判断はご自身のリスク許容度に応じて行ってください。データ出典: CBOE ^VIX、Yahoo Finance ^GSPC / ^N225。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
