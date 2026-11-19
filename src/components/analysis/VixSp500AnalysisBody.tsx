"use client";

import { useEffect, useState } from "react";
import type { PeriodStats } from "@/lib/historical-stats";
import {
  type VixAnalysisPeriodKey,
  type VixEpisode,
  type VixEpisodeSummary,
  type VixPrimaryBand,
  type VixSp500Analysis,
  computeVixPercentile,
  findVixJointCell,
  VIX_JOINT_LOW_SAMPLE_THRESHOLD,
} from "@/lib/vix-sp500-analysis";
import { getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { heatmapCellStyle } from "@/lib/heatmap-colors";
import { trackEvent } from "@/lib/analytics";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import InvestingBooksCTA from "./InvestingBooksCTA";

const PERIODS: readonly VixAnalysisPeriodKey[] = ["1m", "3m", "6m"];
const PERIOD_LABELS: Record<VixAnalysisPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
};
const LOW_SAMPLE_THRESHOLD = VIX_JOINT_LOW_SAMPLE_THRESHOLD;

interface Props {
  analysis: VixSp500Analysis;
}

export default function VixSp500AnalysisBody({ analysis }: Props) {
  const [period, setPeriod] = useState<VixAnalysisPeriodKey>("3m");

  useEffect(() => {
    trackEvent("analysis_view", { slug: "vix-threshold-sp500" });
  }, []);

  const latest = analysis.latestContext;
  const quartiles = analysis.vixQuantiles;
  const latestPercentile = computeVixPercentile(quartiles, latest.vix);

  // VIX が p75 以上、または JP 温度が極端 → 上部アラート
  const isExtreme =
    latest.vix >= quartiles.p75 ||
    (latest.jpScore != null && (latest.jpScore <= 20 || latest.jpScore >= 81));

  const maxAbs = analysis.joint.cells.reduce((m, c) => {
    const v = Math.abs(c.returns[period].avgReturn);
    return v > m ? v : m;
  }, 0);

  return (
    <>
      {isExtreme && (
        <aside
          id="alert"
          role="note"
          className="bg-red-50 border border-red-300 rounded-xl p-4 my-6 not-prose"
        >
          <p className="text-xs text-red-700 mb-1">⚡ 今の注目ポイント</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            直近 (<time>{latest.date}</time>) の VIX は
            <strong className="mx-1">{latest.vix.toFixed(1)}</strong>
            で、過去20年分布の
            <strong className="mx-1">上位 {100 - latestPercentile}%</strong>
            に位置（{latest.vixBand} バンド）。
            {latest.jpScore != null && (
              <>
                日本版株温計は
                <strong
                  className="mx-1"
                  style={{ color: getSentimentColor(latest.jpScore) }}
                >
                  {latest.jpScore}点 ({latest.tempBand})
                </strong>
                。
              </>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            下の集計で同水準の過去事例の後、S&P500 と日経225 がどう動いたかを確認できます。
          </p>
        </aside>
      )}

      <section id="quartile" className="my-8 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          VIX の歴史的分布と、いまの水準
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          まず、今の VIX 水準が過去どれくらい珍しい数字なのかを、20 年分・{analysis.sampleSize}{" "}
          取引日の分布で確認します。直近の VIX は
          <strong className="mx-1">{latest.vix.toFixed(1)}</strong>
          で、過去分布の下位から <strong className="mx-1">{latestPercentile}%</strong>
          の位置にあります（上位 {100 - latestPercentile}%）。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">区分</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">VIX</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">意味</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              <tr>
                <td className="text-gray-500">下位 25%</td>
                <td className="font-mono">{quartiles.p25.toFixed(1)}</td>
                <td>極めて落ち着いた相場（低ボラ・油断ゾーン）</td>
              </tr>
              <tr>
                <td className="text-gray-500">中央値</td>
                <td className="font-mono">{quartiles.p50.toFixed(1)}</td>
                <td>通常レベル（平均的な緊張感）</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 25%</td>
                <td className="font-mono">{quartiles.p75.toFixed(1)}</td>
                <td>警戒ゾーン（ヘッジ需要が高まる）</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 5%</td>
                <td className="font-mono">{quartiles.p95.toFixed(1)}</td>
                <td>歴史的パニック水準（コロナ・リーマン級）</td>
              </tr>
              <tr className="bg-amber-50">
                <td className="text-gray-700 font-semibold">
                  いま（{latest.date}）
                </td>
                <td className="font-mono font-semibold">
                  {latest.vix.toFixed(1)}
                </td>
                <td>
                  分布の下位 <strong>{latestPercentile}%</strong>（={" "}
                  {latest.vixBand} バンド）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="primary" className="my-10 not-prose">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            VIX バンド別の S&P500・日経225 リターン（過去20年）
          </h2>
          <PeriodSwitcher<VixAnalysisPeriodKey>
            periods={PERIODS}
            labels={PERIOD_LABELS}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          VIX の水準ごとに過去同じだった取引日を集め、<strong>{PERIOD_LABELS[period]}</strong>
          の S&P500 と日経225 の平均リターンと勝率を算出しました。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>
                  VIX
                </th>
                <th className="px-3 py-2 text-right font-semibold" rowSpan={2}>
                  サンプル
                </th>
                <th
                  className="px-3 py-2 text-center font-semibold border-l border-gray-200"
                  colSpan={2}
                >
                  S&amp;P500
                </th>
                <th
                  className="px-3 py-2 text-center font-semibold border-l border-gray-200"
                  colSpan={2}
                >
                  日経225
                </th>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 border-l border-gray-200">
                  平均リターン
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                  勝率
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 border-l border-gray-200">
                  平均リターン
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                  勝率
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              {analysis.primary.bands.map((b) => {
                const isCurrent = b.band === latest.vixBand;
                const sp = b.sp500[period];
                const n = b.nikkei225[period];
                return (
                  <tr
                    key={b.band}
                    className={isCurrent ? "bg-amber-50" : undefined}
                  >
                    <td className={isCurrent ? "font-semibold" : ""}>
                      {b.band}
                      {isCurrent && (
                        <span className="block text-[11px] text-gray-400">
                          ▲ 現在
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono">{b.occurrences}</td>
                    <td
                      className={`text-right font-mono border-l border-gray-100 ${returnColorClass(sp.avgReturn)}`}
                    >
                      {formatReturn(sp.avgReturn)}
                    </td>
                    <td className="text-right font-mono">
                      {sp.winRate.toFixed(0)}%
                    </td>
                    <td
                      className={`text-right font-mono border-l border-gray-100 ${returnColorClass(n.avgReturn)}`}
                    >
                      {formatReturn(n.avgReturn)}
                    </td>
                    <td className="text-right font-mono">
                      {n.winRate.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          データ期間: {analysis.dataRange.from} 〜 {analysis.dataRange.to} （n={analysis.sampleSize}）
        </p>
      </section>

      {analysis.episodes && (
        <EpisodeSection
          summary={analysis.episodes}
          highBand={analysis.primary.bands.find((b) => b.band === "30〜")}
          period={period}
        />
      )}

      <InvestingBooksCTA placement="middle_cta" />

      <section id="joint" className="my-10 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          VIX × 日本版株温計 × 日経225（クロス市場ヒートマップ）
        </h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          米国の恐怖指数（VIX）と、日本の市場温度（日本版株温計）は別々の市場から作るセンチメント指標です。
          同時水準の組合せで、その後の日経225 がどう動いたかを {analysis.joint.sampleSize} 取引日分
          （{analysis.joint.dataRange.from} 〜 {analysis.joint.dataRange.to}）集計しました。
          <span className="block text-xs text-gray-500 mt-1">
            ※ 正=赤 / 負=緑（日本式配色）。サンプル数 {LOW_SAMPLE_THRESHOLD}{" "}
            未満のセルは薄色（参考値）。
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-left font-medium text-gray-500 sticky left-0 bg-white">
                  VIX ＼ 日本温度
                </th>
                {analysis.tempBands.map((tb) => {
                  const idx = ["極寒", "冷え込み", "平温", "過熱", "沸騰"].indexOf(tb);
                  const midScore = [10, 30, 50, 70, 90][idx >= 0 ? idx : 2];
                  const color = getSentimentColor(midScore);
                  const isCurrent = latest.tempBand === tb;
                  return (
                    <th
                      key={tb}
                      className={`px-2 py-2 text-center font-medium ${
                        isCurrent ? "text-gray-900" : "text-gray-500"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className={isCurrent ? "font-bold" : ""}>
                          {tb}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[11px] text-gray-400">
                          ◀ 現在
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {analysis.vixBands.map((vb) => {
                const isCurrentVix = vb.label === latest.vixBand;
                return (
                  <tr key={vb.label} className="border-b border-gray-50">
                    <td
                      className={`px-2 py-2 text-sm whitespace-nowrap sticky left-0 bg-white ${
                        isCurrentVix
                          ? "text-gray-900 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      VIX {vb.label}
                      {isCurrentVix && (
                        <span className="block text-[11px] text-gray-400">
                          ▲ 現在
                        </span>
                      )}
                    </td>
                    {analysis.tempBands.map((tb) => {
                      const cell = findVixJointCell(analysis, vb.label, tb);
                      if (!cell || cell.occurrences === 0) {
                        return (
                          <td
                            key={tb}
                            className="px-2 py-2 text-center text-gray-300"
                          >
                            —
                          </td>
                        );
                      }
                      const stats = cell.returns[period];
                      const isLow = cell.occurrences < LOW_SAMPLE_THRESHOLD;
                      const isCurrent =
                        isCurrentVix && latest.tempBand === tb;
                      return (
                        <td
                          key={tb}
                          className={`px-2 py-2 text-center ${
                            isCurrent ? "ring-2 ring-amber-400 ring-inset" : ""
                          }`}
                          style={heatmapCellStyle(stats.avgReturn, maxAbs, isLow)}
                          title={
                            isLow
                              ? `サンプル数が少ない (${cell.occurrences}日) ため参考値`
                              : `サンプル数: ${cell.occurrences}日`
                          }
                        >
                          <div
                            className={`text-sm font-medium ${
                              stats.avgReturn >= 0
                                ? "text-red-600"
                                : "text-green-700"
                            }`}
                          >
                            {formatReturn(stats.avgReturn)}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            勝率 {stats.winRate.toFixed(0)}% / n={cell.occurrences}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <InvestingBooksCTA placement="bottom_cta" />
    </>
  );
}

function StatCells({ stats }: { stats: PeriodStats | undefined }) {
  if (!stats || stats.sampleSize === 0) {
    return (
      <>
        <td className="text-right text-gray-300">—</td>
        <td className="text-right text-gray-300">—</td>
      </>
    );
  }
  return (
    <>
      <td className={`text-right font-mono ${returnColorClass(stats.avgReturn)}`}>
        {formatReturn(stats.avgReturn)}
      </td>
      <td className="text-right font-mono">{stats.winRate.toFixed(0)}%</td>
    </>
  );
}

function EpisodeSection({
  summary,
  highBand,
  period,
}: {
  summary: VixEpisodeSummary;
  highBand: VixPrimaryBand | undefined;
  period: VixAnalysisPeriodKey;
}) {
  const { episodes, firstDay, baseline, bottom, threshold, totalDays } = summary;
  const longest = episodes.reduce<VixEpisode | null>(
    (m, e) => (m == null || e.days > m.days ? e : m),
    null
  );
  return (
    <section id="episodes" className="my-10 not-prose">
      <h2 className="text-xl font-bold text-gray-900 mb-2">
        「日数」で数えるか、「回数」で数えるか
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed mb-4">
        上の表は、VIX が {threshold} 以上だった<strong>日</strong>をすべて数えています（{totalDays} 日）。
        この数え方だと、長く続いた危機ほど多く数えられ、その後半の<strong>底に近い日</strong>が成績を押し上げます。
        {longest && (
          <>
            {" "}たとえば {longest.start} から {longest.end} までの 1 回だけで {longest.days} 日あり、全体の
            {Math.round((longest.days / totalDays) * 100)}% を占めます。
          </>
        )}
        そこで、前に {threshold} 以上だった日から {summary.gapTradingDays} 営業日以内のものを同じ 1 回にまとめ、
        <strong>{threshold} を超えた最初の日</strong>に S&amp;P500 を買った場合も集計しました（{episodes.length} 回）。
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[480px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">
                買った日（{PERIOD_LABELS[period]}）
              </th>
              <th className="px-3 py-2 text-right font-semibold">平均リターン</th>
              <th className="px-3 py-2 text-right font-semibold">勝率</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
            <tr>
              <td>
                VIX {threshold} 以上の日すべて
                <span className="block text-[11px] text-gray-500">日数で数える（{highBand?.sp500[period].sampleSize ?? totalDays} 日）</span>
              </td>
              <StatCells stats={highBand?.sp500[period]} />
            </tr>
            <tr className="bg-amber-50">
              <td className="font-semibold">
                {threshold} を超えた最初の日
                <span className="block text-[11px] font-normal text-gray-500">
                  回数で数える（{firstDay[period].sampleSize} 回）
                </span>
              </td>
              <StatCells stats={firstDay[period]} />
            </tr>
            <tr>
              <td>
                普段の日
                <span className="block text-[11px] text-gray-500">全取引日</span>
              </td>
              <StatCells stats={baseline[period]} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mt-4">
        {threshold} を超えた最初の日の終値が、その後 6ヶ月の S&amp;P500 の最安値だったのは
        <strong className="mx-1">
          {bottom.of} 回中 {bottom.count} 回
        </strong>
        でした。「VIX が高い時期に良い買い場があった」ことと、「{threshold} を超えた日に買えば良かった」ことは別の話です。
        危機の前半か後半かは、そのときには分かりません。
      </p>

      <details className="mt-4">
        <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-900">
          {episodes.length} 回の一覧を見る
        </summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs border border-gray-200 rounded-lg min-w-[560px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left font-semibold">最初の日</th>
                <th className="px-2 py-2 text-right font-semibold">日数</th>
                <th className="px-2 py-2 text-right font-semibold">最高 VIX</th>
                <th className="px-2 py-2 text-right font-semibold">1ヶ月後</th>
                <th className="px-2 py-2 text-right font-semibold">3ヶ月後</th>
                <th className="px-2 py-2 text-right font-semibold">6ヶ月後</th>
                <th className="px-2 py-2 text-right font-semibold">その後の最安値まで</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-2 [&>tr>td]:py-1.5 [&>tr]:border-t [&>tr]:border-gray-100">
              {episodes.map((e) => (
                <tr key={e.start}>
                  <td className="font-mono">{e.start}</td>
                  <td className="text-right font-mono">{e.days}</td>
                  <td className="text-right font-mono">{e.peakVix.toFixed(1)}</td>
                  {PERIODS.map((p) => {
                    const v = e.sp500[p];
                    return (
                      <td
                        key={p}
                        className={`text-right font-mono ${v == null ? "text-gray-300" : returnColorClass(v)}`}
                      >
                        {v == null ? "—" : formatReturn(v)}
                      </td>
                    );
                  })}
                  <td className="text-right font-mono">
                    {e.sp500Drawdown == null
                      ? "—"
                      : e.sp500Drawdown >= 0
                        ? "その日が底"
                        : formatReturn(e.sp500Drawdown)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          リターンは最初の日の S&amp;P500 終値から 30/90/180 日後の終値まで。「その後の最安値まで」は 180 日以内の最安終値までの変化率。
        </p>
      </details>
    </section>
  );
}
