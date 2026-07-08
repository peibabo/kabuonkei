import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import SectorRotationBody from "@/components/analysis/SectorRotationBody";
import InvestingBooksCTA from "@/components/analysis/InvestingBooksCTA";
import { getJapanSectorHeatmap } from "@/lib/japan-sector-heatmap";
import {
  getSectorRankingForLevel,
  computeLevelAverages,
  computeGroupAverage,
  DEFENSIVE_SECTOR_CODES,
  CYCLICAL_SECTOR_CODES,
} from "@/lib/sector-rotation";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_PATH = "/analysis/sector-rotation-temperature";
const ARTICLE_TITLE =
  "暴落時に強い業種はどれ？— 温度帯×17業種の過去10年検証";
const ARTICLE_DESCRIPTION =
  "「暴落時はディフェンシブ銘柄」は本当か？株温計の市場温度が極寒（総悲観）だった日の後、TOPIX-17 の 17 業種がどう動いたかを過去10年の日次データで集計。極寒後に最も戻ったのは食品や医薬品ではなく機械・電機・鉄鋼という意外な結果と、温度帯ごとのセクターローテーションの傾向を検証します。";
const PUBLISHED_AT = "2026-07-08";

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "暴落時 強い業種",
    "ディフェンシブ銘柄",
    "セクターローテーション",
    "景気敏感株",
    "業種別 リターン",
    "TOPIX-17",
    "株温計",
    "市場センチメント",
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
  { href: "#conclusion", label: "結論を先に" },
  { href: "#framework", label: "検証の枠組み" },
  { href: "#body", label: "データで見る（期間切替つき）" },
  { href: "#interpretation", label: "どう解釈するか" },
  { href: "#caveats", label: "注意点・バイアス" },
  { href: "#related", label: "関連リンク" },
];

export default function SectorRotationTemperaturePage() {
  const heatmap = getJapanSectorHeatmap();

  // 本文の数値は 3ヶ月後を基準に、静的 JSON から動的に算出する
  // （毎月の再生成で本文の数字も自動で追従する）
  const cold = getSectorRankingForLevel("極寒", "3m");
  const coldTop = cold[0];
  const coldTop3 = cold.slice(0, 3);
  const boiling = getSectorRankingForLevel("沸騰", "3m");
  const boilTop3 = boiling.slice(0, 3);
  const boilWorst = boiling[boiling.length - 1];

  const averages = computeLevelAverages("3m");
  const coldAvg = averages[0];
  const hotAvg = averages[3];
  const boilAvg = averages[4];

  const defCold = computeGroupAverage(DEFENSIVE_SECTOR_CODES, "極寒", "3m");
  const cycCold = computeGroupAverage(CYCLICAL_SECTOR_CODES, "極寒", "3m");

  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: heatmap.generatedAt,
  });
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "分析記事", path: "/analysis" },
    { name: "温度帯×業種の検証" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="sector-rotation-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="sector-rotation-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <StaticPageLayout title={`🔄 ${ARTICLE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />

        <section
          id="conclusion"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">
            📖 結論を先に
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base text-gray-800 leading-relaxed">
            <li>
              <strong>「暴落時（極寒）に強いのはディフェンシブ」は、その後のリターンで見ると過去10年では逆</strong>。極寒帯の後3ヶ月で最も戻ったのは
              <strong>
                {coldTop3.map((r) => r.sector.name).join("・")}
              </strong>
              といった景気敏感の製造業で、トップの{coldTop.sector.name}は平均{" "}
              <strong className="text-red-600">
                +{coldTop.stats.avgReturn.toFixed(1)}%（勝率{" "}
                {coldTop.stats.winRate.toFixed(0)}%）
              </strong>
              。ディフェンシブ3業種（食品・医薬品・電力ガス）の平均 +
              {defCold.toFixed(1)}% に対し、景気敏感3業種は +
              {cycCold.toFixed(1)}% と約{" "}
              {(cycCold - defCold).toFixed(0)}pp の差がついた
            </li>
            <li>
              <strong>沸騰（総楽観）で強いのは資源・金融バリュー</strong>（
              {boilTop3.map((r) => r.sector.name).join("・")}
              ）。一方、{boilWorst.sector.name}は平均{" "}
              {boilWorst.stats.avgReturn.toFixed(1)}%（勝率{" "}
              {boilWorst.stats.winRate.toFixed(0)}%）と失速しており、
              <strong>温度帯によって強い業種は明確に入れ替わる</strong>
            </li>
            <li>
              全業種平均で見ると<strong>極寒後（+{coldAvg.avgAcrossSectors.toFixed(1)}%）と沸騰後（+{boilAvg.avgAcrossSectors.toFixed(1)}%）が高く、過熱帯（+{hotAvg.avgAcrossSectors.toFixed(1)}%）が最も低い</strong>「U字カーブ」。中途半端に熱い相場での新規買いが、過去10年では最も分が悪かった
            </li>
          </ul>
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">
            ※「ディフェンシブが役に立たない」という意味ではありません。下落局面の<strong>途中</strong>で値持ちが良いのは依然ディフェンシブの性質です。この検証が示すのは「<strong>底値圏から反発する局面では、下がりにくかった業種は戻りも小さい</strong>」という対称性です（詳細は解釈セクションで）。
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
          最終更新:{" "}
          <time dateTime={heatmap.generatedAt}>{heatmap.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）｜
          データは毎月1日に自動更新
        </p>

        <section id="framework" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
            検証の枠組み
          </h2>
          <p className="text-base leading-relaxed">
            「暴落時はディフェンシブ銘柄に逃げろ」「景気敏感株は買い時が難しい」——
            業種（セクター）選びの通説は多いですが、<strong>市場心理の状態ごとに検証した日本株のデータ</strong>はあまり公開されていません。そこでこの記事では、株温計の日本版温度スコア（0-100）を使って過去10年（
            {heatmap.dataRange.from} 〜 {heatmap.dataRange.to}
            ）の全営業日を 5 つの温度帯に分類し、
            <strong>
              「その温度帯だった日に買っていたら、17 業種それぞれがその後
              1・3・6 ヶ月でどう動いたか」
            </strong>
            を集計しました。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-base leading-relaxed">
            <li>
              <strong>温度帯</strong>: 極寒（0-20）/ 冷え込み（21-40）/
              平温（41-60）/ 過熱（61-80）/ 沸騰（81-100）。温度は C1（日経225
              vs 125日移動平均）+ C5（ドル円モメンタム）の 2 要素簡易版
            </li>
            <li>
              <strong>業種</strong>: 東証 TOPIX-17 シリーズの 17 分類。リターンは連動
              ETF（NEXT FUNDS 1617〜1633）の終値を proxy に算出
            </li>
            <li>
              <strong>基データ</strong>:{" "}
              <Link href="/sectors" className="underline hover:text-gray-900">
                温度帯別 業種ヒートマップ
              </Link>
              と同一（17業種 × 5温度帯 × 1/3/6ヶ月の平均リターン・勝率）。この記事はそのデータを「業種選びの通説の検証」という切り口で読み解くものです
            </li>
          </ul>
        </section>

        <section id="body" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            データで見る
          </h2>
          <p className="leading-relaxed text-base text-gray-600 mb-4">
            期間切替（1ヶ月/3ヶ月/6ヶ月）で、温度帯別の全業種平均・極寒 vs
            沸騰の対比・ディフェンシブ vs 景気敏感の比較をご覧いただけます。
          </p>
          <SectorRotationBody />
        </section>

        <section id="interpretation" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            どう解釈するか
          </h2>
          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            ① 極寒で「守りの業種」の戻りが小さいのは対称性の裏返し
          </h3>
          <p className="text-base leading-relaxed mb-3">
            ディフェンシブ業種（食品・医薬品・電力ガス）は値動きのβ（市場感応度）が低く、
            <strong>下落局面の途中では確かに下がりにくい</strong>一方、
            <strong>底値圏からの反発局面でも上がりにくい</strong>——
            この検証が示すのはその対称性です。極寒帯は「すでに大きく下げた後」の状態なので、そこからの前方リターンを測ると、下げのきつかった景気敏感業種（
            {coldTop3.map((r) => r.sector.name).join("・")}
            ）のリバウンドが最も大きく出ます。「暴落の<strong>前</strong>にディフェンシブへ退避する」のと「暴落の<strong>後</strong>にディフェンシブを買う」のはまったく別の行為だ、というのが実務上の示唆です。
          </p>
          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            ② 沸騰で強い資源・金融は「熱い相場の最終ランナー」
          </h3>
          <p className="text-base leading-relaxed mb-3">
            沸騰帯の後に強いのはエネルギー資源・鉄鋼非鉄・銀行といった資源・金利敏感のバリュー系でした。過去10年では、相場の過熱が進むとインフレ・金利上昇への期待が資源と金融に回る展開（2021〜2023年の商社・銀行相場など）が多かったことと整合的です。逆に情報通信などのグロース系は沸騰帯の後に失速する傾向が出ています。
          </p>
          <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2">
            ③ どの温度帯でも順位が動かない業種もある
          </h3>
          <p className="text-base leading-relaxed">
            電機・精密は沸騰帯を除く 4 つの温度帯でほぼ常に TOP3 圏に入り続けています（過去10年の半導体・AI 相場の強さそのもの。ただし沸騰帯の後だけは 17 業種中 12 位前後に沈み、②のグロース失速パターンに合流します）。逆に運輸・物流はほとんどの温度帯で 15 位以下でした。つまり業種リターンには<strong>「温度で入れ替わる部分」と「10年間の構造トレンドで決まっている部分」が混在</strong>しており、この表だけで「温度を見れば勝てる」とは言えません。
          </p>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            注意点・バイアス
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong className="text-red-700">極寒帯のサンプルは {coldAvg.occurrences} 日と少ない</strong>。しかも過去10年の極寒は、コロナショック（2020）や令和のブラックマンデー（2024）のように<strong>V字回復した暴落</strong>が中心です。リーマン級の長期下落（下げ続けて極寒が何ヶ月も続く相場）が来た場合、「極寒で景気敏感を買えば戻る」がそのまま通用する保証はありません
            </li>
            <li>
              <strong>温度は 2 要素簡易版</strong>（C1+C5）。トップページの 5
              要素スコアとは計算が異なります
            </li>
            <li>
              <strong>業種リターンは ETF proxy</strong>。信託報酬・乖離を含み、東証33業種分類とも異なります
            </li>
            <li>
              <strong>重複サンプル</strong>: 温度帯は連続する日で重なるため、各サンプルは独立ではありません（同じ暴落局面を複数日カウントしています）
            </li>
            <li>
              過去10年は日米ともに強い上昇相場でした。全業種平均がどの温度帯でもプラス寄りなのはこのレジームの産物で、<strong>将来のリターンを保証するものではありません</strong>
            </li>
          </ul>
        </section>

        <InvestingBooksCTA
          placement="bottom_cta"
          article="sector-rotation-temperature"
        />

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連リンク
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              <Link
                href="/sectors"
                className="underline hover:text-gray-900 font-semibold"
              >
                温度帯別 業種ヒートマップ（17業種 × 5温度帯の全データ）
              </Link>{" "}
              — この記事の基データ。全業種 × 全温度帯を一覧できます
            </li>
            <li>
              <Link href="/" className="underline hover:text-gray-900">
                ダッシュボード（今日の日米温度）
              </Link>{" "}
              — 今の温度帯を確認してから表に当てはめる
            </li>
            <li>
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？
              </Link>{" "}
              — 恐怖指数側からの同型の検証
            </li>
            <li>
              <Link
                href="/portfolio"
                className="underline hover:text-gray-900"
              >
                温度連動バーチャルポートフォリオ
              </Link>{" "}
              — 温度で配分を変えるとどうなるかの正直な検証
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は情報提供のみを目的としており、投資助言・特定業種や銘柄の売買推奨ではありません。掲載する統計は過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任で行ってください。データ出典:
            Yahoo Finance（^N225 / USDJPY=X / TOPIX-17 連動
            ETF）、温度スコアは株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
