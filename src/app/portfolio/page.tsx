import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import PortfolioBody from "@/components/portfolio/PortfolioBody";
import { getPortfolioHistory } from "@/lib/portfolio";
import { buildArticleJsonLd } from "@/lib/article-jsonld";

const ARTICLE_PATH = "/portfolio";
const ARTICLE_TITLE = "温度連動バーチャルポートフォリオ（シミュレーション）";
const ARTICLE_DESCRIPTION =
  "株温計の温度スコアに応じて、日経225・S&P500 の株/現金配分を月次に切り替えるシミュレーション。過去約10年のバックテストと日次ライブ追跡を公開。これは研究目的であり、投資助言ではありません。";
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
  { href: "#rule", label: "ルールの説明" },
  { href: "#body", label: "バックテスト結果" },
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

  return (
    <>
      <Script
        id="portfolio-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <StaticPageLayout title={`🧪 ${ARTICLE_TITLE}`}>
        <div
          id="disclaimer"
          role="note"
          className="bg-red-50 border border-red-300 rounded-xl p-4 not-prose"
        >
          <p className="text-xs text-red-700 mb-1 font-semibold">⚠️ 重要な免責事項</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            このページの NAV / リターン / 配分推奨は、<strong>過去データに特定のルールを当てはめた「バックテスト」および「シミュレーション」</strong>の結果です。
            <strong className="mx-1">投資助言・投資勧誘ではなく</strong>、特定の金融商品の売買を推奨するものではありません。
            現実の取引では、手数料・税金・スリッページ・約定遅延など、ここでは一切考慮していないコストが発生します。投資判断はご自身の責任で行ってください。
          </p>
        </div>

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
          最終更新: <time dateTime={history.generatedAt}>{history.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）
        </p>

        <section id="intro" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-2 mb-3">
            温度でポートフォリオを動かすと、どうなるのか？
          </h2>
          <p className="leading-relaxed">
            株温計の温度スコア（0-100）は、「市場が今どれくらい熱狂 / 悲観しているか」を示すセンチメント指標です。ではその温度に応じて、
            機械的に<strong>株と現金の配分を月次に入れ替える</strong>と、過去どのような結果になっていたのでしょうか。このページは、日経225 と S&amp;P500 の 2 市場で、そのシミュレーションを公開するものです。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-sm leading-relaxed">
            <li>
              🇯🇵 <strong>日本版</strong>: 累計 {jpStats.totalReturn >= 0 ? "+" : ""}
              {jpStats.totalReturn.toFixed(2)}% / 最大DD {jpStats.maxDrawdown.toFixed(2)}%
              （ベンチマーク: {jpStats.benchmarkReturn >= 0 ? "+" : ""}
              {jpStats.benchmarkReturn.toFixed(2)}% / {jpStats.benchmarkMaxDrawdown.toFixed(2)}%）
            </li>
            <li>
              🇺🇸 <strong>米国版</strong>: 累計 {usStats.totalReturn >= 0 ? "+" : ""}
              {usStats.totalReturn.toFixed(2)}% / 最大DD {usStats.maxDrawdown.toFixed(2)}%
              （ベンチマーク: {usStats.benchmarkReturn >= 0 ? "+" : ""}
              {usStats.benchmarkReturn.toFixed(2)}% / {usStats.benchmarkMaxDrawdown.toFixed(2)}%）
            </li>
          </ul>
          <p className="text-sm leading-relaxed mt-3 text-gray-600">
            過去10年は両市場とも強い上昇相場だったため、絶対リターンでは 100% 株の buy &amp;
            hold に劣後します。一方で、<strong>ドローダウン（最大下落率）は大きく抑制</strong>されています。リスク調整後パフォーマンスは記事下部の Sharpe 列をご覧ください。
          </p>
        </section>

        <section id="rule" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            ルールの説明
          </h2>
          <p className="leading-relaxed">
            毎月第一営業日に、その時点の温度スコアをもとに下の配分表に従って株 : 現金を再配分します。
            配分は「ニュートラル 60 : 40 を基準に、温度に応じて ±30% の範囲で振る」ルール設定です。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-sm border border-gray-200 rounded-lg">
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
          <p className="text-sm leading-relaxed mt-3 text-gray-600">
            極寒（総悲観）のときに株の比率を上げ、沸騰（総楽観）のときに下げる<strong>逆張り型</strong>のルールです。リバランスは月次で、ポジション変更は月初 1 回のみ。
          </p>
        </section>

        <section id="body" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            バックテスト結果
          </h2>
          <p className="leading-relaxed text-sm text-gray-600 mb-4">
            下のタブで日本版 / 米国版を切替、期間切替で 1年 / 5年 / 10年の NAV 推移をご覧いただけます。
          </p>
          <PortfolioBody history={history} />
        </section>

        <section id="method" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            データと手法
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-sm leading-relaxed">
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
              <strong>ベンチマーク</strong>: 同じ銘柄を初日に 100% 買って保有し続ける buy &amp; hold
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
              {" "}<code className="text-xs">snapshot:portfolio</code>
              {" "}で新規価格と温度を取り込み、JSON を差分更新 → Vercel 再デプロイ
            </li>
          </ul>
        </section>

        <section id="biases" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
            バックテストに内在するバイアス
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm leading-relaxed">
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
              <strong>温度スコア自体の過剰最適化リスク</strong>: 株温計のスコア（特に日本版 C1+C5）は現在の相場特性をもとに閾値が設計されています。<strong>将来も同じ働きをする保証はありません</strong>
            </li>
          </ul>
        </section>

        <section id="related" className="scroll-mt-16">
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">関連リンク</h2>
          <ul className="list-disc pl-6 space-y-2 text-sm">
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                今日の日米温度を見る
              </Link>{" "}
              — ポートフォリオが次回リバランスでどう動くかの参考に
            </li>
            <li>
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX × S&amp;P500 × 株温計
              </Link>{" "}
              — 温度ベースの逆張りの過去検証
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
          <p className="mt-8 text-xs text-gray-500 leading-relaxed">
            ※ 本ページの情報は投資助言ではありません。バックテスト結果は過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身のリスク許容度に応じて行ってください。データ出典: Yahoo Finance（^N225 / ^GSPC / ^VIX / USDJPY=X）、日本温度履歴は株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
