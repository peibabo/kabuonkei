"use client";

import { useState } from "react";
import {
  getJapanSectorHeatmap,
  getTopSectorsForScore,
  type SectorPeriodKey,
} from "@/lib/japan-sector-heatmap";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import { formatReturn } from "@/lib/format";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";

interface Props {
  japanScore: number | null;
}

const PERIODS: readonly SectorPeriodKey[] = ["1m", "3m", "6m"];
const PERIOD_LABELS: Record<SectorPeriodKey, string> = {
  "1m": "1ヶ月",
  "3m": "3ヶ月",
  "6m": "6ヶ月",
};

/** サンプル数がこの値未満の温度帯は薄色 + 注意表示にする */
const LOW_SAMPLE_THRESHOLD = 30;

/** ヒートマップセルの背景色（日本式: 正=赤 / 負=緑）を強度付きで返す */
function heatmapCellStyle(
  avgReturn: number,
  maxAbs: number,
  isLowSample: boolean
): React.CSSProperties {
  if (maxAbs === 0) return {};
  const intensity = Math.min(Math.abs(avgReturn) / maxAbs, 1);
  // 0.06 〜 0.55 の alpha にマップ。サンプル薄のセルは更に半減
  const alpha =
    (0.06 + intensity * 0.49) * (isLowSample ? 0.4 : 1);
  const rgb = avgReturn >= 0 ? "220, 38, 38" : "34, 197, 94";
  return { backgroundColor: `rgba(${rgb}, ${alpha})` };
}

function computeMaxAbsReturn(
  sectors: ReturnType<typeof getJapanSectorHeatmap>["sectors"],
  period: SectorPeriodKey
): number {
  let max = 0;
  for (const s of sectors) {
    for (const l of s.levels) {
      const v = Math.abs(l.stats[period].avgReturn);
      if (v > max) max = v;
    }
  }
  return max;
}

export default function SectorHeatmapCard({ japanScore }: Props) {
  const [period, setPeriod] = useState<SectorPeriodKey>("3m");
  const heatmap = getJapanSectorHeatmap();

  if (japanScore == null || heatmap.sectors.length === 0) return null;

  const currentLevel = getSentimentLevel(japanScore);
  const currentColor = getSentimentColor(japanScore);
  const maxAbs = computeMaxAbsReturn(heatmap.sectors, period);
  const topRankings = getTopSectorsForScore(japanScore, period, 3);
  const medalEmojis = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">
          🇯🇵 温度帯別の業種パフォーマンス
        </h2>
        <PeriodSwitcher<SectorPeriodKey>
          periods={PERIODS}
          labels={PERIOD_LABELS}
          value={period}
          onChange={setPeriod}
        />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        日本版温度が同じだったとき、どの業種が{PERIOD_LABELS[period]}後に強かったか（TOPIX-17 連動 ETF ベース）
      </p>

      {topRankings.length > 0 && (
        <div
          className="rounded-lg p-4 mb-6"
          style={{
            borderLeft: `4px solid ${currentColor}`,
            backgroundColor: `${currentColor}10`,
          }}
        >
          <p className="text-xs text-gray-600 mb-2">
            現在の「
            <span className="font-bold" style={{ color: currentColor }}>
              {currentLevel}
            </span>
            」帯で過去{PERIOD_LABELS[period]}後の平均リターン TOP3
          </p>
          <div className="flex flex-wrap gap-2">
            {topRankings.map((r, i) => (
              <div
                key={r.sector.code}
                className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm shadow-sm border border-gray-200"
              >
                <span>{medalEmojis[i]}</span>
                <span className="font-medium text-gray-900">
                  {r.sector.name}
                </span>
                <span
                  className={
                    r.stats.avgReturn >= 0 ? "text-red-500" : "text-green-500"
                  }
                >
                  {formatReturn(r.stats.avgReturn)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium sticky left-0 bg-white">
                業種
              </th>
              {heatmap.sectors[0].levels.map((l) => {
                const isCurrent = l.level === currentLevel;
                const midScore = (l.scoreRange[0] + l.scoreRange[1]) / 2;
                const color = getSentimentColor(midScore);
                return (
                  <th
                    key={l.level}
                    className={`px-2 py-2 text-center text-xs font-medium ${
                      isCurrent ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className={isCurrent ? "font-bold" : ""}>
                        {l.level}
                      </span>
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
            {heatmap.sectors.map((sector) => (
              <tr key={sector.code} className="border-b border-gray-50">
                <td className="px-2 py-2 text-sm text-gray-700 whitespace-nowrap sticky left-0 bg-white">
                  {sector.name}
                </td>
                {sector.levels.map((l) => {
                  const isCurrent = l.level === currentLevel;
                  const periodStats = l.stats[period];
                  const isLowSample = l.occurrences < LOW_SAMPLE_THRESHOLD;
                  return (
                    <td
                      key={l.level}
                      className={`px-2 py-2 text-center ${
                        isCurrent ? "ring-1 ring-gray-300 ring-inset" : ""
                      }`}
                      style={heatmapCellStyle(
                        periodStats.avgReturn,
                        maxAbs,
                        isLowSample
                      )}
                      title={
                        isLowSample
                          ? `サンプル数が少ない温度帯（${l.occurrences}日）のため参考値`
                          : undefined
                      }
                    >
                      <div
                        className={`text-sm font-medium ${
                          periodStats.avgReturn >= 0
                            ? "text-red-600"
                            : "text-green-700"
                        }`}
                      >
                        {formatReturn(periodStats.avgReturn)}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        勝率{periodStats.winRate.toFixed(0)}% / n=
                        {periodStats.sampleSize}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>
          データ期間: {heatmap.dataRange.from} 〜 {heatmap.dataRange.to} | 生成日:{" "}
          {heatmap.generatedAt}
        </p>
        <p>
          ※ 東証 TOPIX-17 シリーズ連動 ETF（NEXT FUNDS 1617.T 〜 1633.T）の日次終値を業種 proxy として使用。東証 33 業種ベースではありません
        </p>
        <p>
          ※ サンプル数 {LOW_SAMPLE_THRESHOLD} 未満の温度帯は薄色表示（参考値）。将来のリターンを保証するものではありません
        </p>
      </div>
    </div>
  );
}
