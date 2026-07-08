"use client";

import {
  getJapanSectorHeatmap,
  type SectorPeriodKey,
} from "@/lib/japan-sector-heatmap";
import type { SentimentLevel } from "@/lib/types";
import { getSentimentColor } from "@/lib/sentiment";
import { formatReturn } from "@/lib/format";
import { heatmapCellStyle } from "@/lib/heatmap-colors";

export const PERIODS: readonly SectorPeriodKey[] = ["1m", "3m", "6m"];
export const PERIOD_LABELS: Record<SectorPeriodKey, string> = {
  "1m": "1ヶ月",
  "3m": "3ヶ月",
  "6m": "6ヶ月",
};

/** サンプル数がこの値未満の温度帯は薄色 + 注意表示にする */
export const LOW_SAMPLE_THRESHOLD = 30;

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

interface Props {
  period: SectorPeriodKey;
  /** 現在の温度帯。null なら列ハイライトなしで全テーブルを描画する */
  currentLevel: SentimentLevel | null;
}

/**
 * 17業種 × 5温度帯のフルヒートマップテーブル。
 * /sectors ページ本体で使用（トップのコンパクトカードはテーブルを持たない）。
 */
export default function SectorHeatmapTable({ period, currentLevel }: Props) {
  const heatmap = getJapanSectorHeatmap();
  if (heatmap.sectors.length === 0) return null;

  const maxAbs = computeMaxAbsReturn(heatmap.sectors, period);

  return (
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
  );
}
