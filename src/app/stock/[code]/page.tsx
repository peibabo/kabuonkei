import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import TemperatureChartSvg from "@/components/stock/TemperatureChartSvg";
import StockDisclaimer from "@/components/stock/StockDisclaimer";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import { getSentimentColor, getSentimentLevel } from "@/lib/sentiment";
import {
  countByBand,
  computeChanges,
  computeRangeStats,
  getAllStockSummaries,
  getStockCodes,
  getStockEntry,
  getStockTemperatureFile,
  rankOf,
  recentHistory,
  topPercentInYear,
} from "@/lib/stock-temperature";
import { formatScoreDiff, formatJaDate } from "@/lib/stock-temperature/format";

export const dynamic = "error";
export const dynamicParams = false;

const CHART_DAYS = 90;
const TABLE_ROWS = 30;
const PEER_COUNT = 5;
const BAND_LABELS = ["極寒", "冷え込み", "平温", "過熱", "沸騰"] as const;

export async function generateStaticParams() {
  return getStockCodes().map((code) => ({ code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const entry = getStockEntry(code);
  if (!entry || entry.history.length === 0) return {};
  const [, score] = entry.history[entry.history.length - 1];
  const { d1 } = computeChanges(entry.history);
  const title = `${entry.name}（${code}）の株価の温度｜株温計`;
  const description = `${entry.name}（${code}）の株価の温度は${score}（${getSentimentLevel(score)}）、前日比${formatScoreDiff(d1)}。125日移動平均からの乖離を銘柄ごとの値動きの大きさで0〜100に換算した独自指標で、過去1年の分布・日経225内の順位・直近90日の推移を毎営業日更新しています。`;
  const path = `/stock/${code}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    // 銘柄ごとの OG 画像は作らず、サイト共通の画像を使う
    openGraph: {
      title,
      description,
      type: "website",
      url: path,
      locale: "ja_JP",
      images: ["/opengraph-image"],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/opengraph-image"] },
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const entry = getStockEntry(code);
  if (!entry || entry.history.length === 0) notFound();

  const file = getStockTemperatureFile();
  const history = entry.history;
  const [latestDate, score] = history[history.length - 1];
  const level = getSentimentLevel(score);
  const changes = computeChanges(history);
  const chart = recentHistory(history, CHART_DAYS);
  const stats90 = computeRangeStats(chart);
  const topPct = topPercentInYear(history);
  const bands = countByBand(history);

  const all = getAllStockSummaries();
  const rank = rankOf(all, code);
  const sectorList = all.filter((s) => s.sector === entry.sector);
  const sectorRank = rankOf(sectorList, code);
  const peers = sectorList.filter((s) => s.code !== code).slice(0, PEER_COUNT);

  const tableRows = history
    .map(([date, s], i) => ({ date, score: s, diff: i > 0 ? s - history[i - 1][1] : null }))
    .slice(-TABLE_ROWS)
    .reverse();

  const path = `/stock/${code}`;
  const breadcrumbItems = [
    { name: "ホーム", path: "/" },
    { name: "銘柄別の温度", path: "/stock" },
    { name: `${entry.name}（${code}）` },
  ];
  const datasetJsonLd = buildDatasetJsonLd({
    url: path,
    name: `${entry.name}（${code}）の株価の温度（株温計）`,
    description: `${entry.name}（${code}）の株価の温度（0〜100）の日次推移。125日移動平均からの乖離を銘柄ごとの値動きの大きさで換算した株温計の独自指標。`,
    dateModified: file.generatedAt.slice(0, 10),
    temporalCoverage: { from: history[0][0], to: latestDate },
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: datasetJsonLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: buildBreadcrumbJsonLd(breadcrumbItems) }}
      />
      <StaticPageLayout title={`${entry.name}（${code}）の株価の温度`}>
        <Breadcrumb items={breadcrumbItems} />

        <section className="not-prose border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">
            {formatJaDate(latestDate)} 終値時点 ・ 東証33業種: {entry.sector}
          </p>
          <div className="flex items-baseline gap-3 mt-2">
            <span className="text-5xl font-bold" style={{ color: getSentimentColor(score) }}>
              {score}
            </span>
            <span className="text-xl font-semibold" style={{ color: getSentimentColor(score) }}>
              {level}
            </span>
          </div>
          <dl className="grid grid-cols-3 gap-3 mt-4 text-center">
            {[
              { label: "前日比", value: changes.d1 },
              { label: "1週間前比", value: changes.w1 },
              { label: "1か月前比", value: changes.m1 },
            ].map((c) => (
              <div key={c.label} className="bg-gray-50 rounded-lg py-2">
                <dt className="text-xs text-gray-500">{c.label}</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatScoreDiff(c.value)}</dd>
              </div>
            ))}
          </dl>
          {rank != null && (
            <p className="text-sm text-gray-700 mt-4">
              日経225採用 {all.length} 銘柄中 <strong>{rank} 位</strong>の熱さ
              {sectorRank != null && sectorList.length > 1 && (
                <>
                  （{entry.sector} {sectorList.length} 銘柄中 {sectorRank} 位）
                </>
              )}
              。
            </p>
          )}
        </section>

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">直近{CHART_DAYS}日の温度推移</h2>
          <TemperatureChartSvg
            history={chart}
            label={`${entry.name}の直近${CHART_DAYS}日の温度推移。最新は${score}`}
          />
          {stats90 && (
            <dl className="grid grid-cols-3 gap-3 mt-3 text-center text-sm">
              <div>
                <dt className="text-gray-500">最高</dt>
                <dd className="font-semibold text-gray-900">
                  {stats90.max[1]}（{formatJaDate(stats90.max[0], { year: false })}）
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">最低</dt>
                <dd className="font-semibold text-gray-900">
                  {stats90.min[1]}（{formatJaDate(stats90.min[0], { year: false })}）
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">平均</dt>
                <dd className="font-semibold text-gray-900">{stats90.avg}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">過去1年の温度の分布</h2>
          {topPct != null && (
            <p className="text-base text-gray-700 mb-3">
              今日の温度 {score} は、過去1年（{history.length} 営業日）の中で
              <strong>上位 {topPct}% の熱さ</strong>です。
            </p>
          )}
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-1 font-normal">温度帯</th>
                <th className="text-right py-1 font-normal">日数</th>
                <th className="text-right py-1 font-normal">割合</th>
              </tr>
            </thead>
            <tbody>
              {BAND_LABELS.map((label, i) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-1">{label}</td>
                  <td className="py-1 text-right">{bands[i]}</td>
                  <td className="py-1 text-right">
                    {Math.round((bands[i] / history.length) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">直近{TABLE_ROWS}営業日の温度</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-1 font-normal">日付</th>
                <th className="text-right py-1 font-normal">温度</th>
                <th className="text-right py-1 font-normal">温度帯</th>
                <th className="text-right py-1 font-normal">前日比</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.date} className="border-b border-gray-100">
                  <td className="py-1">{formatJaDate(r.date)}</td>
                  <td className="py-1 text-right font-semibold">{r.score}</td>
                  <td className="py-1 text-right">{getSentimentLevel(r.score)}</td>
                  <td className="py-1 text-right">{formatScoreDiff(r.diff)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {peers.length > 0 && (
          <section className="not-prose">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              同じ業種（{entry.sector}）の温度が高い銘柄
            </h2>
            <ul className="divide-y divide-gray-100 text-base">
              {peers.map((p) => (
                <li key={p.code} className="flex justify-between py-1.5">
                  <Link href={`/stock/${p.code}`} className="underline hover:text-gray-900">
                    {p.name}（{p.code}）
                  </Link>
                  <span className="font-semibold" style={{ color: getSentimentColor(p.score) }}>
                    {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="not-prose text-sm text-gray-600">
          <h2 className="text-base font-bold text-gray-900 mb-1">株価の温度とは</h2>
          <p>
            株温計の「株価の温度」は、終値が125日移動平均からどれだけ離れているかを、その銘柄の直近1年の値動きの大きさで割って0〜100に換算した独自指標です。50が平常、高いほど移動平均を大きく上回って「熱い」状態を表します。値動きの大きい銘柄・小さい銘柄を同じ物差しで比べられるようにしています。市場全体の温度は
            <Link href="/" className="underline">トップページ</Link>、業種ごとの傾向は
            <Link href="/sectors" className="underline">業種別ヒートマップ</Link>
            、銘柄の一覧は<Link href="/ranking" className="underline">温度ランキング</Link>をご覧ください。
          </p>
        </section>

        <StockDisclaimer generatedAt={file.generatedAt} />
      </StaticPageLayout>
    </>
  );
}
