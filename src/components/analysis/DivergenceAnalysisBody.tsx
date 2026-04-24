"use client";

import { useEffect, useState } from "react";
import {
  type DivergenceAnalysis,
  type DivergenceAnalysisPeriodKey,
  computeGapPercentile,
  describeGap,
  findDivergenceJointCell,
} from "@/lib/divergence-analysis";
import { getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { heatmapCellStyle } from "@/lib/heatmap-colors";
import { trackEvent } from "@/lib/analytics";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import InvestingBooksCTA from "./InvestingBooksCTA";

const PERIODS: readonly DivergenceAnalysisPeriodKey[] = ["1m", "3m", "6m"];
const PERIOD_LABELS: Record<DivergenceAnalysisPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
};
const LOW_SAMPLE_THRESHOLD = 20;

interface Props {
  analysis: DivergenceAnalysis;
}

export default function DivergenceAnalysisBody({ analysis }: Props) {
  const [period, setPeriod] = useState<DivergenceAnalysisPeriodKey>("3m");

  useEffect(() => {
    trackEvent("analysis_view", { slug: "temperature-divergence" });
  }, []);

  const latest = analysis.latestContext;
  const quantiles = analysis.gapQuantiles;
  const latestPercentile = computeGapPercentile(quantiles, latest.gap);

  // 乖離が p75 超 / p25 未満（極端）なら上部アラート
  const isExtreme = latest.gap >= quantiles.p75 || latest.gap <= quantiles.p25;

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
          className="bg-amber-50 border border-amber-300 rounded-xl p-4 my-6 not-prose"
        >
          <p className="text-xs text-amber-800 mb-1">⚡ 今の注目ポイント</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            直近 (<time>{latest.date}</time>) の温度差は
            <strong className="mx-1">
              {latest.gap >= 0 ? "+" : ""}
              {latest.gap.toFixed(0)}
            </strong>
            （日本{" "}
            <strong style={{ color: getSentimentColor(latest.jpScore) }}>
              {latest.jpScore}
            </strong>{" "}
            − 米国{" "}
            <strong style={{ color: getSentimentColor(latest.usScore) }}>
              {latest.usScore}
            </strong>
            ）。{describeGap(latest.gap)} 局面で、過去 10 年分布の
            <strong className="mx-1">
              {latest.gap >= 0
                ? `上位 ${100 - latestPercentile}%`
                : `下位 ${latestPercentile}%`}
            </strong>
            に位置（{latest.gapBand}）。
          </p>
          <p className="text-xs text-gray-600 mt-2">
            下の集計で同水準の過去事例の後、S&P500 と日経225 がどう動いたかを確認できます。
          </p>
        </aside>
      )}

      <section id="quartile" className="my-8 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          温度差の歴史的分布と、いまの水準
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          まず、いまの温度差が過去どれくらい珍しい数字なのかを、{analysis.sampleSize.toLocaleString()}{" "}
          取引日の分布で確認します。直近の温度差は
          <strong className="mx-1">
            {latest.gap >= 0 ? "+" : ""}
            {latest.gap.toFixed(0)}
          </strong>
          で、過去分布の下位から{" "}
          <strong className="mx-1">{latestPercentile}%</strong>
          の位置にあります（{latest.gap >= 0 ? "上位" : "下位"}{" "}
          {latest.gap >= 0 ? 100 - latestPercentile : latestPercentile}%）。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  区分
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  温度差 (JP − US)
                </th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">
                  意味
                </th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              <tr>
                <td className="text-gray-500">下位 10%</td>
                <td className="font-mono">{quantiles.p10.toFixed(0)}</td>
                <td>米国が極端に熱い（VIX 急騰時など）</td>
              </tr>
              <tr>
                <td className="text-gray-500">下位 25%</td>
                <td className="font-mono">{quantiles.p25.toFixed(0)}</td>
                <td>米国がやや熱い</td>
              </tr>
              <tr>
                <td className="text-gray-500">中央値</td>
                <td className="font-mono">
                  {quantiles.p50 >= 0 ? "+" : ""}
                  {quantiles.p50.toFixed(0)}
                </td>
                <td>過去10年の中央水準（米国がやや優勢な期間が長かった）</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 25%</td>
                <td className="font-mono">
                  {quantiles.p75 >= 0 ? "+" : ""}
                  {quantiles.p75.toFixed(0)}
                </td>
                <td>日本がやや熱い</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 10%</td>
                <td className="font-mono">
                  {quantiles.p90 >= 0 ? "+" : ""}
                  {quantiles.p90.toFixed(0)}
                </td>
                <td>日本が極端に熱い（円安進行・需給フィーバー時など）</td>
              </tr>
              <tr className="bg-amber-50">
                <td className="text-gray-700 font-semibold">
                  いま（{latest.date}）
                </td>
                <td className="font-mono font-semibold">
                  {latest.gap >= 0 ? "+" : ""}
                  {latest.gap.toFixed(0)}
                </td>
                <td>
                  分布の{latest.gap >= 0 ? "上位" : "下位"}{" "}
                  <strong>
                    {latest.gap >= 0
                      ? 100 - latestPercentile
                      : latestPercentile}
                    %
                  </strong>
                  （= {latest.gapBand}）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="primary" className="my-10 not-prose">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            温度差バンド別の S&P500・日経225 リターン（過去10年）
          </h2>
          <PeriodSwitcher<DivergenceAnalysisPeriodKey>
            periods={PERIODS}
            labels={PERIOD_LABELS}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          温度差の水準ごとに過去同じだった取引日を集め、<strong>{PERIOD_LABELS[period]}</strong>
          の S&P500 と日経225 の平均リターンと勝率を算出しました。「スプレッド」列は
          <strong>日経225 平均 − S&P500 平均</strong>{" "}
          で、正なら日経225 が相対的に優位、負なら S&P500 が優位だったという意味です。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold" rowSpan={2}>
                  温度差バンド
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
                <th
                  className="px-3 py-2 text-center font-semibold border-l border-gray-200"
                  rowSpan={2}
                >
                  スプレッド
                  <br />
                  <span className="text-[10px] font-normal text-gray-500">
                    (N225 − S&amp;P500)
                  </span>
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
                const isCurrent = b.band === latest.gapBand;
                const sp = b.sp500[period];
                const n = b.nikkei225[period];
                const spread = b.spread[period];
                return (
                  <tr
                    key={b.band}
                    className={isCurrent ? "bg-amber-50" : undefined}
                  >
                    <td className={isCurrent ? "font-semibold" : ""}>
                      {b.band}
                      {isCurrent && (
                        <span className="block text-[10px] text-gray-400">
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
                    <td
                      className={`text-right font-mono border-l border-gray-100 ${returnColorClass(spread)}`}
                    >
                      {spread >= 0 ? "+" : ""}
                      {spread.toFixed(1)}pp
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          データ期間: {analysis.dataRange.from} 〜 {analysis.dataRange.to} （n=
          {analysis.sampleSize.toLocaleString()}）
        </p>
      </section>

      <InvestingBooksCTA placement="middle_cta" article="temperature-divergence" />

      <section id="joint" className="my-10 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          温度差 × 日本版温度 × 日経225（クロス市場ヒートマップ）
        </h2>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          同じ温度差でも、日本の絶対水準（沸騰なのか平温なのか）で結果は変わります。日本版温度バンドと組み合わせて、その後の日経225 がどう動いたかを{" "}
          {analysis.joint.sampleSize.toLocaleString()} 取引日分（
          {analysis.joint.dataRange.from} 〜 {analysis.joint.dataRange.to}）集計しました。
          <span className="block text-xs text-gray-500 mt-1">
            ※ 正=赤 / 負=緑（日本式配色）。サンプル数 {LOW_SAMPLE_THRESHOLD}{" "}
            未満のセルは薄色（参考値）。
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-left font-medium text-gray-500 sticky left-0 bg-white">
                  温度差 ＼ 日本温度
                </th>
                {analysis.tempBands.map((tb) => {
                  const idx = ["極寒", "冷え込み", "平温", "過熱", "沸騰"].indexOf(
                    tb
                  );
                  const midScore = [10, 30, 50, 70, 90][idx >= 0 ? idx : 2];
                  const color = getSentimentColor(midScore);
                  const isCurrent = latest.jpTempBand === tb;
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
                        <span className={isCurrent ? "font-bold" : ""}>{tb}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-gray-400">
                          ◀ 現在
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {analysis.gapBands.map((gb) => {
                const isCurrentGap = gb.label === latest.gapBand;
                return (
                  <tr key={gb.label} className="border-b border-gray-50">
                    <td
                      className={`px-2 py-2 text-sm whitespace-nowrap sticky left-0 bg-white ${
                        isCurrentGap
                          ? "text-gray-900 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {gb.label}
                      {isCurrentGap && (
                        <span className="block text-[10px] text-gray-400">
                          ▲ 現在
                        </span>
                      )}
                    </td>
                    {analysis.tempBands.map((tb) => {
                      const cell = findDivergenceJointCell(analysis, gb.label, tb);
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
                        isCurrentGap && latest.jpTempBand === tb;
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
                          <div className="text-[10px] text-gray-500">
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

      <InvestingBooksCTA placement="bottom_cta" article="temperature-divergence" />
    </>
  );
}
