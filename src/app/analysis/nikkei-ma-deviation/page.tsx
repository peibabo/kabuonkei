import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import InvestingBooksCTA from "@/components/analysis/InvestingBooksCTA";
import AnalysisViewTracker from "@/components/analysis/AnalysisViewTracker";
import {
  DEVIATION_BANDS,
  DEVIATION_PERIOD_KEYS,
  DEVIATION_PERIOD_LABELS,
  deviationToTemperature,
  findDeviationBand,
  getNikkeiMaDeviationAnalysis,
  MA_DEVIATION_ARTICLE,
  winCount,
  type DeviationEpisode,
} from "@/lib/nikkei-ma-deviation-analysis";
import type { PeriodStats } from "@/lib/historical-stats";
import { formatReturn, returnColorClass } from "@/lib/format";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_SLUG = MA_DEVIATION_ARTICLE.slug;
const ARTICLE_PATH = MA_DEVIATION_ARTICLE.path;
const ARTICLE_TITLE = MA_DEVIATION_ARTICLE.title;
const ARTICLE_DESCRIPTION =
  "日経平均株価の125日移動平均線からの乖離率が大きくマイナス・プラスになった後、1ヶ月〜1年で株価はどう動いたか。1985年以降の約1万営業日を乖離率ごとに分けて検証。上に離れすぎた後は売り時だったのか、下に離れすぎた後は買い時だったのかを、日数と回数の両方で確かめます。株温計の市場温度はこの乖離率から計算しています。";
const PUBLISHED_AT = MA_DEVIATION_ARTICLE.publishedAt;

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "日経平均 移動平均乖離率",
    "125日移動平均 乖離率",
    "移動平均乖離率 買い時",
    "乖離率 売りサイン",
    "日経平均 125日線",
    "日経平均 買い時",
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
  { href: "#conclusion", label: "結論を先に" },
  { href: "#what", label: "125日線乖離率と市場温度" },
  { href: "#framework", label: "検証のやり方" },
  { href: "#bands", label: "乖離率ごとのその後" },
  { href: "#high", label: "上に離れすぎは売りのサインか" },
  { href: "#low", label: "下に離れすぎは買いのサインか" },
  { href: "#halves", label: "前半と後半で結果は同じか" },
  { href: "#now", label: "いまの乖離率" },
  { href: "#caveats", label: "注意点" },
];

function formatDeviation(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(1)}%`;
}

/** 区切りの温度の範囲（例: 「0〜17」） */
function temperatureRange(min: number | null, max: number | null): string {
  const lo = min == null ? 0 : deviationToTemperature(min);
  const hi = max == null ? 100 : deviationToTemperature(max);
  if (lo === hi) return `${lo}`;
  return `${lo}〜${hi}`;
}

function StatsCell({ stats }: { stats: PeriodStats }) {
  return (
    <td className="text-right py-2 px-2 font-mono">
      <span className={returnColorClass(stats.avgReturn)}>
        {formatReturn(stats.avgReturn)}
      </span>
      <span className="block text-xs text-gray-500">
        上昇 {stats.winRate.toFixed(0)}%
      </span>
    </td>
  );
}

function EpisodeTable({
  episodes,
  showDrawdown,
}: {
  episodes: DeviationEpisode[];
  showDrawdown: boolean;
}) {
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-300 text-gray-600">
            <th className="text-left py-2 pr-2 font-semibold">最初の日</th>
            <th className="text-right py-2 px-2 font-semibold">乖離率</th>
            {DEVIATION_PERIOD_KEYS.map((k) => (
              <th key={k} className="text-right py-2 px-2 font-semibold">
                {DEVIATION_PERIOD_LABELS[k]}
              </th>
            ))}
            {showDrawdown && (
              <th className="text-right py-2 pl-2 font-semibold">さらに下げた幅</th>
            )}
          </tr>
        </thead>
        <tbody>
          {[...episodes].reverse().map((e) => (
            <tr key={e.date} className="border-b border-gray-100">
              <td className="py-2 pr-2 font-mono text-gray-800">{e.date}</td>
              <td className="text-right py-2 px-2 font-mono text-gray-700">
                {formatDeviation(e.deviation)}
              </td>
              {DEVIATION_PERIOD_KEYS.map((k) => (
                <td
                  key={k}
                  className={`text-right py-2 px-2 font-mono ${returnColorClass(e.returns[k])}`}
                >
                  {formatReturn(e.returns[k])}
                </td>
              ))}
              {showDrawdown && (
                <td className="text-right py-2 pl-2 font-mono text-gray-700">
                  {e.isComplete
                    ? e.maxFurtherDrawdown === 0
                      ? "底"
                      : `${e.maxFurtherDrawdown.toFixed(1)}%`
                    : "観測中"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function NikkeiMaDeviationPage() {
  const analysis = getNikkeiMaDeviationAnalysis();
  const { baseline, extremeThreshold: th, episodeSummary, latest } = analysis;
  const firstYear = analysis.dataRange.from.slice(0, 4);
  const splitYm = `${analysis.halfSplitDate.slice(0, 4)}年${Number(analysis.halfSplitDate.slice(5, 7))}月`;
  const firstHalfLabel = `前半（${firstYear}年〜${splitYm}）`;
  const secondHalfLabel = `後半（${splitYm}〜）`;

  const base6 = baseline.all["6m"];
  const base1y = baseline.all["1y"];
  const lowBand = findDeviationBand(analysis, "le-15");
  const highBand = findDeviationBand(analysis, "ge15");
  const midLowBands = [
    findDeviationBand(analysis, "-15to-10"),
    findDeviationBand(analysis, "-10to-5"),
  ];
  const high6 = episodeSummary.high["6m"];
  const low6 = episodeSummary.low["6m"];
  const low1m = episodeSummary.low["1m"];

  // 本文の言い回しは毎月の再生成でデータが変わっても数字と食い違わないよう、データから決める
  const highBeatsBoth =
    highBand.firstHalf["6m"].winRate > baseline.firstHalf["6m"].winRate &&
    highBand.secondHalf["6m"].winRate > baseline.secondHalf["6m"].winRate;
  const highEpisodesBeat = high6.winRate > base6.winRate;
  const lowDaysBeat = lowBand.all["6m"].winRate > base6.winRate;
  /** 回数ベースの −15% 以下と普段の日の差。±5 ポイント以内は「ほとんど変わらない」とする */
  const lowEpisodesGap = low6.winRate - base6.winRate;
  const lowVsBase =
    lowEpisodesGap > 5 ? "より高い" : lowEpisodesGap < -5 ? "より低い" : "とほとんど変わらない";
  const midLowBelow = midLowBands.every((b) => b.all["6m"].winRate < base6.winRate);
  /**
   * 前半と後半で、普段の日との上下が入れ替わる区切り。
   * 1〜2 ポイントの差は誤差の範囲なので、どちらの時期も FLIP_MARGIN 以上離れているときだけ「逆」とする
   */
  const FLIP_MARGIN = 3;
  const flippedBands = DEVIATION_BANDS.filter((b) => {
    const s = findDeviationBand(analysis, b.key);
    if (s.firstHalf["6m"].sampleSize === 0 || s.secondHalf["6m"].sampleSize === 0) return false;
    const first = s.firstHalf["6m"].winRate - baseline.firstHalf["6m"].winRate;
    const second = s.secondHalf["6m"].winRate - baseline.secondHalf["6m"].winRate;
    return (
      Math.sign(first) !== Math.sign(second) &&
      Math.abs(first) >= FLIP_MARGIN &&
      Math.abs(second) >= FLIP_MARGIN
    );
  });
  const flippedLabels = flippedBands.map((b) => b.label);
  const midLowFlippedLabels = flippedBands
    .filter((b) => b.key === "-15to-10" || b.key === "-10to-5")
    .map((b) => b.label);
  /** +15% 以上の回のうち、1年後の成績が一番悪かった回（外れた例として本文に出す） */
  const worstHigh = analysis.highEpisodes
    .filter((e) => e.returns["1y"] != null)
    .reduce<DeviationEpisode | null>(
      (w, e) => (w == null || e.returns["1y"]! < w.returns["1y"]! ? e : w),
      null
    );

  const latestBandKey = latest.bandKey;
  const latestBandMeta = DEVIATION_BANDS.find((b) => b.key === latestBandKey)!;
  const latestBand = findDeviationBand(analysis, latestBandKey);
  const latestTemperature = latest.temperature;
  const latestFlipped = flippedBands.some((b) => b.key === latestBandKey);

  const jsonLd = buildArticleJsonLd({
    url: ARTICLE_PATH,
    headline: ARTICLE_TITLE,
    description: ARTICLE_DESCRIPTION,
    datePublished: PUBLISHED_AT,
    dateModified: analysis.generatedAt,
  });
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "分析記事", path: "/analysis" },
    { name: "125日線乖離率の検証" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="ma-deviation-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="ma-deviation-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <AnalysisViewTracker slug={ARTICLE_SLUG} />
      <StaticPageLayout title={`📏 ${ARTICLE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />

        <section
          id="conclusion"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">📖 結論を先に</h2>
          <ul className="list-disc pl-6 space-y-2 text-base text-gray-800 leading-relaxed">
            <li>
              <strong>
                上に +{th}%以上離れた後は、
                {highEpisodesBeat ? "売り時ではなかった" : "その後も上がりやすかったとは言えない"}
              </strong>
              。{firstYear}年以降に +{th}%を超えた {high6.sampleSize} 回のうち、6ヶ月後に上がっていたのは{" "}
              <strong className={highEpisodesBeat ? "text-red-600" : undefined}>
                {winCount(high6)} 回（{high6.winRate.toFixed(0)}%）
              </strong>
              で、普段の日に買った場合（{base6.winRate.toFixed(0)}%）
              {highEpisodesBeat ? "より高い" : "を上回っていない"}
              {highEpisodesBeat && highBeatsBoth
                ? "。日数で見ても、前半・後半どちらの時期でも同じ傾向でした"
                : ""}
            </li>
            <li>
              下に −{th}%以下まで離れた日は、日数で見ると6ヶ月後に上がっていた割合が{" "}
              {lowBand.all["6m"].winRate.toFixed(0)}%
              {lowDaysBeat ? "と普段より高い" : ""}。
              <strong>
                ただし回数（{low6.sampleSize} 回）で見ると、6ヶ月後に上がっていたのは {winCount(low6)}{" "}
                回（{low6.winRate.toFixed(0)}%）
                で、普段の日{lowVsBase}
              </strong>
              。1ヶ月後は {winCount(low1m)} 回（{low1m.winRate.toFixed(0)}%）上がっており、
              <strong>短い反発は起きやすいが、半年後まで上がっているとは限らない</strong>
            </li>
            {midLowBelow && (
              <li>
                −5%〜−{th}%の「そこそこ下げた」水準は、6ヶ月後に上がった割合が普段の日より低い
                {midLowFlippedLabels.length > 0 && (
                  <>
                    。しかも{midLowFlippedLabels.join("・")}は前半と後半で結果が逆になっていて、
                    <strong>乖離率だけを見て買い時を決めるのは難しい</strong>
                  </>
                )}
              </li>
            )}
          </ul>
        </section>

        <nav
          aria-label="目次"
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-base not-prose"
        >
          <p className="font-semibold text-gray-700 mb-2">📑 目次</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-none pl-0">
            {TOC_ITEMS.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-gray-600 hover:text-gray-900 hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-sm text-gray-400">
          最終更新: <time dateTime={analysis.generatedAt}>{analysis.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）｜データは毎月1日に自動更新
        </p>

        <section id="what" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
            125日線乖離率と市場温度
          </h2>
          <p className="text-base leading-relaxed">
            <strong>移動平均乖離率</strong>
            は、今の株価が過去の平均値からどれだけ離れているかを % で表したものです。125日（約半年）の移動平均を使うと、「この半年の平均と比べて、今どれくらい高いか・安いか」が分かります。
          </p>
          <p className="text-base leading-relaxed mt-3">
            株温計の
            <Link href="/" className="underline hover:text-gray-900">
              日本の市場温度
            </Link>
            は、この日経平均の125日線乖離率をそのまま 0〜100 に置き換えたものです。乖離率 −{th}%
            以下が温度 0、+{th}%以上が温度 100 で、その間はまっすぐ比例します。この記事の区切りと温度の対応は次のとおりです。
          </p>
          <div className="overflow-x-auto not-prose mt-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">125日線乖離率</th>
                  <th className="text-right py-2 px-2 font-semibold">市場温度</th>
                  <th className="text-right py-2 pl-2 font-semibold">日数</th>
                </tr>
              </thead>
              <tbody>
                {DEVIATION_BANDS.map((b) => (
                  <tr key={b.key} className="border-b border-gray-100">
                    <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                      {b.label}
                    </th>
                    <td className="text-right py-2 px-2 font-mono">
                      {temperatureRange(b.min, b.max)}
                    </td>
                    <td className="text-right py-2 pl-2 font-mono">
                      {findDeviationBand(analysis, b.key).all["1m"].sampleSize.toLocaleString()} 日
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="framework" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">検証のやり方</h2>
          <ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
            <li>
              <strong>期間</strong>: {analysis.dataRange.from} 〜 {analysis.dataRange.to} の日経平均の終値（
              {analysis.dayCount.toLocaleString()} 営業日）
            </li>
            <li>
              <strong>乖離率</strong>: その日の終値と、その日を含まない直前 {analysis.maWindow}{" "}
              営業日の終値の平均との差（市場温度と同じ計算）
            </li>
            <li>
              <strong>その後のリターン</strong>: その日の終値から 21・63・126・252
              営業日後（約1ヶ月・3ヶ月・6ヶ月・1年後）の終値までの値動き。配当は含みません
            </li>
            <li>
              <strong>日数と回数</strong>: 乖離率が大きい状態は何日も続くため、日数で数えると長い下げ相場が重く数えられます。±{th}
              %を超えた日は、前の該当日から {analysis.mergeWindow}{" "}
              営業日（約1ヶ月）以内なら同じ1回にまとめ、その最初の日に買った場合も計算しました
            </li>
            <li>
              <strong>前半と後半</strong>: 時期による違いを見るため、日数をちょうど半分に分けて（
              {analysis.halfSplitDate} から後半）同じ集計をしました
            </li>
          </ul>
        </section>

        <section id="bands" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">乖離率ごとのその後</h2>
          <p className="text-base leading-relaxed mb-3">
            その日の乖離率で分けて、その日に買った場合のリターンを並べました（日数ベース）。いちばん下は全営業日の平均です。
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">乖離率</th>
                  {DEVIATION_PERIOD_KEYS.map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {DEVIATION_PERIOD_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEVIATION_BANDS.map((b) => {
                  const s = findDeviationBand(analysis, b.key);
                  return (
                    <tr key={b.key} className="border-b border-gray-100">
                      <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                        {b.label}
                        <span className="block text-xs font-normal text-gray-500">
                          温度 {temperatureRange(b.min, b.max)}
                        </span>
                      </th>
                      {DEVIATION_PERIOD_KEYS.map((k) => (
                        <StatsCell key={k} stats={s.all[k]} />
                      ))}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300">
                  <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                    普段の日（全営業日）
                  </th>
                  {DEVIATION_PERIOD_KEYS.map((k) => (
                    <StatsCell key={k} stats={baseline.all[k]} />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            上の段は平均リターン、下の段は「買った日より値上がりしていた割合」。期間が経過していない日は除く。
          </p>
          <p className="text-base leading-relaxed mt-3">
            「平均から上に離れすぎたら下がる、下に離れすぎたら戻る」というのが乖離率のよくある使い方です。
            {highBand.all["6m"].winRate > base6.winRate && midLowBelow ? (
              <>
                ところが日経平均では、
                <strong>上に大きく離れた日の後も上がりやすく</strong>、−5%〜−{th}
                %の下げた水準の後は普段の日より上がりにくい、という形になっています。
                {lowDaysBeat &&
                  `一番下の −${th}%以下だけは、日数で見るとその後の成績が良くなっています（回数で見た場合は下の節）。`}
              </>
            ) : (
              <>日経平均で本当にそうなっているかは、上の表の各行を普段の日と比べてください。</>
            )}
          </p>
        </section>

        <section id="high" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            上に離れすぎは売りのサインか — +{th}%を超えた {analysis.highEpisodes.length} 回
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 not-prose mb-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">6ヶ月後に上がっていた回</p>
              <p className="text-2xl font-bold text-red-600">
                {winCount(high6)} / {high6.sampleSize} 回
              </p>
              <p className="text-xs text-gray-500 mt-1">
                普段の日は {base6.winRate.toFixed(0)}%
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">1年後の平均リターン</p>
              <p className={`text-2xl font-bold ${returnColorClass(episodeSummary.high["1y"].avgReturn)}`}>
                {formatReturn(episodeSummary.high["1y"].avgReturn)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {episodeSummary.high["1y"].sampleSize} 回（1年たっていない回は除く）。普段の日は{" "}
                {formatReturn(base1y.avgReturn)}
              </p>
            </div>
          </div>
          <p className="text-base leading-relaxed">
            半年の平均より {th}%以上も高いのは、強い上昇相場の最中であることがほとんどです。
            {highEpisodesBeat && (
              <>
                過去の日経平均では、
                <strong>そこで売って降りるより、持ち続けたほうが良かった回が多数派</strong>
                でした。
              </>
            )}
            {worstHigh && worstHigh.returns["1y"]! < 0 && (
              <>
                もちろん外れた回もあり、一番悪かった {worstHigh.date} は1年後に{" "}
                {formatReturn(worstHigh.returns["1y"])} でした。
              </>
            )}
            「熱いから売る」ではなく、「熱いときに新しくまとめて買うのを控える」程度の使い方が、過去のデータには合っています。
          </p>
          <div className="mt-3">
            <EpisodeTable episodes={analysis.highEpisodes} showDrawdown={false} />
          </div>
        </section>

        <section id="low" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            下に離れすぎは買いのサインか — −{th}%を下回った {analysis.lowEpisodes.length} 回
          </h2>
          <div className="overflow-x-auto not-prose mb-3">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">数え方</th>
                  {DEVIATION_PERIOD_KEYS.map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {DEVIATION_PERIOD_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: `日数（${lowBand.all["1m"].sampleSize} 日）`, stats: lowBand.all },
                  {
                    label: `回数（${analysis.lowEpisodes.length} 回の最初の日）`,
                    stats: episodeSummary.low,
                  },
                  { label: "普段の日（全営業日）", stats: baseline.all },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-100">
                    <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                      {row.label}
                    </th>
                    {DEVIATION_PERIOD_KEYS.map((k) => (
                      <StatsCell key={k} stats={row.stats[k]} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed">
            日数で数えると −{th}%以下の日は成績が良く見えます。ただしこの数え方では、リーマン・ショック（2008〜2009年）のように、
            <strong>下げが長引いて −{th}%以下が何ヶ月も続いた回が、底に近い日まで含めて何十日分も数えられます</strong>
            。下げ始めて最初に −{th}%を割った日に買った場合（回数ベース）は、1ヶ月後こそ{" "}
            {low1m.winRate.toFixed(0)}% が上がっていたものの、6ヶ月後は {low6.winRate.toFixed(0)}
            %で普段の日（{base6.winRate.toFixed(0)}%）{lowVsBase}
            。1990年代のバブル崩壊や2008年のリーマン・ショックでは、−{th}
            %を割った後もさらに大きく下げました。
          </p>
          <p className="text-base leading-relaxed mt-3">
            「下に離れすぎたら一度に全部買う」より、
            <Link href="/analysis/nikkei-crash-aftermath" className="underline hover:text-gray-900">
              急落の検証
            </Link>
            と同じく、何回かに分けて買うほうが過去の値動きには合っています。
          </p>
          <div className="mt-3">
            <EpisodeTable episodes={analysis.lowEpisodes} showDrawdown />
          </div>
          <p className="text-sm text-gray-500 mt-2">
            新しい順。「さらに下げた幅」は最初の日の終値からその後6ヶ月の最安値まで。
          </p>
        </section>

        <section id="halves" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">前半と後半で結果は同じか</h2>
          <p className="text-base leading-relaxed mb-3">
            {firstHalfLabel}は、バブル崩壊から長い下げ相場が続いた時期を含みます。{secondHalfLabel}
            は、リーマン・ショックも含みますが、その後の回復やアベノミクス以降の上昇相場が中心です。6ヶ月後に上がっていた割合を比べました。
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">乖離率</th>
                  <th className="text-right py-2 px-2 font-semibold">{firstHalfLabel}</th>
                  <th className="text-right py-2 pl-2 font-semibold">{secondHalfLabel}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ...DEVIATION_BANDS.map((b) => ({
                    key: b.key as string,
                    label: b.label,
                    s: findDeviationBand(analysis, b.key),
                  })),
                  { key: "baseline", label: "普段の日（全営業日）", s: baseline },
                ].map(({ key, label, s }) => {
                  const isBase = key === "baseline";
                  const cell = (half: "firstHalf" | "secondHalf") => {
                    const v = s[half]["6m"];
                    const b = baseline[half]["6m"].winRate;
                    const empty = v.sampleSize === 0;
                    const tone =
                      isBase || empty || v.winRate === b
                        ? "text-gray-800"
                        : v.winRate > b
                          ? "text-red-600"
                          : "text-green-600";
                    return (
                      <td className="text-right py-2 px-2 font-mono">
                        <span className={tone}>{empty ? "—" : `${v.winRate.toFixed(0)}%`}</span>
                        <span className="block text-xs text-gray-500">{v.sampleSize} 日</span>
                      </td>
                    );
                  };
                  return (
                    <tr
                      key={key}
                      className={isBase ? "border-t-2 border-gray-300" : "border-b border-gray-100"}
                    >
                      <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                        {label}
                      </th>
                      {cell("firstHalf")}
                      {cell("secondHalf")}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            6ヶ月後に上がっていた割合。赤はその時期の普段の日より高い、緑は低い。
          </p>
          <p className="text-base leading-relaxed mt-3">
            {highBeatsBoth && (
              <>
                上に +{th}%以上離れた後に上がりやすかったのは、前半・後半のどちらでも同じです。
              </>
            )}
            {flippedLabels.length > 0 ? (
              <>
                一方で<strong>{flippedLabels.join("・")}</strong>
                は、前半と後半で普段の日より良いか悪いかが入れ替わっています（どちらの時期も {FLIP_MARGIN}
                ポイント以上の差）。同じ乖離率でも、長い下げ相場の途中か、上昇相場の中の一時的な下げかで、その後が大きく違ったということです。
              </>
            ) : (
              <>どの区切りも、前半と後半で普段の日との上下は変わりませんでした。</>
            )}
          </p>
        </section>

        <section id="now" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">いまの乖離率</h2>
          <div className="border border-gray-200 rounded-lg p-4 not-prose">
            <p className="text-sm text-gray-500">{latest.date} 時点（集計に使った最後の日）</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatDeviation(latest.deviation)}
              <span className="text-base font-normal text-gray-600 ml-2">
                （市場温度 {latestTemperature}、区切りは「{latestBandMeta.label}」）
              </span>
            </p>
          </div>
          <p className="text-base leading-relaxed mt-3">
            過去に乖離率が「{latestBandMeta.label}」だった日の6ヶ月後に上がっていた割合は、全期間で{" "}
            {latestBand.all["6m"].winRate.toFixed(0)}%（{firstHalfLabel}{" "}
            {latestBand.firstHalf["6m"].winRate.toFixed(0)}%、{secondHalfLabel}{" "}
            {latestBand.secondHalf["6m"].winRate.toFixed(0)}%）です。
            {latestFlipped
              ? "時期によって結果が逆になっている水準なので、乖離率だけでは買い時とも危ないとも言えません。"
              : ""}
            毎日の値は
            <Link href="/" className="underline hover:text-gray-900">
              トップページの市場温度
            </Link>
            で確認できます。
          </p>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">注意点</h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong className="text-red-700">
                ±{th}%を超えた回は {analysis.lowEpisodes.length} 回と {analysis.highEpisodes.length}{" "}
                回しかない
              </strong>
              。1回の当たり外れで割合が数ポイント動くため、一覧の1件ずつも合わせて見てください
            </li>
            <li>
              日数ベースの集計は、続けて同じ区切りにいる日を何度も数えるため、実際の独立した回数より件数が多く見えます
            </li>
            <li>
              その日の終値で買えたとしています。日経平均の値動きだけを見ており、配当・手数料・税金は含みません
            </li>
            <li>過去の統計であり、将来も同じになるとは限りません</li>
          </ul>
        </section>

        <InvestingBooksCTA placement="bottom_cta" article={ARTICLE_SLUG} />

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">関連リンク</h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              <Link href="/" className="underline hover:text-gray-900 font-semibold">
                今日の市場温度（トップページ）
              </Link>{" "}
              — いまの乖離率から計算した温度と、過去の似た日を確認できます
            </li>
            <li>
              <Link href="/analysis/nikkei-crash-aftermath" className="underline hover:text-gray-900">
                日経平均が1日5%以上下げた後どうなった？
              </Link>{" "}
              — 1日の急落から見た同じ形の検証
            </li>
            <li>
              <Link href="/analysis/sector-rotation-temperature" className="underline hover:text-gray-900">
                暴落時に強い業種はどれ？— 温度帯×17業種の過去10年検証
              </Link>{" "}
              — 温度が低いとき、どの業種が戻りやすかったか
            </li>
            <li>
              <Link href="/learn/what-is-fear-greed" className="underline hover:text-gray-900">
                Fear &amp; Greed Index とは？
              </Link>{" "}
              — 市場の温度を測る考え方
            </li>
            <li>
              <Link href="/learn/when-to-buy-stocks" className="underline hover:text-gray-900">
                株の買い時はいつ？
              </Link>{" "}
              — 温度を使った買い時の考え方のまとめ
            </li>
            <li>
              <Link href="/alerts" className="underline hover:text-gray-900">
                温度アラート（メール通知）
              </Link>{" "}
              — 市場温度が極端になったときにメールでお知らせします
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は情報提供のみを目的としており、投資助言・売買の推奨ではありません。掲載する統計は過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任で行ってください。データ出典:
            Yahoo Finance（^N225）、乖離率・市場温度は株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
