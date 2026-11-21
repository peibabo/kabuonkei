import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import InvestingBooksCTA from "@/components/analysis/InvestingBooksCTA";
import AnalysisViewTracker from "@/components/analysis/AnalysisViewTracker";
import {
  findSupplyBand,
  FLOW_BANDS,
  formatFlowOku,
  formatMarginChange,
  getSupplyDemandAnalysis,
  MARGIN_BANDS,
  SUPPLY_DEMAND_ARTICLE,
  SUPPLY_PERIOD_KEYS,
  SUPPLY_PERIOD_LABELS,
  supplyWinCount,
  type SupplyBand,
  type SupplyBandStats,
  type SupplyEpisode,
  type SupplyIndicatorAnalysis,
  type SupplyPeriodKey,
} from "@/lib/supply-demand-analysis";
import type { PeriodStats } from "@/lib/historical-stats";
import { formatReturn, returnColorClass } from "@/lib/format";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_SLUG = SUPPLY_DEMAND_ARTICLE.slug;
const ARTICLE_PATH = SUPPLY_DEMAND_ARTICLE.path;
const ARTICLE_TITLE = SUPPLY_DEMAND_ARTICLE.title;
const ARTICLE_DESCRIPTION =
  "海外投資家が大きく売り越した後や、信用買い残が急に減った後、日経平均はどう動いたか。JPX の投資部門別売買状況（2016年〜）と信用取引残高（2002年〜）を、公表日のずれも再現して検証。需給の数字は買い時・売り時のサインになるのか、市場温度と組み合わせると何か分かるのかを確かめます。";
const PUBLISHED_AT = SUPPLY_DEMAND_ARTICLE.publishedAt;

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "海外投資家 売り越し 株価",
    "海外投資家 買い越し その後",
    "信用買い残 減少 株価",
    "信用買い残 増加",
    "需給 株価 先行指標",
    "投資部門別売買状況",
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
  { href: "#what", label: "2つの需給の数字" },
  { href: "#framework", label: "検証のやり方" },
  { href: "#flow", label: "海外投資家の売買とその後" },
  { href: "#margin", label: "信用買い残の増減とその後" },
  { href: "#cold", label: "市場温度が低いときに需給も悪かったら" },
  { href: "#now", label: "いまの需給" },
  { href: "#why", label: "株温計が需給を温度に入れない理由" },
  { href: "#caveats", label: "注意点" },
];

/**
 * 前半と後半で、普段の日との上下が入れ替わったか。
 * 1〜2 ポイントの差は誤差の範囲なので、どちらの時期も FLIP_MARGIN 以上離れているときだけ「逆」とする
 */
const FLIP_MARGIN = 3;

function gapPoints(
  s: Omit<SupplyBandStats, "key">,
  base: Omit<SupplyBandStats, "key">,
  half: "firstHalf" | "secondHalf",
  p: SupplyPeriodKey = "6m"
): number | null {
  if (s[half][p].sampleSize === 0) return null;
  return s[half][p].winRate - base[half][p].winRate;
}

function isFlipped(
  s: Omit<SupplyBandStats, "key">,
  base: Omit<SupplyBandStats, "key">
): boolean {
  const first = gapPoints(s, base, "firstHalf");
  const second = gapPoints(s, base, "secondHalf");
  if (first == null || second == null) return false;
  return (
    Math.sign(first) !== Math.sign(second) &&
    Math.abs(first) >= FLIP_MARGIN &&
    Math.abs(second) >= FLIP_MARGIN
  );
}

function hasData(s: PeriodStats): boolean {
  return s.sampleSize > 0;
}

function halfLabels(ind: SupplyIndicatorAnalysis) {
  const firstYear = ind.dataRange.from.slice(0, 4);
  const ym = (iso: string) => `${iso.slice(0, 4)}年${Number(iso.slice(5, 7))}月`;
  // halfSplitDate は後半の初日。前半はその前日までなので、前日の年月で閉じる（同じ月が両方に入って見えないように）
  const prev = new Date(`${ind.halfSplitDate}T00:00:00Z`);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return {
    first: `前半（${firstYear}年〜${ym(prev.toISOString().slice(0, 10))}）`,
    second: `後半（${ym(ind.halfSplitDate)}〜）`,
  };
}

function StatsCell({ stats }: { stats: PeriodStats }) {
  if (stats.sampleSize === 0) {
    return <td className="text-right py-2 px-2 font-mono text-gray-400">—</td>;
  }
  return (
    <td className="text-right py-2 px-2 font-mono">
      <span className={returnColorClass(stats.avgReturn)}>{formatReturn(stats.avgReturn)}</span>
      <span className="block text-xs text-gray-500">上昇 {stats.winRate.toFixed(0)}%</span>
    </td>
  );
}

function BandTable({
  ind,
  bands,
  headLabel,
}: {
  ind: SupplyIndicatorAnalysis;
  bands: readonly SupplyBand[];
  headLabel: string;
}) {
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300 text-gray-600">
            <th className="text-left py-2 pr-2 font-semibold">{headLabel}</th>
            {SUPPLY_PERIOD_KEYS.map((k) => (
              <th key={k} className="text-right py-2 px-2 font-semibold">
                {SUPPLY_PERIOD_LABELS[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bands.map((b) => {
            const s = findSupplyBand(ind, b.key);
            return (
              <tr key={b.key} className="border-b border-gray-100">
                <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
                  {b.label}
                  <span className="block text-xs font-normal text-gray-500">
                    {s.all["1m"].sampleSize.toLocaleString("ja-JP")} 日
                  </span>
                </th>
                {SUPPLY_PERIOD_KEYS.map((k) => (
                  <StatsCell key={k} stats={s.all[k]} />
                ))}
              </tr>
            );
          })}
          <tr className="border-t-2 border-gray-300">
            <th scope="row" className="text-left py-2 pr-2 font-semibold text-gray-800">
              普段の日（全営業日）
            </th>
            {SUPPLY_PERIOD_KEYS.map((k) => (
              <StatsCell key={k} stats={ind.baseline.all[k]} />
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function HalvesTable({
  ind,
  bands,
  headLabel,
}: {
  ind: SupplyIndicatorAnalysis;
  bands: readonly SupplyBand[];
  headLabel: string;
}) {
  const labels = halfLabels(ind);
  const rows = [
    ...bands.map((b) => ({ key: b.key as string, label: b.label, s: findSupplyBand(ind, b.key) })),
    { key: "baseline", label: "普段の日（全営業日）", s: ind.baseline },
  ];
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-300 text-gray-600">
            <th className="text-left py-2 pr-2 font-semibold">{headLabel}</th>
            <th className="text-right py-2 px-2 font-semibold">{labels.first}</th>
            <th className="text-right py-2 pl-2 font-semibold">{labels.second}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, s }) => {
            const isBase = key === "baseline";
            const cell = (half: "firstHalf" | "secondHalf") => {
              const v = s[half]["6m"];
              const b = ind.baseline[half]["6m"].winRate;
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
      <p className="text-sm text-gray-500 mt-2">
        6ヶ月後に上がっていた割合。赤はその時期の普段の日より高い、緑は低い。
      </p>
    </div>
  );
}

function EpisodeTable({
  episodes,
  valueLabel,
  formatValue,
  mergeWindow,
}: {
  episodes: SupplyEpisode[];
  mergeWindow: number;
  valueLabel: string;
  formatValue: (v: number) => string;
}) {
  return (
    <div className="overflow-x-auto not-prose">
      <table className="w-full text-sm border-collapse whitespace-nowrap">
        <thead>
          <tr className="border-b border-gray-300 text-gray-600">
            <th className="text-left py-2 pr-2 font-semibold">最初の日</th>
            <th className="text-right py-2 px-2 font-semibold">{valueLabel}</th>
            <th className="text-right py-2 px-2 font-semibold">市場温度</th>
            {SUPPLY_PERIOD_KEYS.map((k) => (
              <th key={k} className="text-right py-2 px-2 font-semibold">
                {SUPPLY_PERIOD_LABELS[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...episodes].reverse().map((e) => (
            <tr key={e.date} className="border-b border-gray-100">
              <td className="py-2 pr-2 font-mono text-gray-800">{e.date}</td>
              <td className="text-right py-2 px-2 font-mono text-gray-700">{formatValue(e.value)}</td>
              <td className="text-right py-2 px-2 font-mono text-gray-700">{e.temperature}</td>
              {SUPPLY_PERIOD_KEYS.map((k) => (
                <td
                  key={k}
                  className={`text-right py-2 px-2 font-mono ${returnColorClass(e.returns[k])}`}
                >
                  {formatReturn(e.returns[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm text-gray-500 mt-2">
        新しい順。前の該当日から {mergeWindow} 営業日以内は同じ回にまとめ、最初の日に買った場合。
        「—」は期間がまだ経過していない回。
      </p>
    </div>
  );
}

/** 「2016年以降」のような書き出し */
function sinceYear(ind: SupplyIndicatorAnalysis): string {
  return `${ind.dataRange.from.slice(0, 4)}年以降`;
}

/** 「6ヶ月後に上がった割合」の差を「◯ポイント高い／低い」にする */
function diffText(gap: number): string {
  const abs = Math.abs(gap).toFixed(0);
  if (Math.abs(gap) < 1) return "ほとんど同じ";
  return `${abs}ポイント${gap > 0 ? "高い" : "低い"}`;
}

export default function SupplyDemandSignalsPage() {
  const analysis = getSupplyDemandAnalysis();
  const { flow, margin, latest, coldThreshold } = analysis;

  // 本文の言い回しは毎月の再生成でデータが変わっても数字と食い違わないよう、データから決める
  const flowBase6 = flow.baseline.all["6m"];
  const flowVeryLow = findSupplyBand(flow, "very-low");
  const flowVeryHigh = findSupplyBand(flow, "very-high");
  const flowLowBeats = hasData(flowVeryLow.all["6m"]) && flowVeryLow.all["6m"].winRate > flowBase6.winRate;
  const flowHighBeats =
    hasData(flowVeryHigh.all["6m"]) && flowVeryHigh.all["6m"].winRate > flowBase6.winRate;
  const flowUShape = flowLowBeats && flowHighBeats;
  const flowVeryLowFlipped = isFlipped(flowVeryLow, flow.baseline);
  const flowExt6 = flow.extremeSummary["6m"];
  /** 回数ベースと普段の日の差が ±5 ポイント以内なら「普段並み」とする */
  const flowExtNearBase =
    hasData(flowExt6) && Math.abs(flowExt6.winRate - flowBase6.winRate) <= 5;
  /** 1兆円以上売り越した回のうち、6ヶ月後の成績が良かった上位 2 回の年（重複は 1 つに） */
  const topFlowYears = [
    ...new Set(
      flow.extremeEpisodes
        // 普段の日の平均より良かった回だけ（「押し上げた」と書くため）
        .filter((e) => e.returns["6m"] != null && e.returns["6m"] > flowBase6.avgReturn)
        .sort((x, y) => y.returns["6m"]! - x.returns["6m"]!)
        .slice(0, 2)
        .map((e) => e.date.slice(0, 4))
        .sort()
    ),
  ];
  const flowLabels = halfLabels(flow);

  const marginBase6 = margin.baseline.all["6m"];
  const marginVeryLow = findSupplyBand(margin, "very-low");
  const marginLowBelow =
    hasData(marginVeryLow.all["6m"]) && marginVeryLow.all["6m"].winRate < marginBase6.winRate;
  const marginVeryLowFlipped = isFlipped(marginVeryLow, margin.baseline);
  const marginExt6 = margin.extremeSummary["6m"];
  const marginExt1 = margin.extremeSummary["1m"];
  const marginLabels = halfLabels(margin);
  const marginLowFirst = gapPoints(marginVeryLow, margin.baseline, "firstHalf");
  const marginLowSecond = gapPoints(marginVeryLow, margin.baseline, "secondHalf");
  /** 前半が悪く後半が良い向きの入れ替わり（いまのデータの形）。逆向きなら別の文にする */
  const marginFlipFirstWorse =
    marginVeryLowFlipped && marginLowFirst != null && marginLowFirst < 0;
  const firstHalfMarginEps = margin.extremeEpisodes.filter(
    (e) => e.date < margin.halfSplitDate && e.returns["6m"] != null
  );
  const secondHalfMarginEps = margin.extremeEpisodes.filter(
    (e) => e.date >= margin.halfSplitDate && e.returns["6m"] != null
  );
  /** 回の中で 6ヶ月後が悪かった（良かった）上位の年。本文の例に使う */
  const yearsOf = (eps: SupplyEpisode[], dir: "worst" | "best", n: number) =>
    [
      ...new Set(
        [...eps]
          .filter((e) => (dir === "worst" ? e.returns["6m"]! < 0 : e.returns["6m"]! > 0))
          .sort((x, y) =>
            dir === "worst" ? x.returns["6m"]! - y.returns["6m"]! : y.returns["6m"]! - x.returns["6m"]!
          )
          .slice(0, n)
          .map((e) => e.date.slice(0, 4))
      ),
    ].sort();
  const marginWorstYears = yearsOf([...firstHalfMarginEps, ...secondHalfMarginEps], "worst", 3);
  const firstWorstYears = yearsOf(firstHalfMarginEps, "worst", 3);
  const secondBestYears = yearsOf(secondHalfMarginEps, "best", 3);

  const flippedFlow = FLOW_BANDS.filter((b) => isFlipped(findSupplyBand(flow, b.key), flow.baseline));
  const flippedMargin = MARGIN_BANDS.filter((b) =>
    isFlipped(findSupplyBand(margin, b.key), margin.baseline)
  );

  const maxAbsCorr = Math.max(
    ...[flow, margin].flatMap((ind) =>
      SUPPLY_PERIOD_KEYS.map((k) => Math.abs(ind.correlation[k] ?? 0))
    )
  );
  const corrWeak = maxAbsCorr < 0.2;

  // 市場温度が低い日 × 信用買い残
  const mCold = margin.cold;
  /** 片方が 0 日なら差は出さない（0 日の集計は平均 0 として入っているため） */
  const coldGap = (half: "all" | "firstHalf" | "secondHalf"): number | null => {
    const w = mCold.weak[half]["6m"];
    const o = mCold.other[half]["6m"];
    return hasData(w) && hasData(o) ? w.avgReturn - o.avgReturn : null;
  };
  const mColdGap = coldGap("all");
  const mColdGapFirst = coldGap("firstHalf");
  const mColdGapSecond = coldGap("secondHalf");
  /** 平均リターンで 3 ポイント以上の差を「差がある」とする */
  const COLD_GAP = 3;
  const mColdWeakWorse = mColdGap != null && mColdGap <= -COLD_GAP;
  const mColdOnlyFirst =
    mColdWeakWorse &&
    mColdGapFirst != null &&
    mColdGapSecond != null &&
    mColdGapFirst <= -COLD_GAP &&
    Math.abs(mColdGapSecond) < COLD_GAP;
  const fCold = flow.cold;
  const fColdAllUp =
    fCold.weak.all["6m"].sampleSize > 0 &&
    fCold.other.all["6m"].sampleSize > 0 &&
    fCold.weak.all["6m"].winRate >= 90 &&
    fCold.other.all["6m"].winRate >= 90;
  const fColdEpisodes = flow.extremeEpisodes.filter((e) => e.temperature <= coldThreshold).length;

  const latestFlowBand = FLOW_BANDS.find((b) => b.key === latest.flowBandKey);
  const latestMarginBand = MARGIN_BANDS.find((b) => b.key === latest.marginBandKey);
  const latestMarginStats = latest.marginBandKey
    ? findSupplyBand(margin, latest.marginBandKey)
    : null;
  const latestFlowStats = latest.flowBandKey ? findSupplyBand(flow, latest.flowBandKey) : null;

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
    { name: "海外投資家・信用買い残の検証" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  const coldRows = (
    ind: SupplyIndicatorAnalysis,
    weakLabel: string,
    otherLabel: string
  ): Array<{ label: string; s: Omit<SupplyBandStats, "key"> }> => [
    { label: `市場温度 ${coldThreshold} 以下の日すべて`, s: ind.cold.all },
    { label: weakLabel, s: ind.cold.weak },
    { label: otherLabel, s: ind.cold.other },
  ];

  return (
    <>
      <Script
        id="supply-demand-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="supply-demand-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <AnalysisViewTracker slug={ARTICLE_SLUG} />
      <StaticPageLayout title={`⚖️ ${ARTICLE_TITLE}`}>
        <Breadcrumb items={breadcrumbItems} />

        <section
          id="conclusion"
          className="bg-amber-50 border border-amber-300 rounded-xl p-5 not-prose scroll-mt-16"
        >
          <h2 className="text-lg font-bold text-amber-900 mb-2">📖 結論を先に</h2>
          <ul className="list-disc pl-6 space-y-2 text-base text-gray-800 leading-relaxed">
            <li>
              <strong>
                海外投資家が4週で1兆円以上売り越した後は、
                {flowLowBeats ? "むしろ上がった日が多かった" : "上がりやすかったとは言えない"}
              </strong>
              。6ヶ月後に上がっていた割合は {flowVeryLow.all["6m"].winRate.toFixed(0)}%で、普段の日（
              {flowBase6.winRate.toFixed(0)}%）
              {flowLowBeats ? "より高い" : "を上回っていない"}
              {flowLowBeats && flowExtNearBase && (
                <>
                  。ただし回数（{flowExt6.sampleSize} 回）で数えると {flowExt6.winRate.toFixed(0)}
                  %で普段並み
                </>
              )}
              {flowUShape && (
                <>
                  。ただし1兆円以上<strong>買い越した</strong>後も{" "}
                  {flowVeryHigh.all["6m"].winRate.toFixed(0)}%と高く、「売り越しは買い・買い越しは売り」のような一方向の関係ではない
                </>
              )}
              {flowVeryLowFlipped && "。しかも前半と後半で結果が逆"}
            </li>
            <li>
              <strong>
                信用買い残が4週で10%以上減った後は、
                {marginLowBelow ? "6ヶ月後の成績が普段より悪かった" : "普段の日と大きく変わらなかった"}
              </strong>
              （上昇 {marginVeryLow.all["6m"].winRate.toFixed(0)}% / 普段 {marginBase6.winRate.toFixed(0)}
              %）。
              {marginVeryLowFlipped && (
                <>
                  {marginFlipFirstWorse
                    ? `ただ悪かったのは${marginLabels.first}で、${marginLabels.second}は逆に普段より良く、`
                    : `ただ${marginLabels.first}は普段より良く、${marginLabels.second}は逆に悪く、`}
                  <strong>「投げ売りが出たら買い時」とも「まだ下がる」とも言えない</strong>
                </>
              )}
            </li>
            <li>
              {corrWeak ? (
                <>
                  どちらの数字も、その後のリターンとの順位相関は ±{maxAbsCorr.toFixed(2)}{" "}
                  以内でほぼゼロ。
                  <strong>需給の数字だけで買い時・売り時は決められない</strong>
                  。株温計が需給を市場温度に混ぜず、実数のまま参考に出しているのはこのためです
                </>
              ) : (
                <>
                  その後のリターンとの順位相関は最大 {maxAbsCorr.toFixed(2)}
                  。区切りごとの結果は時期によって変わるので、上の表と前半・後半の比較を合わせて見てください
                </>
              )}
            </li>
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
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">2つの需給の数字</h2>
          <p className="text-base leading-relaxed">
            株式の「需給」は、誰がどれだけ買っているか・売っているかのことです。この記事では、日本取引所グループ（JPX）が毎週公表している次の2つを使います。
          </p>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed mt-3">
            <li>
              <strong>海外投資家の売買差引</strong>（
              <Link href="/learn/what-is-investor-flow" className="underline hover:text-gray-900">
                投資部門別売買状況
              </Link>
              ）: 日本株の売買代金の 6〜7 割を占めると言われる海外投資家が、買った額から売った額を引いたもの。直近4週分を足して使います。プラスなら「買い越し」、マイナスなら「売り越し」です
            </li>
            <li>
              <strong>信用買い残の増減</strong>（
              <Link href="/learn/what-is-margin-ratio" className="underline hover:text-gray-900">
                信用取引残高
              </Link>
              ）: お金を借りて買い、まだ返していない株の残高。4週前と比べた増減率を使います。急に減るのは、下げ相場で個人投資家が損を確定させて手放す「投げ売り」が出たときです
            </li>
          </ul>
          <p className="text-base leading-relaxed mt-3">
            「海外勢が売り越すと日本株は下がる」「信用買い残が減って投げ売りが一巡したら買い時」とよく言われます。その言い方が過去の日経平均に当てはまったかを確かめます。
          </p>
        </section>

        <section id="framework" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">検証のやり方</h2>
          <ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
            <li>
              <strong>期間</strong>: 海外投資家は {flow.dataRange.from} 〜 {flow.dataRange.to}（
              {flow.dayCount.toLocaleString("ja-JP")} 営業日）、信用買い残は {margin.dataRange.from} 〜{" "}
              {margin.dataRange.to}（{margin.dayCount.toLocaleString("ja-JP")} 営業日）。株温計が持っている JPX
              のデータの範囲です
            </li>
            <li>
              <strong>公表日のずれ</strong>:
              どちらも週の締めから数日後（信用残は翌週の水曜、投資部門別は翌週の木曜）の大引け後に公表されます。各営業日には、その日の取引が始まる前に公表済みだった週の数字だけを使いました（後から分かる数字で過去の売買を決めない）
            </li>
            <li>
              <strong>その後のリターン</strong>: その日の日経平均の終値から 21・63・126
              営業日後（約1ヶ月・3ヶ月・6ヶ月後）の終値までの値動き。配当は含みません
            </li>
            <li>
              <strong>日数と回数</strong>:
              大きな売り越しや投げ売りは何週も続くため、日数で数えると長い局面が重く数えられます。極端な値（海外勢
              −1兆円以下・信用買い残 −10%以下）は、前の該当日から {analysis.mergeWindow}{" "}
              営業日以内なら同じ1回にまとめ、その最初の日に買った場合も計算しました
            </li>
            <li>
              <strong>前半と後半</strong>:
              時期による違いを見るため、指標ごとに日数をちょうど半分に分けて同じ集計をしました
            </li>
          </ul>
        </section>

        <section id="flow" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            海外投資家の売買とその後（{sinceYear(flow)}）
          </h2>
          <p className="text-base leading-relaxed mb-3">
            その日までに公表済みだった直近4週の海外投資家の売買差引で分け、その日に買った場合のリターンを並べました（日数ベース）。
          </p>
          <BandTable ind={flow} bands={FLOW_BANDS} headLabel="海外投資家（4週累計）" />
          <p className="text-sm text-gray-500 mt-2">
            上の段は平均リターン、下の段は「買った日より値上がりしていた割合」。期間が経過していない日は除く。
          </p>
          <p className="text-base leading-relaxed mt-3">
            {flowUShape ? (
              <>
                成績が良かったのは、<strong>大きく売り越した後と、大きく買い越した後の両端</strong>
                でした。売り越しの大きさに比例して下がる・上がるという形にはなっていません。
              </>
            ) : (
              <>区切りごとの成績は上の表のとおりで、売り越し・買い越しの大きさに比例する形にはなっていません。</>
            )}
          </p>
          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            1兆円以上売り越した {flow.extremeEpisodes.length} 回
          </h3>
          <p className="text-base leading-relaxed mb-3">
            回数で数えると、6ヶ月後に上がっていたのは {flowExt6.sampleSize} 回中{" "}
            {supplyWinCount(flowExt6)} 回（{flowExt6.winRate.toFixed(0)}%）、平均{" "}
            {formatReturn(flowExt6.avgReturn)}でした（普段の日は {flowBase6.winRate.toFixed(0)}%、
            {formatReturn(flowBase6.avgReturn)}）。
            {flowExtNearBase && topFlowYears.length > 0 && (
              <>上がった割合は普段並みで、平均を押し上げているのは{topFlowYears.join("・")}年のように大きく戻した数回です。</>
            )}
            市場温度が低い日に出た回も、温度が高いまま出た回もあります。
          </p>
          <EpisodeTable
            episodes={flow.extremeEpisodes}
            valueLabel="海外4週"
            mergeWindow={analysis.mergeWindow}
            formatValue={(v) => `${Math.round(v).toLocaleString("ja-JP")}億円`}
          />
          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">前半と後半</h3>
          <HalvesTable ind={flow} bands={FLOW_BANDS} headLabel="海外投資家（4週累計）" />
          <p className="text-base leading-relaxed mt-3">
            {flippedFlow.length > 0 ? (
              <>
                <strong>{flippedFlow.map((b) => b.label).join("・")}</strong>
                は、{flowLabels.first}と{flowLabels.second}で普段の日より良いか悪いかが入れ替わっています（どちらの時期も{" "}
                {FLIP_MARGIN} ポイント以上の差）。
              </>
            ) : (
              <>どの区切りも、前半と後半で普段の日との上下は変わりませんでした。</>
            )}
          </p>
        </section>

        <section id="margin" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            信用買い残の増減とその後（{sinceYear(margin)}）
          </h2>
          <p className="text-base leading-relaxed mb-3">
            その日までに公表済みだった信用買い残を4週前と比べ、増減率で分けました（日数ベース）。
          </p>
          <BandTable ind={margin} bands={MARGIN_BANDS} headLabel="信用買い残（4週変化）" />
          <p className="text-sm text-gray-500 mt-2">
            上の段は平均リターン、下の段は「買った日より値上がりしていた割合」。期間が経過していない日は除く。
          </p>
          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">
            10%以上減った {margin.extremeEpisodes.length} 回
          </h3>
          <p className="text-base leading-relaxed mb-3">
            投げ売りが出て信用買い残が急に減った回を、最初の日に買った場合です。1ヶ月後に上がっていたのは{" "}
            {marginExt1.sampleSize} 回中 {supplyWinCount(marginExt1)} 回（
            {marginExt1.winRate.toFixed(0)}%）、6ヶ月後は {marginExt6.sampleSize} 回中{" "}
            {supplyWinCount(marginExt6)} 回（{marginExt6.winRate.toFixed(0)}%、平均{" "}
            {formatReturn(marginExt6.avgReturn)}）。普段の日の6ヶ月後は {marginBase6.winRate.toFixed(0)}
            %・{formatReturn(marginBase6.avgReturn)}です。
            {marginWorstYears.length > 0 &&
              `${marginWorstYears.join("・")}年のように、買い残が減った後もさらに大きく下げた回が含まれます。`}
          </p>
          <EpisodeTable
            episodes={margin.extremeEpisodes}
            valueLabel="買残4週"
            mergeWindow={analysis.mergeWindow}
            formatValue={(v) => `${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%`}
          />
          <h3 className="text-xl font-bold text-gray-900 mt-6 mb-2">前半と後半</h3>
          <HalvesTable ind={margin} bands={MARGIN_BANDS} headLabel="信用買い残（4週変化）" />
          <p className="text-base leading-relaxed mt-3">
            {marginLowFirst != null && marginLowSecond != null && (
              <>
                10%以上減った日の6ヶ月後に上がっていた割合は、{marginLabels.first}が普段の日より
                {diffText(marginLowFirst)}、{marginLabels.second}は{diffText(marginLowSecond)}。
              </>
            )}
            {marginVeryLowFlipped ? (
              <>
                {marginFlipFirstWorse ? (
                  <>
                    前半は
                    {firstWorstYears.length > 0 ? `${firstWorstYears.join("・")}年のように` : ""}
                    、投げ売りの後もさらに下げた回が目立ちます。後半は
                    {secondBestYears.length > 0 ? `${secondBestYears.join("・")}年のように` : ""}
                    、投げ売りが一巡した後に戻した回が多くなっています。
                  </>
                ) : (
                  <>前半は投げ売りの後に戻した回が多く、後半はさらに下げた回が目立ちます。</>
                )}
                <strong>同じ「買い残の急減」でも、どんな相場の途中かで結果が逆になった</strong>
                ということです。
              </>
            ) : null}
            {flippedMargin.filter((b) => b.key !== "very-low").length > 0 && (
              <>
                ほかに{flippedMargin
                  .filter((b) => b.key !== "very-low")
                  .map((b) => b.label)
                  .join("・")}
                も前半と後半で上下が入れ替わっています。
              </>
            )}
          </p>
        </section>

        <section id="cold" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            市場温度が低いときに需給も悪かったら
          </h2>
          <p className="text-base leading-relaxed mb-3">
            株温計の
            <Link href="/" className="underline hover:text-gray-900">
              日本の市場温度
            </Link>
            は、日経平均が125日移動平均からどれだけ離れているかだけで決まります（
            <Link href="/analysis/nikkei-ma-deviation" className="underline hover:text-gray-900">
              乖離率の検証
            </Link>
            ）。需給の数字に温度にない情報があるなら、同じ「温度 {coldThreshold}{" "}
            以下」の日でも、需給が悪い日とそうでない日でその後が違うはずです。
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">
                    市場温度 {coldThreshold} 以下の日
                  </th>
                  {(["3m", "6m"] as SupplyPeriodKey[]).map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {SUPPLY_PERIOD_LABELS[k]}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-2 font-semibold">日数</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    title: `信用買い残（${sinceYear(margin)}）`,
                    rows: coldRows(
                      margin,
                      `うち買い残が${Math.abs(margin.coldWeakThreshold)}%以上減っていた日`,
                      "それ以外"
                    ),
                  },
                  {
                    title: `海外投資家（${sinceYear(flow)}）`,
                    rows: coldRows(flow, "うち1兆円以上売り越していた日", "それ以外"),
                  },
                ].map((group) => (
                  <GroupRows key={group.title} title={group.title} rows={group.rows} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-2">日数ベース。上の段は平均リターン、下の段は上がっていた割合。</p>
          <p className="text-base leading-relaxed mt-3">
            {mColdGap == null ? null : mColdWeakWorse ? (
              <>
                信用買い残では、温度が低い日のうち買い残が減っていた日の6ヶ月後が{" "}
                {formatReturn(mCold.weak.all["6m"].avgReturn)}、それ以外が{" "}
                {formatReturn(mCold.other.all["6m"].avgReturn)}と差が出ています。
                {mColdOnlyFirst ? (
                  <>
                    ただしこの差は{marginLabels.first}（{formatReturn(mCold.weak.firstHalf["6m"].avgReturn)}{" "}
                    と {formatReturn(mCold.other.firstHalf["6m"].avgReturn)}）でほぼ説明でき、
                    {marginLabels.second}は {formatReturn(mCold.weak.secondHalf["6m"].avgReturn)} と{" "}
                    {formatReturn(mCold.other.secondHalf["6m"].avgReturn)}
                    でほとんど変わりません。<strong>前半の長い下げ相場の影響が大きく</strong>
                    、今も使える目安かどうかは分かりません。
                  </>
                ) : (
                  <>前半・後半でも同じ向きの差かどうかは、今後のデータで確かめていきます。</>
                )}
              </>
            ) : (
              <>
                信用買い残では、温度が低い日のうち買い残が減っていた日とそれ以外で、6ヶ月後の平均の差は{" "}
                {Math.abs(mColdGap).toFixed(1)} ポイントにとどまりました。
              </>
            )}
            {fColdAllUp && (
              <>
                海外投資家は、{sinceYear(flow)}に温度が {coldThreshold}{" "}
                以下になった日のほとんどで6ヶ月後に上がっており、売り越しの大きさで分けても差の見分けがつきません（温度 {coldThreshold}{" "}
                以下で1兆円以上の売り越しが始まった回は {fColdEpisodes} 回だけ）。
              </>
            )}
          </p>
        </section>

        <section id="now" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">いまの需給</h2>
          <div className="border border-gray-200 rounded-lg p-4 not-prose space-y-1">
            <p className="text-sm text-gray-500">
              {latest.date} 時点（集計に使った最後の日。市場温度 {latest.temperature}）
            </p>
            <p className="text-base text-gray-900">
              海外投資家（直近4週）:{" "}
              <strong>{latest.flow4w == null ? "—" : formatFlowOku(latest.flow4w)}</strong>
              {latestFlowBand && (
                <span className="text-gray-600">（区切りは「{latestFlowBand.label}」）</span>
              )}
            </p>
            <p className="text-base text-gray-900">
              信用買い残（4週前比）:{" "}
              <strong>
                {latest.marginChange4w == null ? "—" : formatMarginChange(latest.marginChange4w)}
              </strong>
              {latestMarginBand && (
                <span className="text-gray-600">（区切りは「{latestMarginBand.label}」）</span>
              )}
            </p>
          </div>
          <p className="text-base leading-relaxed mt-3">
            {latestFlowBand && latestFlowStats && (
              <>
                海外投資家が「{latestFlowBand.label}」だった日の6ヶ月後に上がっていた割合は{" "}
                {latestFlowStats.all["6m"].winRate.toFixed(0)}%（普段の日 {flowBase6.winRate.toFixed(0)}
                %）。
              </>
            )}
            {latestMarginBand && latestMarginStats && (
              <>
                信用買い残が「{latestMarginBand.label}」だった日は{" "}
                {latestMarginStats.all["6m"].winRate.toFixed(0)}%（普段の日{" "}
                {marginBase6.winRate.toFixed(0)}%）
                {isFlipped(latestMarginStats, margin.baseline) ? "で、時期によって結果が逆になっている水準です" : "です"}
                。
              </>
            )}
            毎週の数字は
            <Link href="/" className="underline hover:text-gray-900">
              トップページ
            </Link>
            の市場温度の下に出しています。
          </p>
        </section>

        <section id="why" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            株温計が需給を温度に入れない理由
          </h2>
          <p className="text-base leading-relaxed">
            株温計の日本の市場温度は、2026年11月半ばまで、125日線乖離率に海外投資家フロー・信用倍率・裁定残・ドル円を加えた5つの要素の平均でした。需給の要素が高止まりして急落を映さなかったため乖離率だけの温度に切り替え、需給は別枠の「需給の温度」として残しました。その後この記事と同じ検証をしたところ、需給の数字はその後のリターンと一貫した関係がなく、時期によって向きが逆になることが分かりました。とくに信用買い残の急減を「温度が低い」と見せると「買い時」と読まれやすいのに、その裏づけがありません。
          </p>
          <p className="text-base leading-relaxed mt-3">
            そこで「需給の温度」もやめ、需給は「4週で◯億円の売り越し」「4週で◯%減少」のように
            <strong>実数のまま参考として</strong>
            出しています。経緯は
            <Link href="/learn/what-is-fear-greed" className="underline hover:text-gray-900">
              Fear &amp; Greed Index とは？
            </Link>
            にもまとめています。
          </p>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">注意点</h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong className="text-red-700">
                海外投資家のデータは{sinceYear(flow)}の約{Math.round(flow.dayCount / 245)}年分しかない
              </strong>
              。1兆円以上の売り越しは {flow.extremeEpisodes.length} 回、信用買い残の10%以上の減少は{" "}
              {margin.extremeEpisodes.length} 回で、1回の当たり外れで割合が数ポイント動きます
            </li>
            <li>
              日数ベースの集計は、続けて同じ区切りにいる日を何度も数えるため、実際の独立した回数より件数が多く見えます
            </li>
            <li>
              海外投資家は東証・名証の二市場の合計（現物）です。先物の売買や、個人・信託銀行など他の投資部門は見ていません
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
              — 市場温度と、海外投資家・信用買い残の最新の数字
            </li>
            <li>
              <Link href="/learn/what-is-investor-flow" className="underline hover:text-gray-900">
                投資部門別売買状況とは？
              </Link>{" "}
              — 海外投資家の売買データの見方
            </li>
            <li>
              <Link href="/learn/what-is-margin-ratio" className="underline hover:text-gray-900">
                信用倍率とは？
              </Link>{" "}
              — 信用買い残・売り残の見方
            </li>
            <li>
              <Link href="/analysis/margin-ratio-temperature" className="underline hover:text-gray-900">
                信用倍率 × 市場温度 — 過去10年の検証
              </Link>{" "}
              — 信用倍率の水準から見た検証
            </li>
            <li>
              <Link href="/analysis/nikkei-ma-deviation" className="underline hover:text-gray-900">
                日経平均の125日線乖離率は買い時のサインになる？
              </Link>{" "}
              — 市場温度の元の値の検証
            </li>
            <li>
              <Link href="/analysis/nikkei-crash-aftermath" className="underline hover:text-gray-900">
                日経平均が1日5%以上下げた後どうなった？
              </Link>{" "}
              — 急落の後の値動き
            </li>
          </ul>
        </section>

        <section>
          <p className="mt-8 text-sm text-gray-500 leading-relaxed">
            ※ 本記事は情報提供のみを目的としており、投資助言・売買の推奨ではありません。掲載する統計は過去データの集計であり、将来の運用成果を保証するものではありません。投資判断はご自身の責任で行ってください。データ出典:
            日本取引所グループ（投資部門別売買状況・信用取引残高等）、Yahoo Finance（^N225）。集計・市場温度は株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}

function GroupRows({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; s: Omit<SupplyBandStats, "key"> }>;
}) {
  return (
    <>
      <tr className="border-t-2 border-gray-300 bg-gray-50">
        <th colSpan={4} scope="rowgroup" className="text-left py-2 pr-2 font-semibold text-gray-700">
          {title}
        </th>
      </tr>
      {rows.map((r) => (
        <tr key={r.label} className="border-b border-gray-100">
          <th scope="row" className="text-left py-2 pr-2 font-normal text-gray-800">
            {r.label}
          </th>
          <StatsCell stats={r.s.all["3m"]} />
          <StatsCell stats={r.s.all["6m"]} />
          <td className="text-right py-2 pl-2 font-mono text-gray-700">
            {r.s.all["1m"].sampleSize.toLocaleString("ja-JP")}
          </td>
        </tr>
      ))}
    </>
  );
}
