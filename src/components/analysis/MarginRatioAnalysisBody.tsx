"use client";

import { useEffect, useState } from "react";
import {
  type MarginAnalysisPeriodKey,
  type MarginRatioAnalysis,
  computeRatioPercentile,
  findJointCell,
} from "@/lib/margin-ratio-analysis";
import { getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { heatmapCellStyle } from "@/lib/heatmap-colors";
import { trackEvent } from "@/lib/analytics";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import MarginAccountCTA from "./MarginAccountCTA";

const PERIODS: readonly MarginAnalysisPeriodKey[] = ["1m", "3m", "6m"];
const PERIOD_LABELS: Record<MarginAnalysisPeriodKey, string> = {
  "1m": "1ヶ月後",
  "3m": "3ヶ月後",
  "6m": "6ヶ月後",
};
const LOW_SAMPLE_THRESHOLD = 10;

interface Props {
  analysis: MarginRatioAnalysis;
}

export default function MarginRatioAnalysisBody({ analysis }: Props) {
  const [period, setPeriod] = useState<MarginAnalysisPeriodKey>("3m");

  useEffect(() => {
    trackEvent("analysis_view", { slug: "margin-ratio-temperature" });
  }, []);

  const { joint, marginalRatio, marginalTemp, ratioBands, tempBands } = analysis;
  const latest = analysis.latestContext;
  const quartiles = analysis.ratioQuartiles;
  const latestPercentile = computeRatioPercentile(quartiles, latest.ratio);

  // dynamic boost 判定: 5倍以上 or 温度 極寒/沸騰
  const isExtreme =
    latest.ratio >= 5.0 ||
    (latest.score != null && (latest.score <= 20 || latest.score >= 81));

  // 2D セルで最も偏差の大きい avgReturn を基準に alpha 計算
  const maxAbs = joint.reduce((m, c) => {
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
          <p className="text-xs text-red-700 mb-1">⚡ 今週の注目ポイント</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            直近 (<time>{latest.date}</time>) の信用倍率は
            <strong className="mx-1">{latest.ratio.toFixed(2)}倍</strong>
            で、過去の分布で
            <strong className="mx-1">上位 {100 - latestPercentile}%</strong>
            の水準にあります（{latest.ratioBand}）。
            {latest.score != null && (
              <>
                同時の市場温度は
                <strong
                  className="mx-1"
                  style={{ color: getSentimentColor(latest.score) }}
                >
                  {latest.score}点 ({latest.tempBand})
                </strong>
                。
              </>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-2">
            下のヒートマップで同水準の過去事例の後どのように日経225 が動いたかを確認できます。
          </p>
        </aside>
      )}

      <section id="quartile" className="my-8 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          信用倍率の歴史的分布と、いまの水準
        </h2>
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          まず、そもそも「信用倍率◯倍」がどれくらい珍しい数字なのかを、過去{" "}
          {analysis.sampleSize} 週分の分布で見てみます。直近の信用倍率は
          <strong className="mx-1">{latest.ratio.toFixed(2)}倍</strong>
          で、過去分布の下位から <strong className="mx-1">{latestPercentile}%</strong>
          の位置にあります（上位 {100 - latestPercentile}%）。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">区分</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">信用倍率</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">意味</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              <tr>
                <td className="text-gray-500">下位 25%</td>
                <td className="font-mono">{quartiles.p25.toFixed(2)} 倍</td>
                <td>売残が比較的多い局面（底練り / 悲観後）</td>
              </tr>
              <tr>
                <td className="text-gray-500">中央値</td>
                <td className="font-mono">{quartiles.p50.toFixed(2)} 倍</td>
                <td>普通の地合い</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 25%</td>
                <td className="font-mono">{quartiles.p75.toFixed(2)} 倍</td>
                <td>買い方優勢（需給的には重い）</td>
              </tr>
              <tr>
                <td className="text-gray-500">上位 5%</td>
                <td className="font-mono">{quartiles.p95.toFixed(2)} 倍</td>
                <td>歴史的に高水準（過熱懸念）</td>
              </tr>
              <tr className="bg-amber-50">
                <td className="text-gray-700 font-semibold">
                  いま（{latest.date}）
                </td>
                <td className="font-mono font-semibold">
                  {latest.ratio.toFixed(2)} 倍
                </td>
                <td>
                  分布の下位 <strong>{latestPercentile}%</strong>（={" "}
                  {latest.ratioBand} バンド）
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="heatmap" className="my-10 not-prose">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="text-xl font-bold text-gray-900">
            信用倍率 × 株温計 × 日経225 リターン
          </h2>
          <PeriodSwitcher<MarginAnalysisPeriodKey>
            periods={PERIODS}
            labels={PERIOD_LABELS}
            value={period}
            onChange={setPeriod}
          />
        </div>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          縦軸=信用倍率バンド、横軸=株温計の温度帯。セル内は同条件だった過去週の
          <strong>{PERIOD_LABELS[period]}</strong>の日経225 平均リターンと勝率。
          <span className="block text-xs text-gray-500 mt-1">
            ※ 正=赤 / 負=緑（日本式配色）。サンプル数 {LOW_SAMPLE_THRESHOLD} 未満のセルは薄色（参考値）。
          </span>
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-2 py-2 text-left font-medium text-gray-500 sticky left-0 bg-white">
                  信用倍率＼温度
                </th>
                {tempBands.map((tb) => {
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
                        <span className={isCurrent ? "font-bold" : ""}>{tb}</span>
                      </div>
                      {isCurrent && (
                        <span className="text-[10px] text-gray-400">◀ 現在</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {ratioBands.map((rb) => {
                const isCurrentRatioBand = rb.label === latest.ratioBand;
                return (
                  <tr key={rb.label} className="border-b border-gray-50">
                    <td
                      className={`px-2 py-2 text-sm whitespace-nowrap sticky left-0 bg-white ${
                        isCurrentRatioBand
                          ? "text-gray-900 font-semibold"
                          : "text-gray-700"
                      }`}
                    >
                      {rb.label}
                      {isCurrentRatioBand && (
                        <span className="block text-[10px] text-gray-400">
                          ▲ 現在
                        </span>
                      )}
                    </td>
                    {tempBands.map((tb) => {
                      const cell = findJointCell(analysis, rb.label, tb);
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
                        isCurrentRatioBand && latest.tempBand === tb;
                      return (
                        <td
                          key={tb}
                          className={`px-2 py-2 text-center ${
                            isCurrent ? "ring-2 ring-amber-400 ring-inset" : ""
                          }`}
                          style={heatmapCellStyle(stats.avgReturn, maxAbs, isLow)}
                          title={
                            isLow
                              ? `サンプル数が少ない (${cell.occurrences}週) ため参考値`
                              : `サンプル数: ${cell.occurrences}週`
                          }
                        >
                          <div
                            className={`text-sm font-medium ${
                              stats.avgReturn >= 0 ? "text-red-600" : "text-green-700"
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

      <section id="marginal-ratio" className="my-10 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          信用倍率バンド別の{PERIOD_LABELS[period]}リターン（温度を問わず）
        </h2>
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          信用倍率<strong>だけ</strong>を見た場合の集計。比率単独では違いが出にくいことが読み取れます。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">信用倍率</th>
                <th className="px-3 py-2 text-right font-semibold">週数</th>
                <th className="px-3 py-2 text-right font-semibold">平均</th>
                <th className="px-3 py-2 text-right font-semibold">中央値</th>
                <th className="px-3 py-2 text-right font-semibold">勝率</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              {marginalRatio.map((m) => {
                const s = m.returns[period];
                const isCurrent = m.band === latest.ratioBand;
                return (
                  <tr
                    key={m.band}
                    className={isCurrent ? "bg-amber-50" : undefined}
                  >
                    <td className={isCurrent ? "font-semibold" : ""}>{m.band}</td>
                    <td className="text-right font-mono">{m.occurrences}</td>
                    <td
                      className={`text-right font-mono ${returnColorClass(s.avgReturn)}`}
                    >
                      {formatReturn(s.avgReturn)}
                    </td>
                    <td
                      className={`text-right font-mono ${returnColorClass(s.medianReturn)}`}
                    >
                      {formatReturn(s.medianReturn)}
                    </td>
                    <td className="text-right font-mono">
                      {s.winRate.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section id="marginal-temp" className="my-10 not-prose">
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          温度バンド別の{PERIOD_LABELS[period]}リターン（対比用）
        </h2>
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          対比として、株温計<strong>だけ</strong>で見た場合の同じ集計。こちらは温度帯ごとにはっきりと差が出ます。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-right font-semibold">週数</th>
                <th className="px-3 py-2 text-right font-semibold">平均</th>
                <th className="px-3 py-2 text-right font-semibold">中央値</th>
                <th className="px-3 py-2 text-right font-semibold">勝率</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              {marginalTemp.map((m) => {
                const s = m.returns[period];
                const isCurrent = m.band === latest.tempBand;
                return (
                  <tr
                    key={m.band}
                    className={isCurrent ? "bg-amber-50" : undefined}
                  >
                    <td className={isCurrent ? "font-semibold" : ""}>{m.band}</td>
                    <td className="text-right font-mono">{m.occurrences}</td>
                    <td
                      className={`text-right font-mono ${returnColorClass(s.avgReturn)}`}
                    >
                      {formatReturn(s.avgReturn)}
                    </td>
                    <td
                      className={`text-right font-mono ${returnColorClass(s.medianReturn)}`}
                    >
                      {formatReturn(s.medianReturn)}
                    </td>
                    <td className="text-right font-mono">
                      {s.winRate.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <MarginAccountCTA placement="bottom_cta" />
    </>
  );
}
