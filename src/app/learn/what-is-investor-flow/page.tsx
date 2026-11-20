import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import ForwardReturnTable, { LearnDataTable } from "@/components/learn/ForwardReturnTable";
import { getLearnExtraStats } from "@/lib/learn-extra-stats";
import { formatOkuYen, formatReturn } from "@/lib/format";

const ARTICLE_PATH = "/learn/what-is-investor-flow";
const ARTICLE_TITLE =
  "投資部門別売買動向とは？外国人投資家のフローを毎週どう読むか";
const ARTICLE_DESCRIPTION =
  "投資部門別売買状況（JPX 公表）の見方を初心者向けに解説。外国人投資家・個人・自己・投資信託など主体別の現物/先物の売買フローを、株温計での表示のしかたも含めて整理。なぜ外国人フローが日本市場の主役と言われるのかも具体的な数字で示し、2016 年からの週次データで外国人の売買と日経225 の関係を検証します。";
const PUBLISHED_AT = "2026-05-08";
const MODIFIED_AT = "2026-11-20";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "投資部門別売買状況",
    "投資主体別売買動向",
    "外国人投資家 動向",
    "外国人 売り越し",
    "JPX 投資部門別",
    "海外投資家",
    "日本株 売買比率",
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
  { href: "#what", label: "投資部門別売買動向とは" },
  { href: "#categories", label: "主要な投資主体 6 区分" },
  { href: "#foreign", label: "なぜ外国人フローが主役なのか" },
  { href: "#how-to-read", label: "読み方のコツ 4 つ" },
  { href: "#data", label: "株温計のデータで確かめると（2016 年〜）" },
  { href: "#temperature", label: "温度スコアとの関係（株温計での扱い）" },
  { href: "#where", label: "毎週どこで確認できるか" },
  { href: "#related", label: "関連用語・関連記事" },
];

const CATEGORIES = [
  {
    name: "海外投資家（外国人）",
    summary:
      "外為法上の非居住者。海外のヘッジファンド・年金・ソブリンウェルス・パッシブ運用機関を含む。日本株売買の主役で、フローの方向感が日経225 の方向と最も連動する",
  },
  {
    name: "個人",
    summary:
      "個人投資家全体。短期で逆張りに動きやすい性質があり、外国人と逆方向の売買になることが多い（外国人売り越しのとき個人が買い越す等）",
  },
  {
    name: "自己（証券会社）",
    summary:
      "証券会社が自己勘定で売買した分。マーケットメイク・在庫調整・先物との裁定が中心で、相場観というより需給の中間調整役",
  },
  {
    name: "投資信託",
    summary:
      "国内の投資信託・資産運用会社の売買。日経やTOPIX に連動する ETF の買い増し・解約に伴う動きが主",
  },
  {
    name: "信託銀行",
    summary:
      "年金基金等の運用受託先として動く部分が中心。GPIF（年金積立金管理運用独立行政法人）のリバランスや国内年金のフローはここに表れる",
  },
  {
    name: "その他法人・生保損保等",
    summary:
      "国内事業法人の自社株買いや、生命保険・損害保険会社の運用フロー。長期的・低頻度な動きが多い",
  },
];

/** 3・9・12 月（期末・中間期末・海外ファンドの決算が多い月）に始まった回 */
const isSeasonalMonth = (date: string) => ["03", "09", "12"].includes(date.slice(5, 7));

export default function WhatIsInvestorFlowPage() {
  const flow = getLearnExtraStats().investorFlow;
  const bigSell = flow.bands[0];
  const bigBuy = flow.bands[flow.bands.length - 1];
  const base3m = flow.baseline.returns["3m"].avgReturn;
  // 「公表後は五分五分」は、同じ週ははっきり一致し（6 割以上）、公表後は 45〜55% に収まるときだけ書く
  const onlySameWeek =
    flow.sameWeek.matchRate >= 60 &&
    flow.afterPublish.matchRate >= 45 &&
    flow.afterPublish.matchRate <= 55;
  const mostlyOpposite = flow.foreignVsIndividual.oppositeRate > 55;
  // 「大きく売り越した後も平均を下回らなかった」は 3ヶ月後の平均が全週以上のときだけ
  const bigSellNotWorse = bigSell != null && bigSell.returns["3m"].avgReturn >= base3m;
  const bigBuyNotWorse = bigBuy != null && bigBuy.returns["3m"].avgReturn >= base3m;
  const seasonalSells = bigSell?.episodeStarts.filter(isSeasonalMonth).length ?? 0;
  const seasonalBuys = bigBuy?.episodeStarts.filter(isSeasonalMonth).length ?? 0;
  // 12 か月のうち 3 か月なので偶然なら 4 分の 1。半分を超えたときだけ偏りとして書く
  const sellsSeasonal = bigSell != null && bigSell.episodes > 0 && seasonalSells / bigSell.episodes > 0.5;
  const weekCount = flow.sameWeek.weeks;
  const fromYear = flow.dataRange.from.slice(0, 4);

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
    { name: "投資部門別売買動向とは" },
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
            href="/glossary#investor-type-trading"
            className="underline hover:text-gray-700"
          >
            用語集「投資主体別売買動向」
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
              <strong>投資部門別売買動向</strong>（正式名称: 投資部門別売買状況）は、JPX が
              <strong>毎週木曜日 15:30</strong>{" "}
              に公表する週次の需給データ。投資主体別に現物・先物の買越額／売越額が分かる
            </li>
            <li>
              <strong>主役は外国人投資家（海外投資家）</strong>。2024 年実績で
              <strong>現物市場の売買シェア 59.1% / 先物市場 75.7%</strong>を占め、
              日経225 の方向感を最も大きく左右する主体
            </li>
            <li>
              個人と外国人は<strong>逆方向に動くことが多い</strong>。外国人売り越し → 個人買い向かい、というパターンは下落相場の代表的なサイン
            </li>
            {onlySameWeek && (
              <li>
                株温計で {fromYear} 年からの {weekCount} 週を調べると、海外投資家の売買の向きは
                <strong>同じ週の日経225 とは {flow.sameWeek.matchRate.toFixed(0)}% 一致</strong>するものの、
                <strong>データが公表された後の 1 週間では {flow.afterPublish.matchRate.toFixed(0)}%</strong>
                とほぼ五分五分。先を読む材料ではなく「いま誰が動いているか」を知るデータです
              </li>
            )}
            <li>
              株温計では外国人フローを温度には混ぜず、<strong>直近 4 週の売買差引の実数</strong>を日経225 の市場温度の下に毎日表示しています
            </li>
          </ul>
        </section>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            投資部門別売買動向とは
          </h2>
          <p className="text-base leading-relaxed">
            <strong>投資部門別売買動向</strong>（JPX の正式名称は「<strong>投資部門別売買状況</strong>」）は、
            日本取引所グループが<strong>誰がどれだけ日本株を売買したか</strong>を投資主体ごとに集計し、
            週次・月次・年次で公表しているデータです。投資の世界で「需給を読む」と言うとき、
            最も基本的に参照される一次情報源です。
          </p>
          <p className="text-base leading-relaxed mt-3">
            データは<strong>東証・名証の二市場合算</strong>で集計され、現物株式と先物・オプションが別々に公表されます。
            週次データは原則<strong>毎週木曜日 15:30</strong>に、前週末（金曜日）までの売買が公開されます
            （祝日等で営業日がずれる場合は翌営業日に持ち越し）。月間データは月末締めの翌月、年間データは年明けに公開されます。
          </p>
          <p className="text-base leading-relaxed mt-3">
            集計手法は、<strong>東証が取引参加者（証券会社）からの報告を元に</strong>主体別に分類しているもので、
            同じ「外国人投資家」というラベルでもヘッジファンドからソブリンウェルス、パッシブ運用機関まで含まれる粒度です。
            よって「どの主体が」というよりは、<strong>「どの方向に資金が動いたか」をマクロに見るためのデータ</strong>と捉えるのが正しい使い方です。
          </p>
        </section>

        <section id="categories" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            主要な投資主体 6 区分
          </h2>
          <p className="text-base leading-relaxed">
            JPX の分類はもっと細かいですが、市場で言及されることが多い主要 6 区分は以下です。
            それぞれの主体の<strong>「動機」と「動きの癖」</strong>を押さえておくと、
            毎週の数字を意味のあるストーリーとして読めるようになります。
          </p>

          <ol className="list-decimal pl-6 mt-4 space-y-3 text-base leading-relaxed">
            {CATEGORIES.map((c, i) => (
              <li key={c.name}>
                <strong>{c.name}</strong>
                <span className="text-gray-500 text-sm ml-1">／第 {i + 1} 区分</span>
                <br />
                {c.summary}
              </li>
            ))}
          </ol>

          <p className="text-base leading-relaxed mt-4 text-gray-600">
            これら以外にも JPX は<strong>「都銀地銀等」「事業法人」</strong>等を別個に公表しますが、
            日本株の売買代金に占める比率は限定的なので、まずは上の 6 区分を押さえておけば十分です。
          </p>
        </section>

        <section id="foreign" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            なぜ外国人フローが主役なのか
          </h2>
          <p className="text-base leading-relaxed">
            日本株の売買代金における<strong>外国人投資家のシェアは 6〜7 割</strong>と言われます。
            JPX の 2024 年公表データでは、
          </p>

          <div className="overflow-x-auto not-prose mt-4">
            <table className="w-full text-base border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">市場</th>
                  <th className="px-3 py-2 text-right font-semibold">海外投資家シェア（2024）</th>
                </tr>
              </thead>
              <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
                <tr>
                  <td>現物市場（東証）</td>
                  <td className="text-right font-mono font-semibold">59.1 %</td>
                </tr>
                <tr>
                  <td>先物市場（日経225 先物・TOPIX 先物）</td>
                  <td className="text-right font-mono font-semibold">75.7 %</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-base leading-relaxed mt-3">
            特に<strong>先物市場では海外勢が 4 分の 3 を占める</strong>のがポイント。
            日経225 先物の方向感はほぼ海外勢が主導しており、
            日本株の指数水準（日経平均株価）が動く根本的な力学はここから始まります。
          </p>
          <p className="text-base leading-relaxed mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            💡 <strong>外国人 vs 個人の逆相関</strong>: 過去の暴落局面では、外国人が大量売り越しに入る一方で、
            個人投資家が買い向かうパターンがよく観察されます。
            <strong>2024 年 8 月 5 日の{" "}
            <Link
              href="/events/reiwa-black-monday-2024"
              className="underline hover:text-gray-900"
            >
              令和のブラックマンデー
            </Link>
            {" "}前後</strong>もまさにこの構図でした。
            個人の押し目買いが正解だった局面と、外国人の構造変化売りが正解だった局面の両方が混在するため、
            「個人と逆を行くと勝てる」と単純化するのは危険です。
          </p>
        </section>

        <section id="how-to-read" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            読み方のコツ 4 つ
          </h2>
          <ol className="list-decimal pl-6 space-y-3 text-base leading-relaxed">
            <li>
              <strong>累積で見る</strong>: 単週の買越/売越額だけ見ても判断材料にしづらい。
              <strong>4 週累計・13 週（四半期）累計</strong>でフローの方向感を捉えるのが基本。年初来累計も重要な指標
            </li>
            <li>
              <strong>現物と先物を分けて見る</strong>: 海外勢のヘッジ売り（先物売り）と現物売りは意味が違います。
              先物だけ売って現物を維持しているなら<strong>一時的なヘッジ調整</strong>、
              現物まで売っているなら<strong>本格的な日本株離れ</strong>のサインの可能性があります
            </li>
            <li>
              <strong>個人との対比で読む</strong>: 外国人売り越し × 個人買い越しが続くパターンは
              「下げ止まりのテストか、買い向かう個人が踏まれるか」の分岐点。後者の場合は下落が長引きやすい
            </li>
            <li>
              <strong>季節性に注意</strong>: 配当落ち期（3 月末・9 月末）、年度末（3 月末）、
              海外ファンドの決算月（多くは 12 月）など、需給に季節性のある時期は単純比較しないこと
            </li>
          </ol>
          <p className="text-base leading-relaxed mt-3 text-gray-600">
            「投資主体別売買動向は<strong>結果論として面白い</strong>のであって、
            これを基準にしてポジションを取ると振り回される」という批判もよく聞かれます。
            これは半分正しい——フロー自体に予測力はありませんが、
            <strong>「いま市場で誰が動いているか」の文脈把握には不可欠</strong>、というのが実務的な使い方です。
          </p>
        </section>

        <section id="data" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            株温計のデータで確かめると（{fromYear} 年〜）
          </h2>
          <p className="text-base leading-relaxed">
            JPX の週次データ（東証・名証の合計）を {flow.dataRange.from} の週から {flow.dataRange.to} の週まで{" "}
            {weekCount} 週分集め、ここまでの説明が数字でも言えるかを確かめました。
            その後の日経225 は、データが公表された翌営業日（翌週の第 4 営業日の次の営業日、ふつうは金曜）の終値から数えています。
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            ① 株価と同じ向きなのは「その週」だけ
          </h3>
          <LearnDataTable caption={`海外投資家の売買の向き（買い越し / 売り越し）と日経225 の上げ下げが一致した割合（${flow.dataRange.from}〜${flow.dataRange.to}、株温計調べ）`}>
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left font-semibold">比べたもの</th>
                <th className="text-right font-semibold">向きが一致した割合</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>同じ週の日経225</td>
                <td className="text-right font-mono font-semibold">
                  {flow.sameWeek.matchRate.toFixed(1)}%（{flow.sameWeek.weeks} 週）
                </td>
              </tr>
              <tr>
                <td>公表翌日から 1 週間の日経225</td>
                <td className="text-right font-mono font-semibold">
                  {flow.afterPublish.matchRate.toFixed(1)}%（{flow.afterPublish.weeks} 週）
                </td>
              </tr>
            </tbody>
          </LearnDataTable>
          <p className="text-base leading-relaxed mt-3">
            {onlySameWeek ? (
              <>
                海外投資家が買い越した週は日経225 も上がり、売り越した週は下がる、という一致は約{" "}
                {Math.round(flow.sameWeek.matchRate / 10)} 割ありました。主役と言われるだけのことはあります。
                ところが、データが公表された後の 1 週間で見ると一致は {flow.afterPublish.matchRate.toFixed(0)}% で、
                コインを投げるのと変わりません。上の「結果論として面白い」は、数字で見てもその通りでした。
              </>
            ) : (
              <>
                同じ週の一致は {flow.sameWeek.matchRate.toFixed(0)}%、公表後の 1 週間は{" "}
                {flow.afterPublish.matchRate.toFixed(0)}% でした。
              </>
            )}
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            ② 海外投資家と個人は逆に動く週が多い
          </h3>
          <p className="text-base leading-relaxed">
            片方が買い越し、もう片方が売り越しだった週は{" "}
            <strong>
              {flow.foreignVsIndividual.weeks} 週のうち {flow.foreignVsIndividual.oppositeRate.toFixed(0)}%
            </strong>
            でした。
            {mostlyOpposite &&
              `「個人は外国人と逆方向に動くことが多い」は、${fromYear} 年からのデータでも当てはまります。`}
          </p>

          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            ③ 大きく売り越した後、日経225 はどうなったか
          </h3>
          <p className="text-base leading-relaxed">
            株温計のトップページと同じく、海外投資家の<strong>直近 4 週の合計</strong>で分けました。
            区切りは ±1 兆円です。
          </p>
          <ForwardReturnTable
            caption={`海外投資家の 4 週累計（東証・名証）の帯別・公表翌日からの日経225（${flow.dataRange.from}〜${flow.dataRange.to}、株温計調べ）`}
            conditionLabel="海外投資家の 4 週累計"
            countUnit="週"
            periods={[
              { key: "3m", label: "3ヶ月後" },
              { key: "6m", label: "6ヶ月後" },
            ]}
            rows={[
              ...flow.bands.map((b) => ({
                label: `${b.band}（${b.episodes} 回）`,
                count: b.occurrences,
                stats: b.returns,
                highlight: b === bigSell,
              })),
              { label: "すべての週", count: flow.baseline.occurrences, stats: flow.baseline.returns },
            ]}
          />
          <p className="text-base leading-relaxed mt-3">
            {bigSellNotWorse && bigSell && (
              <>
                4 週で 1 兆円以上売り越した後も、3ヶ月後の日経225 は平均{" "}
                <strong>
                  {formatReturn(bigSell.returns["3m"].avgReturn)}・勝率 {bigSell.returns["3m"].winRate.toFixed(0)}%
                </strong>
                で、すべての週の平均 {formatReturn(base3m)} を下回りませんでした。
                {bigBuyNotWorse && bigBuy && (
                  <>
                    大きく買い越した後も平均以上でした
                    {bigBuy.returns["6m"].winRate > bigSell.returns["6m"].winRate &&
                      `（6ヶ月後の勝率は買い越しの後が ${bigBuy.returns["6m"].winRate.toFixed(0)}%、売り越しの後が ${bigSell.returns["6m"].winRate.toFixed(0)}% で、買い越しの後のほうが高め）`}
                    。少なくともこの期間では、外国人の大量の売りを見て慌てて売っても、得にはなっていません。
                  </>
                )}
              </>
            )}
            {sellsSeasonal && bigSell && bigBuy && (
              <>
                {bigSellNotWorse && " "}
                また、1 兆円以上の売り越しの {bigSell.episodes} 回のうち <strong>{seasonalSells} 回は 3・9・12 月</strong>
                に始まっていました（12 か月のうち 3 か月なので、偶然なら 4 分の 1 ほど）。
                1 兆円以上の買い越しの {bigBuy.episodes} 回のうち、この 3 つの月に始まったのは {seasonalBuys} 回です。
                国内企業の期末・中間期末や海外ファンドの決算が多い時期と重なっており、上の「季節性に注意」はここに表れています。
              </>
            )}
          </p>
          <p className="text-sm leading-relaxed mt-3 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
            ⚠️{" "}
            {base3m > 0 &&
              `${fromYear} 年からは、すべての週で見ても 3ヶ月後の日経225 が平均 ${formatReturn(base3m)} と上がりやすかった期間で、どの帯の成績もその影響を受けています。`}
            また 1 回の局面で何週も同じ帯に入るため、週数ほど独立した事例はありません（表の「回」が、続いた週をひとまとめにした回数です）。
            数字は東証・名証の合計で、東証プライムだけの数字とは週によって数千億円ずれることがあります。
            {flow.latest && (
              <>
                {" "}なお {flow.latest.endDate} の週までの 4 週累計は{" "}
                {formatOkuYen(flow.latest.foreign4w)}（{flow.latest.foreign4w < 0 ? "売り越し" : "買い越し"}）です。
              </>
            )}
          </p>
        </section>

        <section id="temperature" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            温度スコアとの関係（株温計での扱い）
          </h2>
          <p className="text-base leading-relaxed">
            株温計の日本版では、外国人投資家の<strong>直近 4 週の売買差引の合計</strong>を、信用買い残の 4 週変化と並べて
            ゲージの下に別枠で表示しています（例:「4 週で 5,771 億円の売り越し」）。
            0〜100 の温度には換算していません。2016 年以降の毎日の値（公表の遅れも再現）で確かめたところ、
            上の ③ のように大きな売り越しの後も買い越しの後も平均を下回らないなど、
            「売り越しなら冷たい」という一方向の関係が見られなかったためです。
          </p>
          <p className="text-base leading-relaxed mt-3">
            2026 年 11 月までは、外国人フローを日経225 の移動平均乖離・信用倍率・裁定残・ドル円の勢いと合わせた 5 要素の平均で
            市場温度を出していました。しかし JPX の公表は週 1 回で、データが温度に反映されるのは週末から 1〜2 週後です。
            急落の当日には前の週までの「買い越し」が残っていて、温度を高めに見せてしまうことがありました。
          </p>
          <p className="text-base leading-relaxed mt-3">
            そこで現在は、<strong>市場温度を日経225 の 125 日移動平均乖離だけで決め</strong>、
            外国人フローは市場温度に混ぜずに、実数のまま参考として並べる形にしています。
            「株価は冷えているのに外国人はまだ買い越し」のような、株価と需給の食い違いをそのまま読めるのがこの形の利点です。
          </p>
        </section>

        <section id="where" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            毎週どこで確認できるか
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong>JPX 公式</strong>:{" "}
              <a
                href="https://www.jpx.co.jp/markets/statistics-equities/investor-type/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-900"
              >
                投資部門別売買状況（週間）
              </a>
              {" "}— 毎週木曜日 15:30 に Excel / PDF で公表される一次情報源
            </li>
            <li>
              <strong>大手証券・トレーダーズウェブ等</strong>: 主要主体の累計推移をグラフ化した二次情報。
              累計を見るのに便利
            </li>
            <li>
              <strong>株温計のトップページ</strong>: 日本市場データセクションで外国人投資家フローの
              直近水準と推移を可視化。市場温度のゲージの下には、外国人フローの直近 4 週の合計も出しています
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            毎週木曜日に必ず数字を追う必要はありません。<strong>大型イベント（FOMC・SQ・選挙・決算ピーク）の前後</strong>と、
            <strong>株価が大きく動いた直後</strong>の主体別フローだけ確認するのが現実的な頻度です。
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
                href="/glossary#investor-type-trading"
                className="underline hover:text-gray-900"
              >
                投資主体別売買動向
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
                href="/glossary#arbitrage-balance"
                className="underline hover:text-gray-900"
              >
                裁定残
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
              解説記事:{" "}
              <Link
                href="/learn/what-is-margin-ratio"
                className="underline hover:text-gray-900"
              >
                信用倍率とは？
              </Link>
              {" "}/{" "}
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
              主要イベント:{" "}
              <Link
                href="/events/reiwa-black-monday-2024"
                className="underline hover:text-gray-900"
              >
                令和のブラックマンデー（2024-08-05、外国人売り×個人買いの典型）
              </Link>
            </li>
            <li>
              トップ:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                今日の市場温度・外国人投資家フローを確認する
              </Link>
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は投資部門別売買動向という指標の理解を助けることを目的とした解説記事であり、
            特定の金融商品の売買を推奨するものではありません。引用している統計（2024 年シェア値等）は JPX 公表データに基づきますが、
            年次で変動する数字であるため最新の数字は JPX 公式でご確認ください。
            投資判断はご自身のリスク許容度に応じて行ってください。データ出典: 日本取引所グループ（JPX）「投資部門別売買状況」（週間）、日経225 は Yahoo Finance。集計は株温計。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
