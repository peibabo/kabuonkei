import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import StaticPageLayout from "@/components/StaticPageLayout";
import Breadcrumb from "@/components/Breadcrumb";
import JsonLd from "@/components/JsonLd";
import TemperatureChartSvg from "@/components/stock/TemperatureChartSvg";
import StockDisclaimer from "@/components/stock/StockDisclaimer";
import StockScoreList, { STOCK_TABLE_CLASS } from "@/components/stock/StockScoreList";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import { SENTIMENT_LEVELS, getSentimentColor, getSentimentLevel } from "@/lib/sentiment";
import {
  computeChanges,
  computeRangeStats,
  countByLevel,
  formatJaDate,
  formatScoreDiff,
  getAllStockSummaries,
  getStockCodes,
  getStockEntry,
  getStockTemperatureFile,
  getUniverseLabel,
  historySpanDays,
  rankOf,
  recentHistory,
  topPercent,
} from "@/lib/stock-temperature";
import { buildStockPageMetadata } from "@/lib/stock-temperature/metadata";

export const dynamic = "error";
export const dynamicParams = false;

const CHART_DAYS = 90;
const TABLE_ROWS = 30;
const PEER_COUNT = 5;
/** 履歴がこの日数以上あれば「過去1年」と表記する（上場から日が浅い銘柄は満たない） */
const FULL_YEAR_SPAN_DAYS = 350;

type Params = { params: Promise<{ code: string }> };

export async function generateStaticParams() {
  return getStockCodes().map((code) => ({ code }));
}

/** メタ情報とページ本体で共通に使う値 */
async function loadStock({ params }: Params) {
  const { code } = await params;
  const entry = getStockEntry(code);
  if (!entry || entry.history.length === 0) notFound();
  const history = entry.history;
  const [latestDate, score] = history[history.length - 1];
  return {
    code,
    entry,
    history,
    latestDate,
    score,
    level: getSentimentLevel(score),
    changes: computeChanges(history),
    path: `/stock/${code}`,
  };
}

export async function generateMetadata(props: Params): Promise<Metadata> {
  const { code, entry, score, level, changes, path } = await loadStock(props);
  return buildStockPageMetadata({
    path,
    title: `${entry.name}（${code}）の株価の温度｜株温計`,
    description: `${entry.name}（${code}）の株価の温度は${score}（${level}）、前日比${formatScoreDiff(changes.d1)}。125日移動平均からの乖離を銘柄ごとの値動きの大きさで0〜100に換算した独自指標で、温度の分布・${getUniverseLabel()}銘柄内の順位・直近${CHART_DAYS}日の推移を毎営業日更新しています。`,
  });
}

export default async function StockPage(props: Params) {
  const { code, entry, history, latestDate, score, level, changes, path } = await loadStock(props);

  const file = getStockTemperatureFile();
  const chart = recentHistory(history, CHART_DAYS);
  const stats90 = computeRangeStats(chart);
  const topPct = topPercent(history);
  const levelCounts = countByLevel(history);
  // 上場から日が浅い銘柄は1年分の履歴がないので、算出開始日からの期間として表記する
  const periodLabel =
    historySpanDays(history) >= FULL_YEAR_SPAN_DAYS
      ? "過去1年"
      : `算出開始（${formatJaDate(history[0][0])}）以降`;

  const all = getAllStockSummaries();
  const rank = rankOf(all, code);
  const sectorList = all.filter((s) => s.sector === entry.sector);
  const sectorRank = rankOf(sectorList, code);
  const peers = sectorList.filter((s) => s.code !== code).slice(0, PEER_COUNT);

  const tableRows = history
    .map(([date, s], i) => ({ date, score: s, diff: i > 0 ? s - history[i - 1][1] : null }))
    .slice(-TABLE_ROWS)
    .reverse();

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
      <JsonLd json={datasetJsonLd} />
      <JsonLd json={buildBreadcrumbJsonLd(breadcrumbItems)} />
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
              {getUniverseLabel()} {all.length} 銘柄中 <strong>{rank} 位</strong>の熱さ
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
              {[
                { label: "最高", point: stats90.max },
                { label: "最低", point: stats90.min },
              ].map(({ label, point }) => (
                <div key={label}>
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="font-semibold text-gray-900">
                    {point[1]}（{formatJaDate(point[0], { year: false })}）
                  </dd>
                </div>
              ))}
              <div>
                <dt className="text-gray-500">平均</dt>
                <dd className="font-semibold text-gray-900">{stats90.avg}</dd>
              </div>
            </dl>
          )}
        </section>

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{periodLabel}の温度の分布</h2>
          {topPct != null && (
            <p className="text-base text-gray-700 mb-3">
              今日の温度 {score} は、{periodLabel}（{history.length} 営業日）の中で
              <strong>上位 {topPct}% の熱さ</strong>です。
            </p>
          )}
          <table className={STOCK_TABLE_CLASS}>
            <thead>
              <tr>
                <th className="text-left">温度帯</th>
                <th className="text-right">日数</th>
                <th className="text-right">割合</th>
              </tr>
            </thead>
            <tbody>
              {SENTIMENT_LEVELS.map((l) => (
                <tr key={l}>
                  <td>{l}</td>
                  <td className="text-right">{levelCounts[l]}</td>
                  <td className="text-right">
                    {Math.round((levelCounts[l] / history.length) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="not-prose">
          <h2 className="text-lg font-bold text-gray-900 mb-2">直近{TABLE_ROWS}営業日の温度</h2>
          <table className={STOCK_TABLE_CLASS}>
            <thead>
              <tr>
                <th className="text-left">日付</th>
                <th className="text-right">温度</th>
                <th className="text-right">温度帯</th>
                <th className="text-right">前日比</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.date}>
                  <td>{formatJaDate(r.date)}</td>
                  <td className="text-right font-semibold">{r.score}</td>
                  <td className="text-right">{getSentimentLevel(r.score)}</td>
                  <td className="text-right">{formatScoreDiff(r.diff)}</td>
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
            <StockScoreList items={peers} />
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
