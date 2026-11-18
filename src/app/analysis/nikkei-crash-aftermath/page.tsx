import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import InvestingBooksCTA from "@/components/analysis/InvestingBooksCTA";
import AnalysisViewTracker from "@/components/analysis/AnalysisViewTracker";
import {
  getNikkeiCrashAnalysis,
  getLatestCrashEpisode,
  getFailedCrashEpisodes,
  CRASH_PERIOD_KEYS,
  CRASH_PERIOD_LABELS,
  NIKKEI_CRASH_ARTICLE,
  type CrashPeriodKey,
} from "@/lib/nikkei-crash-analysis";
import { formatReturn, returnColorClass } from "@/lib/format";
import { buildArticleJsonLd } from "@/lib/article-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";

const ARTICLE_SLUG = NIKKEI_CRASH_ARTICLE.slug;
const ARTICLE_PATH = NIKKEI_CRASH_ARTICLE.path;
const ARTICLE_TITLE = NIKKEI_CRASH_ARTICLE.title;
const ARTICLE_DESCRIPTION =
  "日経平均株価が1日で5%以上下げた日の後、1ヶ月・3ヶ月・6ヶ月・1年で株価はどう動いたか。1985年以降の急落をすべて洗い出し、その後のリターン、急落した日が底だったか、急落後にどこまで下げたかを検証。株温計の市場温度が低いときの急落と、高いときの急落の違いも比較します。";
const PUBLISHED_AT = NIKKEI_CRASH_ARTICLE.publishedAt;

export const metadata: Metadata = {
  title: ARTICLE_TITLE,
  description: ARTICLE_DESCRIPTION,
  keywords: [
    "日経平均 暴落 その後",
    "日経平均 急落",
    "日経平均 暴落 いつまで",
    "暴落 買い時",
    "日経平均 底",
    "株価 暴落 過去",
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
  { href: "#framework", label: "検証のやり方" },
  { href: "#returns", label: "急落の後、株価は上がったか" },
  { href: "#bottom", label: "急落した日は底だったか" },
  { href: "#temperature", label: "温度が低いときの急落は違うか" },
  { href: "#failures", label: "外れた例" },
  { href: "#list", label: "急落の全件一覧" },
  { href: "#caveats", label: "注意点" },
];

/** 急落日から底までの営業日数を「約◯ヶ月後」の言い方にする（21 営業日 ≒ 1ヶ月） */
function describeDaysAfter(days: number): string {
  if (days <= 0) return "急落した当日";
  const months = days / 21;
  if (months < 0.75) return `約${Math.max(1, Math.round(days / 5))}週間後`;
  return `約${(Math.round(months * 2) / 2).toString()}ヶ月後`;
}

/** 期間キーの並びを「1ヶ月後・3ヶ月後」の形にする */
function joinPeriodLabels(keys: CrashPeriodKey[]): string {
  return keys.map((k) => CRASH_PERIOD_LABELS[k]).join("・");
}

function formatChange(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function NikkeiCrashAftermathPage() {
  const analysis = getNikkeiCrashAnalysis();
  const { summary, episodes, threshold, mergeWindow, coldThreshold } = analysis;
  const ep3m = summary.episodes["3m"];
  const base3m = summary.baseline["3m"];
  const cold3m = summary.cold["3m"];
  const warm3m = summary.warm["3m"];
  const dd = summary.drawdown;
  const latest = getLatestCrashEpisode(analysis);
  const latestIsOpen = latest != null && !latest.isComplete;
  const failures = getFailedCrashEpisodes(analysis);
  const firstYear = analysis.dataRange.from.slice(0, 4);
  const absThreshold = Math.abs(threshold);
  // 比較の言い回しは毎月の再生成でデータが変わっても数字と食い違わないよう、データから決める
  const beatsBaseline3m = ep3m.avgReturn > base3m.avgReturn;
  const beatsBaselineAll = CRASH_PERIOD_KEYS.every(
    (k) => summary.episodes[k].avgReturn > summary.baseline[k].avgReturn
  );
  const coldBetter3m = cold3m.winRate > warm3m.winRate;
  const coldAheadKeys = CRASH_PERIOD_KEYS.filter(
    (k) => summary.cold[k].winRate > summary.warm[k].winRate
  );
  const warmAheadKeys = CRASH_PERIOD_KEYS.filter(
    (k) => summary.warm[k].winRate > summary.cold[k].winRate
  );

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
    { name: "日経平均の急落後の検証" },
  ];
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);

  return (
    <>
      <Script
        id="nikkei-crash-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <Script
        id="nikkei-crash-breadcrumb-jsonld"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }}
      />
      <AnalysisViewTracker slug={ARTICLE_SLUG} />
      <StaticPageLayout title={`📉 ${ARTICLE_TITLE}`}>
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
              {firstYear}年以降、日経平均が1日で{absThreshold}%以上下げた日は{" "}
              {analysis.crashDayCount} 日、続けて起きたものをまとめると{" "}
              <strong>{episodes.length} 回</strong>。急落した日の終値で買うと、3ヶ月後は平均{" "}
              <strong className="text-red-600">
                {formatReturn(ep3m.avgReturn)}（上がった割合{" "}
                {ep3m.winRate.toFixed(0)}%）
              </strong>
              。普段の日に買った場合（平均 {formatReturn(base3m.avgReturn)}、
              {base3m.winRate.toFixed(0)}%）
              {beatsBaseline3m ? "より成績は良かった" : "を上回るほどではなかった"}
            </li>
            <li>
              <strong>
                ただし急落した日が底だったのは {dd.count} 回中 {dd.bottomOnCrashDay}{" "}
                回だけ
              </strong>
              。その後 6ヶ月のうちに、急落した日の終値からさらに平均{" "}
              {dd.avgDrawdown.toFixed(1)}%（中央値 {dd.medianDrawdown.toFixed(1)}
              %）下げていて、一番安くなったのは中央値で{" "}
              {dd.medianDaysToLow} 営業日後（{describeDaysAfter(dd.medianDaysToLow)}
              ）だった。<strong>急落の日に一度に全部買うより、何回かに分けて買うほうが過去のデータには合っている</strong>
            </li>
            <li>
              株温計の市場温度が {coldThreshold} 以下（寒い）のときの急落は、3ヶ月後に上がった割合が{" "}
              <strong className="text-red-600">{cold3m.winRate.toFixed(0)}%</strong>
              （{cold3m.sampleSize} 回）。温度が {coldThreshold}{" "}
              より高いときの急落（{warm3m.winRate.toFixed(0)}%、{warm3m.sampleSize}{" "}
              回）{coldBetter3m ? "より上がりやすかった" : "と比べて上がりやすいとは言えなかった"}
              。ただしバブル崩壊やリーマン・ショックの入り口では、寒くても下げ続けた
            </li>
          </ul>
          {latestIsOpen && latest && (
            <p className="mt-3 text-sm text-gray-700 leading-relaxed">
              直近の急落は <strong>{latest.date}</strong>（
              {formatChange(latest.change)}、市場温度 {latest.temperature ?? "—"}
              ）。まだ 6ヶ月たっていないため、一覧では「観測中」として扱い、集計には経過した期間の分だけ入れています。
            </p>
          )}
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
          <time dateTime={analysis.generatedAt}>{analysis.generatedAt}</time>
          （公開: <time dateTime={PUBLISHED_AT}>{PUBLISHED_AT}</time>）｜
          データは毎月1日に自動更新
        </p>

        <section id="framework" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-2 mb-3">
            検証のやり方
          </h2>
          <p className="text-base leading-relaxed">
            日経平均が大きく下げた日には「暴落はいつまで続くのか」「今は買い時なのか」が気になります。この記事では、
            {analysis.dataRange.from} 〜 {analysis.dataRange.to}{" "}
            の日経平均の終値を使い、
            <strong>
              1日で{absThreshold}%以上下げた日に買っていたら、その後どうなったか
            </strong>
            を調べました。
          </p>
          <ul className="list-disc pl-6 mt-3 space-y-1 text-base leading-relaxed">
            <li>
              <strong>急落の日</strong>: 終値が前の日より {absThreshold}%
              以上下がった日（{analysis.crashDayCount} 日）
            </li>
            <li>
              <strong>1回の急落としてまとめる</strong>: 前の急落から{" "}
              {mergeWindow} 営業日（約1ヶ月）以内に起きた急落は同じ1回として扱い、その最初の日に買ったとして計算（
              {episodes.length} 回）。リーマン・ショックのように急落が何日も続いた時期を何度も数えないためです
            </li>
            <li>
              <strong>その後のリターン</strong>: 急落した日の終値から 21・63・126・252
              営業日後（約1ヶ月・3ヶ月・6ヶ月・1年後）の終値までの値動き。配当は含みません
            </li>
            <li>
              <strong>市場温度</strong>:{" "}
              <Link href="/" className="underline hover:text-gray-900">
                トップページ
              </Link>
              と同じ定義（日経平均と直前125営業日の平均との差を 0〜100
              にしたもの）を {firstYear}年までさかのぼって計算
            </li>
          </ul>
        </section>

        <section id="returns" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            急落の後、株価は上がったか
          </h2>
          <p className="text-base leading-relaxed mb-3">
            急落した日に買った場合と、期間中のどの日でも買った場合（普段の日）を比べました。
            {beatsBaselineAll
              ? "どの期間でも、急落した日に買ったほうが平均の上がり幅は大きくなっています。"
              : "期間ごとの差は次の表のとおりです。"}
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">買った日</th>
                  {CRASH_PERIOD_KEYS.map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {CRASH_PERIOD_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "急落した日", stats: summary.episodes },
                  { label: "普段の日（全営業日）", stats: summary.baseline },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-100">
                    <th
                      scope="row"
                      className="text-left py-2 pr-2 font-semibold text-gray-800"
                    >
                      {row.label}
                    </th>
                    {CRASH_PERIOD_KEYS.map((k) => (
                      <td key={k} className="text-right py-2 px-2 font-mono">
                        <span className={returnColorClass(row.stats[k].avgReturn)}>
                          {formatReturn(row.stats[k].avgReturn)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          上昇 {row.stats[k].winRate.toFixed(0)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            上の段は平均リターン、下の段は「買った日より値上がりしていた割合」。急落した日の回数は{" "}
            {summary.episodes["1m"].sampleSize} 回（1年後は{" "}
            {summary.episodes["1y"].sampleSize} 回。期間が経過していない回は除く）。
          </p>
        </section>

        <section id="bottom" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            急落した日は底だったか
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 not-prose mb-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">急落した日がそのまま底</p>
              <p className="text-2xl font-bold text-gray-900">
                {dd.bottomOnCrashDay} / {dd.count} 回
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">その後さらに下げた幅（中央値）</p>
              <p className="text-2xl font-bold text-green-600">
                {dd.medianDrawdown.toFixed(1)}%
              </p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">底までの日数（中央値）</p>
              <p className="text-2xl font-bold text-gray-900">
                {dd.medianDaysToLow} 営業日
              </p>
            </div>
          </div>
          <p className="text-base leading-relaxed">
            6ヶ月が経過した {dd.count} 回のうち、急落した日の終値がその後6ヶ月で一番安かったのは{" "}
            {dd.bottomOnCrashDay} 回だけでした。残りは急落の後もしばらく下げ、一番安くなったのは中央値で{" "}
            {describeDaysAfter(dd.medianDaysToLow)}です。
            <strong>
              急落は「買い場の入り口」にはなりやすいものの、「底」を当てるのは難しい
            </strong>
            というのが、この検証のいちばん実用的な結論です。急落した日に資金を全部入れるより、数週間〜数ヶ月に分けて買うほうが、過去の値動きには合っています。
          </p>
        </section>

        <section id="temperature" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            温度が低いときの急落は違うか
          </h2>
          <p className="text-base leading-relaxed mb-3">
            同じ急落でも、すでに下げが続いて市場が冷えていたときと、高値圏から急に落ちたときでは意味が違います。急落した日の市場温度で分けて比べました。
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">急落した日の温度</th>
                  {CRASH_PERIOD_KEYS.map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {CRASH_PERIOD_LABELS[k]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: `${coldThreshold} 以下（寒い）`,
                    stats: summary.cold,
                  },
                  {
                    label: `${coldThreshold + 1} 以上`,
                    stats: summary.warm,
                  },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-gray-100">
                    <th
                      scope="row"
                      className="text-left py-2 pr-2 font-semibold text-gray-800"
                    >
                      {row.label}
                      <span className="block text-xs font-normal text-gray-500">
                        {row.stats["1m"].sampleSize} 回
                      </span>
                    </th>
                    {CRASH_PERIOD_KEYS.map((k) => (
                      <td key={k} className="text-right py-2 px-2 font-mono">
                        <span className={returnColorClass(row.stats[k].avgReturn)}>
                          {formatReturn(row.stats[k].avgReturn)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          上昇 {row.stats[k].winRate.toFixed(0)}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-base leading-relaxed mt-3">
            {coldAheadKeys.length > 0 && (
              <>
                温度が低いときの急落は、{joinPeriodLabels(coldAheadKeys)}
                に上がっていた割合が高くなっています。売られすぎたところにもう一段の投げ売りが出た形で、その後に戻りやすかったと考えられます。
              </>
            )}
            {warmAheadKeys.length > 0 && (
              <>
                一方で
                <strong>
                  {joinPeriodLabels(warmAheadKeys)}
                  では、温度が {coldThreshold + 1} 以上のときの急落のほうが上がっていた割合が高く
                </strong>
                、温度が低くても長い下げ相場の途中だった回（下の「外れた例」）が足を引っぱっています。
              </>
            )}
            回数も {cold3m.sampleSize} 回と{" "}
            {warm3m.sampleSize} 回しかないため、温度だけで判断できるほどの差ではありません。
          </p>
        </section>

        <section id="failures" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            外れた例 — 6ヶ月後もマイナスだった {failures.length} 回
          </h2>
          <ul className="list-disc pl-6 space-y-1 text-base leading-relaxed">
            {failures.map((e) => (
              <li key={e.date}>
                <strong>{e.date}</strong>（{formatChange(e.change)}、温度{" "}
                {e.temperature ?? "—"}）→ 6ヶ月後{" "}
                <span className={returnColorClass(e.returns["6m"])}>
                  {formatReturn(e.returns["6m"])}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-base leading-relaxed mt-3">
            大きく外れたのは、1990年（バブル崩壊）、2000〜2001年（ITバブル崩壊）、2007〜2008年（サブプライム問題からリーマン・ショック）のように、
            <strong>何年も続く下げ相場の入り口</strong>
            で起きた急落です。こうした局面では、急落の後も株価が何ヶ月も下がり続けました。阪神・淡路大震災（1995年）や東日本大震災（2011年）の後も、半年後は急落した日より安い水準でした。
          </p>
        </section>

        <section id="list" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            急落の全件一覧
          </h2>
          <p className="text-sm text-gray-500 mb-2">
            新しい順。「下落率」は最初の急落日の前日比、「さらに下げた幅」は急落した日の終値からその後6ヶ月の最安値まで。
          </p>
          <div className="overflow-x-auto not-prose">
            <table className="w-full text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-300 text-gray-600">
                  <th className="text-left py-2 pr-2 font-semibold">急落した日</th>
                  <th className="text-right py-2 px-2 font-semibold">下落率</th>
                  <th className="text-right py-2 px-2 font-semibold">温度</th>
                  {CRASH_PERIOD_KEYS.map((k) => (
                    <th key={k} className="text-right py-2 px-2 font-semibold">
                      {CRASH_PERIOD_LABELS[k]}
                    </th>
                  ))}
                  <th className="text-right py-2 pl-2 font-semibold">
                    さらに下げた幅
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...episodes].reverse().map((e) => (
                  <tr key={e.date} className="border-b border-gray-100">
                    <td className="py-2 pr-2 font-mono text-gray-800">
                      {e.date}
                      {e.crashDays > 1 && (
                        <span className="ml-1 text-xs text-gray-500">
                          （急落 {e.crashDays} 日）
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-green-600">
                      {formatChange(e.change)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-gray-700">
                      {e.temperature ?? "—"}
                    </td>
                    {CRASH_PERIOD_KEYS.map((k) => (
                      <td
                        key={k}
                        className={`text-right py-2 px-2 font-mono ${returnColorClass(e.returns[k])}`}
                      >
                        {formatReturn(e.returns[k])}
                      </td>
                    ))}
                    <td className="text-right py-2 pl-2 font-mono text-gray-700">
                      {e.isComplete
                        ? e.maxFurtherDrawdown === 0
                          ? "底"
                          : `${e.maxFurtherDrawdown.toFixed(1)}%`
                        : "観測中"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="caveats" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">注意点</h2>
          <ul className="list-disc pl-6 space-y-2 text-base leading-relaxed">
            <li>
              <strong className="text-red-700">
                回数は {episodes.length} 回と少ない
              </strong>
              。1回の大きな当たり外れで平均が動くため、平均だけでなく「上がった割合」と一覧の1件ずつを合わせて見てください
            </li>
            <li>
              急落した日の<strong>終値</strong>で買えたとしています。実際には急落の日の引けで買うのは難しく、翌日以降に買うと結果は変わります
            </li>
            <li>
              日経平均の値動きだけを見ており、配当・手数料・税金は含みません。個別の銘柄や投資信託が同じように動くとは限りません
            </li>
            <li>
              過去の統計であり、将来も同じになるとは限りません
            </li>
          </ul>
        </section>

        <InvestingBooksCTA placement="bottom_cta" article={ARTICLE_SLUG} />

        <section id="related" className="scroll-mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-3">
            関連リンク
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-base">
            <li>
              <Link href="/" className="underline hover:text-gray-900 font-semibold">
                今日の市場温度（トップページ）
              </Link>{" "}
              — いまの温度と、過去の似た日を確認できます
            </li>
            <li>
              <Link
                href="/analysis/sector-rotation-temperature"
                className="underline hover:text-gray-900"
              >
                暴落時に強い業種はどれ？— 温度帯×17業種の過去10年検証
              </Link>{" "}
              — 急落の後、どの業種が戻りやすかったか
            </li>
            <li>
              <Link
                href="/analysis/vix-threshold-sp500"
                className="underline hover:text-gray-900"
              >
                VIX が 30 を超えた日、その後 S&amp;P500 はどう動いたか？
              </Link>{" "}
              — 米国の恐怖指数から見た同じ形の検証
            </li>
            <li>
              <Link href="/learn/what-is-drawdown" className="underline hover:text-gray-900">
                ドローダウンとは？
              </Link>{" "}
              — 「さらに下げた幅」の考え方
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
            Yahoo Finance（^N225）、市場温度は株温計独自計算。
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
