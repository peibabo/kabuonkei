import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import PortfolioBody from "@/components/portfolio/PortfolioBody";
import Breadcrumb from "@/components/Breadcrumb";
import { getPortfolioHistory } from "@/lib/portfolio";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/portfolio";
const ARTICLE_TITLE = "温度連動バーチャルポートフォリオ（シミュレーション）";
const ARTICLE_DESCRIPTION =
  "温度連動ポートフォリオが積立(DCA)を JP +38pp / US +42pp 上回る結果。ただし α の大半は「配分の高さ」由来で、温度信号の純寄与は限定的（JP +2.6pp / US -8pp）。最大DDは温度信号で日米とも -3pp 抑制。温度計は「リターン向上ツール」ではなく「DD 抑制ツール」として機能する、という正直な検証を公開。";
const PUBLISHED_AT = "2026-04-23";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "バーチャルポートフォリオ",
    "温度連動ポートフォリオ",
    "バックテスト",
    "日経225",
    "S&P500",
    "株温計",
    "温度計 戦略",
    "市場センチメント 戦略",
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
  { href: "#disclaimer", label: "重要：このページは投資助言ではありません" },
  { href: "#for-whom", label: "結論を先に（先に読んでください）" },
  { href: "#rule", label: "ルールの説明" },
  { href: "#body", label: "バックテスト結果" },
  { href: "#selection", label: "ルール選定プロセスと温度信号の寄与度" },
  { href: "#method", label: "データと手法" },
  { href: "#biases", label: "バックテストのバイアス" },
  { href: "#related", label: "関連リンク" },
];

export default function PortfolioPage() {
  const history = getPortfolioHistory();
  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: history.generatedAt,
  });

  const jpStats = history.portfolios.jp.stats;
  const usStats = history.portfolios.us.stats;
  const jpContrib = history.portfolios.jp.temperatureContribution;
  const usContrib = history.portfolios.us.temperatureContribution;

  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "温度連動ポートフォリオ" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="portfolio-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="portfolio-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={`🧪 ${ARTICLE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />
        <p className="text-xs text-gray-500 not-prose">
          用語の短い定義は{" "}
          <Link
            href="/glossary#dca"
            className="underline hover:text-gray-700"
          >
            「DCA（ドルコスト平均法）」
          </Link>
          ・{" "}
          <Link
            href="/glossary#drawdown"
            className="underline hover:text-gray-700"
          >
            「最大ドローダウン」
          </Link>
          ・{" "}
          <Link
            href="/glossary#kabuonkei-score"
            className="underline hover:text-gray-700"
          >
            「市場温度スコア」
          </Link>
          にもまとめています。
        </p>
        <div
          id="disclaimer"
          role="note"
          className="bg-red-50 border border-red-300 rounded-xl p-4 not-prose"
        >
          <p className="text-sm text-red-700 mb-1 font-semibold">⚠️ 重要な免責事項</p>
          <p className="text-base text-gray-800 leading-relaxed">
            このページの NAV / リターン / 配分推奨は、<strong>過去データに特定のルールを当てはめた「バックテスト」および「シミュレーション」</strong>の結果です。
            <strong className="mx-1">投資助言・投資勧誘ではなく</strong>、特定の金融商品の売買を推奨するものではありません。
            現実の取引では、手数料・税金・スリッページ・約定遅延など、ここでは一切考慮していないコストが発生します。投資判断はご自身の責任で行ってください。
          </p>
        </div>

        <div
          id="scope"
          role="note"
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 not-prose"
        >
          <p className="text-sm font-semibold text-blue-900 mb-2">
            📍 このページの位置付け
          </p>
          <p className="text-base text-gray-800 leading-relaxed mb-2">
            このページは、株温計の温度スコアを「ポートフォリオ運用ルール」に落とし込んだ
            <strong>1 つの応用実験</strong>の検証記事です。
            <strong>株温計本体の価値はこのページだけに還元されません。</strong>
          </p>
          <p className="text-base text-gray-800 leading-relaxed mb-2">
            温度スコアは本来、次のような<strong>多面的な使い方</strong>を想定しています:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-base text-gray-800 mb-2">
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                ダッシュボード
              </Link>
              で「今の市場はどのくらい熱い / 冷たいか」を 5 秒で把握する（共通語彙としての温度）
            </li>
            <li>
              <strong>類似日ナラティブ</strong>: 現在のスコアに近い過去日と、その後のリターンを対比して判断の補助線にする
            </li>
            <li>
              <Link href="/events" className="underline hover:text-gray-900">
                主要イベント一覧
              </Link>
              : 過去の暴落 / 高値圏を温度で振り返って文脈を得る
            </li>
            <li>
              <strong>心理ブレーキ</strong>: 沸騰時に追加投資したい衝動 / 極寒時に投げ売りしたい衝動を一瞬止める
            </li>
            <li>
              <Link href="/guide" className="underline hover:text-gray-900">
                投資家タイプ別ガイド
              </Link>
              : 温度帯に応じた「あなたのスタイルでの読み方」
            </li>
          </ul>
          <p className="text-base text-gray-800 leading-relaxed">
            このページで検証したのはその中でも<strong>最も機械的で定量化しやすい用途</strong>（= 配分ルール）ですが、
            それだけが株温計のすべてではない、という前提でお読みください。
          </p>
        </div>

        <section
          id="for-whom"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">
            📖 結論を先に（先に読んでください）
          </h2>
          <p className="text-base text-gray-800 leading-relaxed mb-3">
            過去約10年のバックテストで、温度ルール sym 80/20 は <strong>NISA 積立型（月次 DCA）を日米ともに上回りました（JP +{jpStats.alphaVsDca.toFixed(1)}pp / US +{usStats.alphaVsDca.toFixed(1)}pp）</strong>。
            ただし、結論を急いで一言で片付けるのは危険です。
            <strong>なぜ勝ったのか</strong>を分解すると、温度計の本当の役割が見えてきます。
          </p>

          <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              🔬 α vs DCA の内訳（追加検証）
            </p>
            <p className="text-sm text-gray-800 leading-relaxed mb-2">
              sym 80/20 の実現平均株比率は JP で約 {jpContrib ? (jpContrib.avgEquityRatio * 100).toFixed(0) : "—"}% / US で約{" "}
              {usContrib ? (usContrib.avgEquityRatio * 100).toFixed(0) : "—"}% でした。
              DCA の平均は約 50%（月次に積み上がるため）なので、<strong>配分の高さだけで大きなリターン差が生まれます</strong>。
              これと<strong>温度信号による timing 効果</strong>を分離するため、同じ平均株比率を定数で持ち続けた場合の成績と比較すると:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-800">
              <li>
                <strong>JP</strong>: 温度信号の純寄与は <strong>+{jpContrib ? jpContrib.alphaVsConstant.toFixed(1) : "—"}pp</strong> のみ。α vs DCA {jpStats.alphaVsDca.toFixed(1)}pp の大半（約{" "}
                {jpContrib ? (jpStats.alphaVsDca - jpContrib.alphaVsConstant).toFixed(1) : "—"}pp）は「配分を高めに保った」効果
              </li>
              <li>
                <strong>US</strong>: 温度信号の純寄与は<strong className="text-red-600"> {usContrib ? usContrib.alphaVsConstant.toFixed(1) : "—"}pp（マイナス）</strong>。
                α vs DCA の全体はプラスでも、<strong>温度で現金化した判断は裏目に出ていた</strong>のが実態
              </li>
              <li>
                <strong>一方、最大DD 抑制には温度信号が効いている</strong>: 定数配分と比べて JP で{" "}
                {jpContrib ? jpContrib.ddVsConstant.toFixed(1) : "—"}pp / US で{" "}
                {usContrib ? usContrib.ddVsConstant.toFixed(1) : "—"}pp 浅く抑えている（どちらもマイナス = DD が浅い）
              </li>
            </ul>
          </div>

          <p className="text-base text-gray-800 leading-relaxed mb-3">
            つまり温度計は、<strong>「リターンを上げるための timing シグナル」としては限定的〜逆効果</strong>です。
            しかし<strong>「最大ドローダウンを抑えるリスク管理ツール」としては、日米とも -3pp 程度の効果が確かにあります</strong>。
            この正直な結果を踏まえると、このページが役に立つのは次のような方です:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-base text-gray-800 mb-3">
            <li>
              すでに NISA 積立をしている人で、<strong>普段は株比率を積立より高めに保つことで積立超えを狙いたい</strong>方（ただし「timing で勝つ」期待はしないこと）
            </li>
            <li>
              まとまった現金があり、一括投入と完全積立の中間的な入れ方を探している人
            </li>
            <li>
              暴落時に「売ってしまう」のを防ぐ仕組みが欲しい人 →{" "}
              <strong>温度計は DD 抑制には効くので、心理的な支えになる</strong>
            </li>
          </ul>
          <p className="text-base text-gray-800 leading-relaxed">
            逆に、<strong>「温度を読めばリターンが上がる」という期待で来た方はぜひ下の「ルール選定プロセスと温度信号の寄与度」セクションまでお読みください</strong>。
            過去10年ではそう都合よくは効いていない、というのがこのサイトが正直に公開している検証結果です。
            また、これは<strong>過去10年のバックテスト</strong>であり、将来の成績を保証するものではありません（現金金利 0% / 手数料 0 / 税金 0 前提）。
          </p>
        </section>

        <nav
          aria-label="目次"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-base not-prose"
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

        <p className="text-sm text-gray-400">
          最終更新: <time dateTime={history.generatedAt}>{history.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）
        </p>

        <section id="intro" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
            温度でポートフォリオを動かすと、どうなるのか？
          </h2>
          <p className="text-base leading-relaxed">
            株温計の温度スコア（0-100）は、「市場が今どれくらい熱狂 / 悲観しているか」を示すセンチメント指標です。ではその温度に応じて、
            機械的に<strong>株と現金の配分を月次に入れ替える</strong>と、過去どのような結果になっていたのでしょうか。このページは、日経225 と S&amp;P500 の 2 市場で、そのシミュレーションを公開するものです。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-base leading-relaxed">
            <li>
              🇯🇵 <strong>日本版</strong>: 温度ルール 累計 +
              {jpStats.totalReturn.toFixed(1)}% / 最大DD{" "}
              {jpStats.maxDrawdown.toFixed(1)}% <br />
              <span className="text-sm text-gray-500">
                一括買い持ち: +{jpStats.benchmarkReturn.toFixed(1)}% /{" "}
                {jpStats.benchmarkMaxDrawdown.toFixed(1)}% &nbsp;|&nbsp; 月次積立: +
                {jpStats.dcaReturn.toFixed(1)}% /{" "}
                {jpStats.dcaMaxDrawdown.toFixed(1)}%
              </span>
            </li>
            <li>
              🇺🇸 <strong>米国版</strong>: 温度ルール 累計 +
              {usStats.totalReturn.toFixed(1)}% / 最大DD{" "}
              {usStats.maxDrawdown.toFixed(1)}% <br />
              <span className="text-sm text-gray-500">
                一括買い持ち: +{usStats.benchmarkReturn.toFixed(1)}% /{" "}
                {usStats.benchmarkMaxDrawdown.toFixed(1)}% &nbsp;|&nbsp; 月次積立: +
                {usStats.dcaReturn.toFixed(1)}% /{" "}
                {usStats.dcaMaxDrawdown.toFixed(1)}%
              </span>
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3 text-gray-600">
            絶対リターンの順序は<strong>「一括買い持ち &gt; 温度ルール &gt; 月次積立」</strong>。
            温度ルールは月次積立（DCA）を JP +{jpStats.alphaVsDca.toFixed(1)}pp / US +{usStats.alphaVsDca.toFixed(1)}pp 上回りますが、
            その内訳を見ると、<strong>α の大半は「配分を高めに保った」効果由来で、温度信号の純寄与は限定的</strong>です（詳細は「ルール選定プロセスと温度信号の寄与度」セクションで）。
            最大DD は一括買い持ちより浅い（JP -{(jpStats.benchmarkMaxDrawdown - jpStats.maxDrawdown).toFixed(1)}pp / US -{(usStats.benchmarkMaxDrawdown - usStats.maxDrawdown).toFixed(1)}pp 改善）一方、積立よりはやや深いという「中間」の位置付け。
            <strong className="text-red-700">特に米国は積立より {(usStats.maxDrawdown - usStats.dcaMaxDrawdown).toFixed(1)}pp 深いので、暴落耐性は積立のほうが上</strong>です。
          </p>
        </section>

        <section id="rule" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ルールの説明
          </h2>
          <p className="text-base leading-relaxed">
            毎月第一営業日に、その時点の温度スコアをもとに下の配分表に従って株 : 現金を再配分します。
            配分は「ニュートラル 80 : 20 を基準に、温度に応じて振る」ルール設定（<strong>sym 80/20</strong>）。
            平温時は株 80% を保ち、極寒時はフル投資（100%）、沸騰時は株 50% まで減らします。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                  <th className="px-3 py-2 text-left font-semibold">スコア</th>
                  <th className="px-3 py-2 text-right font-semibold">株比率</th>
                  <th className="px-3 py-2 text-right font-semibold">現金比率</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                {history.rule.bands.map((b) => (
                  <tr key={b.level}>
                    <td>{b.level}</td>
                    <td className="text-gray-500 font-mono">
                      {b.scoreRange[0]}〜{b.scoreRange[1]}
                    </td>
                    <td className="text-right font-mono font-semibold">
                      {(b.equityRatio * 100).toFixed(0)}%
                    </td>
                    <td className="text-right font-mono text-gray-500">
                      {((1 - b.equityRatio) * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed mt-3 text-gray-600">
            極寒（総悲観）のときに株の比率を上げ、沸騰（総楽観）のときに下げる<strong>逆張り型</strong>のルールです。リバランスは月次で、ポジション変更は月初 1 回のみ。
          </p>
        </section>

        <section id="body" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            バックテスト結果
          </h2>
          <p className="leading-relaxed text-base text-gray-600 mb-4">
            下のタブで日本版 / 米国版を切替、期間切替で 1年 / 5年 / 10年の NAV 推移をご覧いただけます。
          </p>
          <PortfolioBody history={history} />
        </section>

        <section id="selection" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            ルール選定プロセスと温度信号の寄与度
          </h2>
          <p className="text-base leading-relaxed mb-3">
            このセクションは<strong>「温度計が本当にリターンを上げるのか」という最も大事な問い</strong>に、
            他の投資サイトではあまり公開しない厳しい検証で答える部分です。結論を隠さず書きます。
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">
            なぜ sym 80/20 になったのか（過剰最適化リスクの開示）
          </h3>
          <p className="text-base leading-relaxed mb-3">
            初期バージョンは「ニュートラル 60/40（平温=株60%）」でしたが、このルールでは過去10年で積立(DCA)に
            <strong> JP -8.9pp / US -4.0pp 負けていました</strong>。そこで候補ルール 17 本（対称シフト / 非対称 / 極端帯トリガー / 温度連動 DCA の 4 系統）を{" "}
            <code className="text-sm bg-gray-100 px-1 rounded">scripts/explore-portfolio-rules.ts</code>
            {" "}で網羅テストし、最もバランスの良かった<strong> sym 80/20</strong>（ニュートラル 80/20、極寒100% / 沸騰50% の非対称）を採用しました。
          </p>
          <p className="text-base leading-relaxed mb-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️ <strong>過剰最適化（オーバーフィット）リスク</strong>: 17 ルールから「過去10年で最もよく勝った 1 本」を選ぶこの行為は、
            <strong>多重検定問題</strong>を抱えます。本当に温度に価値がなくても、候補が多ければ偶然よく見える 1 本が選ばれてしまう可能性があります。
            このリスクを補う追加検証として、次の「温度信号の純寄与度」を同時に見てください。
          </p>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">
            温度信号の純寄与度 — α のうち、温度 timing に依る部分はどれくらいか
          </h3>
          <p className="text-base leading-relaxed mb-3">
            sym 80/20 の<strong>実現平均株比率</strong>は JP 約 {jpContrib ? (jpContrib.avgEquityRatio * 100).toFixed(1) : "—"}% / US 約 {usContrib ? (usContrib.avgEquityRatio * 100).toFixed(1) : "—"}% です。
            積立(DCA)の平均株比率は月次に積み上がるので約 50%。したがって、α vs DCA の一部は単純に
            <strong>「温度ルールのほうが平均で株を多く持っていた」という配分効果</strong>です。
            これと<strong>「温度信号の timing 効果」</strong>を分離するため、同じ平均株比率を定数で持ち続けた場合と比較します。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">市場</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    温度ルール (sym 80/20)
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    定数配分（同じ平均）
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">
                    温度信号の純寄与
                  </th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td className="font-semibold">🇯🇵 JP リターン</td>
                  <td className="text-right font-mono">
                    +{jpStats.totalReturn.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono text-gray-600">
                    +{jpContrib ? jpContrib.constantStats.totalReturn.toFixed(1) : "—"}%
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-700">
                    {jpContrib ? (jpContrib.alphaVsConstant >= 0 ? "+" : "") + jpContrib.alphaVsConstant.toFixed(2) : "—"}pp
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">🇯🇵 JP 最大DD</td>
                  <td className="text-right font-mono">
                    {jpStats.maxDrawdown.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono text-gray-600">
                    {jpContrib ? jpContrib.constantStats.maxDrawdown.toFixed(1) : "—"}%
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-700">
                    {jpContrib ? (jpContrib.ddVsConstant >= 0 ? "+" : "") + jpContrib.ddVsConstant.toFixed(2) : "—"}pp（浅い）
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">🇺🇸 US リターン</td>
                  <td className="text-right font-mono">
                    +{usStats.totalReturn.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono text-gray-600">
                    +{usContrib ? usContrib.constantStats.totalReturn.toFixed(1) : "—"}%
                  </td>
                  <td className="text-right font-mono font-bold text-red-600">
                    {usContrib ? (usContrib.alphaVsConstant >= 0 ? "+" : "") + usContrib.alphaVsConstant.toFixed(2) : "—"}pp
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">🇺🇸 US 最大DD</td>
                  <td className="text-right font-mono">
                    {usStats.maxDrawdown.toFixed(1)}%
                  </td>
                  <td className="text-right font-mono text-gray-600">
                    {usContrib ? usContrib.constantStats.maxDrawdown.toFixed(1) : "—"}%
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-700">
                    {usContrib ? (usContrib.ddVsConstant >= 0 ? "+" : "") + usContrib.ddVsConstant.toFixed(2) : "—"}pp（浅い）
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-2">
            どう読むべきか — 温度計の本当の役割
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mb-3">
            <li>
              <strong>リターンで見ると温度信号は弱い</strong>:
              JP ではごく軽微にプラス（+{jpContrib ? jpContrib.alphaVsConstant.toFixed(1) : "—"}pp）、
              <strong className="text-red-600">US ではむしろマイナス（{usContrib ? usContrib.alphaVsConstant.toFixed(1) : "—"}pp）</strong>。
              つまり「温度が沸騰したから売る / 極寒だから買う」という判断は、過去10年の両市場では期待ほど timing として効いていません
            </li>
            <li>
              <strong>最大DD 抑制では温度信号が効いている</strong>:
              日米とも定数配分より <strong>-3pp 程度 浅く</strong>抑えています。
              これは「沸騰で株比率を落として暴落直前にリスクを減らした」一部の局面が効いた結果で、
              <strong>温度計は「急落前に少しクッションを入れる道具」として機能</strong>しています
            </li>
            <li>
              <strong>α vs DCA のほとんどは「配分の高さ」由来</strong>:
              平均 65〜69% の株比率は、積立の平均 50% より明確に高い。強い右肩上がりの過去10年では、
              この差だけで大きなリターン差が生まれました。
              <strong>「温度の timing が勝利の源泉」ではなく「長めに株を持ち続けたほうが勝つ相場だった」</strong>のが本当の姿です
            </li>
          </ul>
          <p className="text-base leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-3">
            💡 <strong>まとめ</strong>: 温度計は「リターンを上げるための timing シグナル」ではなく、
            <strong>「暴落時に慌てて売らないための心理的・機械的なブレーキ」</strong>として使うのが、過去10年のデータから見える正直な役割です。
            積立(DCA)を上回る α の大半は、単に「株比率を高めに保った」から。
            <strong>もし温度を一切見ず定数 70% で持ち続けていても、似たようなリターンは得られた</strong>可能性が高いという事実は、
            このサイトの価値提案を再考する材料でもあります。
          </p>
        </section>

        <section id="method" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            データと手法
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
            <li>
              <strong>対象銘柄</strong>: 日本版 = ^N225、米国版 = ^GSPC（いずれも Yahoo Finance 日足終値）
            </li>
            <li>
              <strong>温度スコア</strong>: 日本版 = C1（日経225 vs 125日MA）+ C5（USDJPY 50日モメンタム）の等ウェイト平均 /
              米国版 = VIX から線形推定（株温計トップの米国版温度と同一ロジック）
            </li>
            <li>
              <strong>バックテスト期間</strong>: {history.dataRange.from} 〜 {history.dataRange.to}
              （日本温度履歴の起点に合わせて両市場を揃え）
            </li>
            <li>
              <strong>リバランス</strong>: 毎月第一営業日に温度帯を判定し、目標株比率に合わせて株/現金を入れ替え。月中は据え置き
            </li>
            <li>
              <strong>ベンチマーク（2 種類）</strong>:
              (1) <strong>一括買い持ち</strong> = 同じ銘柄を初日に 100% 買って保有。
              (2) <strong>月次積立（DCA）</strong> = 初期 100 を N ヶ月で等額按分し、毎月第一営業日にその月分を株へ投入（NISA 積立投資を模擬）。
              累計投入額を 100 で揃えて 3 戦略を比較しています
            </li>
            <li>
              <strong>前提（重要）</strong>: 現金金利 = <strong>0%</strong> 固定 / 手数料 = 0 / スリッページ = 0 / 税金 = 0。
              現金金利の影響はバックテスト結果セクション内の<strong>「現金金利シナリオの感度分析」</strong>
              で 0% / 1% / 3% の 3 シナリオを並列掲載しています
            </li>
            <li>
              <strong>NAV の基準</strong>: 初日を 100 として正規化
            </li>
            <li>
              <strong>ライブ追跡</strong>: 毎営業日 JST 07:00 に
              {" "}<code className="text-sm">snapshot:portfolio</code>
              {" "}で新規価格と温度を取り込み、JSON を差分更新 → Vercel 再デプロイ
            </li>
          </ul>
        </section>

        <section id="biases" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            バックテストに内在するバイアス
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong className="text-red-700">ルール選定の多重検定バイアス（最大の懸念）</strong>: sym 80/20 は候補 17 本から「過去10年で最もよく勝った 1 本」を選んで採用しました。
              温度に本当の timing 価値がなくても、候補が多ければ偶然よく見える 1 本が選ばれる可能性があります。
              上の「温度信号の純寄与度」テーブル（JP +{jpContrib ? jpContrib.alphaVsConstant.toFixed(1) : "—"}pp / US {usContrib ? usContrib.alphaVsConstant.toFixed(1) : "—"}pp）が小さい or マイナスなのは、
              <strong>この懸念が単なる懸念で終わっていない可能性</strong>を示唆しています
            </li>
            <li>
              <strong>ルック・アヘッド・バイアスの可能性</strong>: 本シミュレーションは「当日終値と当日終値時点の温度」でリバランス判断を行います。現実には終値が確定した後に翌日以降の寄りで執行するため、理論値と現実の間に乖離が生じます
            </li>
            <li>
              <strong>現金金利 0% は保守的（バックテスト側に不利）</strong>: MMF を使えば年 1〜3% の利息が付きます。現金比率が高いシナリオでは、ここに入れていない分だけ成績は過小評価されています
            </li>
            <li>
              <strong>執行コストを無視</strong>: 現実には売買手数料・スプレッド・スリッページが発生します。月次リバランスは年 12 回程度なので低頻度ですが、ゼロではありません
            </li>
            <li>
              <strong>サンプル期間の制約</strong>: 日本温度履歴の起点が {history.dataRange.from} のため、10 年程度のバックテストです。リーマンショックなどより古い暴落局面は含まれません
            </li>
            <li>
              <strong className="text-amber-800">相場レジーム依存（温度信号の寄与が US でマイナスだった理由）</strong>:
              過去10年は日米とも強い右肩上がり相場で、特に米国は調整らしい調整が限定的でした。
              <strong>「過熱 / 沸騰で株比率を下げる」系のルールは、このような一本調子の上昇相場では構造的に不利</strong>です
              （下げる直前に現金化できなければ、上がり続ける間に買い戻しの機会を失う）。
              したがって温度信号の純寄与度が米国で -8pp となったのは、温度計そのものの本質的な弱点というより、
              <strong>「10 年強気相場」というレジームに対するこのルール設計の相性</strong>の話でもあります。
              リーマン級の長期下落や、1990 年代日本のような横ばい相場を含む期間では、
              同じ温度信号の寄与が逆転する可能性があります（が、それを検証するデータは本サイトにはまだありません）
            </li>
            <li>
              <strong>温度スコア自体の過剰最適化リスク</strong>: 株温計のスコア（特に日本版 C1+C5）は現在の相場特性をもとに閾値が設計されています。<strong>将来も同じ働きをする保証はありません</strong>
            </li>
          </ul>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連リンク — 株温計の他の使い方
          </h2>
          <p className="text-base leading-relaxed mb-3 text-gray-600">
            冒頭でも書いた通り、このページは株温計の応用 1 実験です。株温計の本来の価値は、
            <strong>毎日の温度把握・過去との比較・行動抑制</strong>といったコア機能にあります。以下で試してみてください。
          </p>
          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            📊 コア機能（まずここ）
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              <Link href="/" className="underline hover:text-gray-900 font-semibold">
                ダッシュボード（今日の日米温度）
              </Link>{" "}
              — 現在のスコア + 類似日 TOP5 + 温度推移チャートを毎日チェック。
              ポートフォリオルールを使わなくても「自分の心理の体温計」として機能します
            </li>
            <li>
              <Link href="/events" className="underline hover:text-gray-900 font-semibold">
                主要イベント一覧（14 件）
              </Link>{" "}
              — コロナショック / 令和のブラックマンデー / Brexit 等、過去の大型イベントを温度付きで振り返り、
              現在との距離感を測る
            </li>
            <li>
              <Link href="/guide" className="underline hover:text-gray-900 font-semibold">
                投資家タイプ別ガイド（NISA / 短期 / FIRE）
              </Link>{" "}
              — あなたのスタイルに合わせて、温度帯ごとの具体的な読み方を解説
            </li>
          </ul>
          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            🔬 分析記事（温度を使った他の実験）
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX × S&amp;P500 × 日経225
              </Link>{" "}
              — VIX バンド別の前方リターン検証（過去20年）
            </li>
            <li>
              <Link
                href="/analysis/margin-ratio-temperature"
                className="underline hover:text-gray-900"
              >
                信用倍率 × 株温計
              </Link>{" "}
              — 需給 × 温度のクロス分析
            </li>
            <li>
              <Link
                href="/guide/fire-long-term"
                className="underline hover:text-gray-900"
              >
                FIRE を目指す人向けガイド
              </Link>{" "}
              — 温度を見ながらのリバランスの考え方
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本ページの情報は投資助言ではありません。バックテスト結果は過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。データ出典: Yahoo Finance（^N225 / ^GSPC / ^VIX / USDJPY=X）、日本温度履歴は株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
