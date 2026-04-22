"use client";

import { useState } from "react";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  CROSS_DIRECTION_META,
  getCrossHistoricalStats,
  getCrossStatsForScore,
  type CrossDirection,
} from "@/lib/cross-historical-stats";
import type {
  PeriodStats,
  SentimentLevelStats,
} from "@/lib/historical-stats";
import { formatReturn } from "@/lib/format";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";

interface Props {
  japanScore: number | null;
  usScore: number;
}

const DIRECTION_KEYS: readonly CrossDirection[] = [
  "usTempJpIdx",
  "jpTempUsIdx",
];
const DIRECTION_LABELS: Record<CrossDirection, string> = {
  usTempJpIdx: CROSS_DIRECTION_META.usTempJpIdx.label,
  jpTempUsIdx: CROSS_DIRECTION_META.jpTempUsIdx.label,
};

function ReturnCell({ stats }: { stats: PeriodStats }) {
  const isPositive = stats.avgReturn > 0;
  return (
    <td className="px-2 py-2 text-center text-sm">
      <span className={isPositive ? "text-red-500" : "text-green-500"}>
        {formatReturn(stats.avgReturn)}
      </span>
      <br />
      <span className="text-xs text-gray-400">
        勝率{stats.winRate.toFixed(0)}%
      </span>
    </td>
  );
}

function LevelIndicator({
  level,
  color,
  isCurrent,
}: {
  level: string;
  color: string;
  isCurrent: boolean;
}) {
  return (
    <td className="px-2 py-2">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          className={`text-sm ${isCurrent ? "font-bold" : "text-gray-700"}`}
        >
          {level}
          {isCurrent && (
            <span className="ml-1 text-xs text-gray-400">◀ 現在</span>
          )}
        </span>
      </div>
    </td>
  );
}

function HighlightMessage({
  stats,
  score,
  direction,
}: {
  stats: SentimentLevelStats;
  score: number;
  direction: CrossDirection;
}) {
  const color = getSentimentColor(score);
  const threeMonth = stats.stats["3m"];
  const winCount = Math.round(
    (threeMonth.winRate / 100) * threeMonth.sampleSize
  );
  const meta = CROSS_DIRECTION_META[direction];

  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      <p className="text-sm text-gray-800 leading-relaxed">
        過去10年、{meta.temperatureLabel}が「
        <span className="font-bold" style={{ color }}>
          {stats.level}
        </span>
        」だった
        <span className="font-bold">{stats.occurrences}日間</span>
        のうち、3ヶ月後に{meta.indexPhrase}したのは
        <span className="font-bold">
          {winCount}回（{threeMonth.winRate.toFixed(0)}%）
        </span>
        、平均リターンは
        <span className="font-bold" style={{ color }}>
          {formatReturn(threeMonth.avgReturn)}
        </span>
      </p>
    </div>
  );
}

export default function CrossStatsCard({ japanScore, usScore }: Props) {
  const [direction, setDirection] = useState<CrossDirection>("usTempJpIdx");
  const meta = CROSS_DIRECTION_META[direction];

  const tempScore = direction === "usTempJpIdx" ? usScore : japanScore;

  const historicalStats = getCrossHistoricalStats(direction);
  const currentStats =
    tempScore != null ? getCrossStatsForScore(tempScore, direction) : undefined;
  const currentLevel = tempScore != null ? getSentimentLevel(tempScore) : null;
  const footerNote = historicalStats.note;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">
          🔀 クロス分析（参考値）
        </h2>
        <PeriodSwitcher<CrossDirection>
          periods={DIRECTION_KEYS}
          labels={DIRECTION_LABELS}
          value={direction}
          onChange={setDirection}
        />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {meta.temperatureLabel}が同じだったとき、{meta.indexLabel}はどう動いた？
      </p>

      <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 leading-relaxed">
        <span className="font-bold">※ 参考値</span> —
        温度と対象市場が異なるため、同一市場の統計（上のカード）より相関が弱い可能性があります。投資判断の主軸は同市場の統計をご参照ください。
      </div>

      {currentStats && tempScore != null && (
        <HighlightMessage
          stats={currentStats}
          score={tempScore}
          direction={direction}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium">
                温度
              </th>
              <th className="px-2 py-2 text-center text-xs text-gray-500 font-medium">
                日数
              </th>
              <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                1ヶ月
              </th>
              <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                3ヶ月
              </th>
              <th className="px-2 py-2 text-center text-xs text-gray-400 font-medium">
                6ヶ月
              </th>
            </tr>
          </thead>
          <tbody>
            {historicalStats.levels.map((levelStats) => {
              const isCurrent = levelStats.level === currentLevel;
              const midScore =
                (levelStats.scoreRange[0] + levelStats.scoreRange[1]) / 2;
              const color = getSentimentColor(midScore);
              return (
                <tr
                  key={levelStats.level}
                  className={`border-b border-gray-50 ${isCurrent ? "bg-gray-50" : ""}`}
                >
                  <LevelIndicator
                    level={levelStats.level}
                    color={color}
                    isCurrent={isCurrent}
                  />
                  <td className="px-2 py-2 text-center text-sm text-gray-500">
                    {levelStats.occurrences}日
                  </td>
                  <ReturnCell stats={levelStats.stats["1m"]} />
                  <ReturnCell stats={levelStats.stats["3m"]} />
                  <ReturnCell stats={levelStats.stats["6m"]} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-400 space-y-1">
        <p>
          データ期間: {historicalStats.dataRange.from} 〜{" "}
          {historicalStats.dataRange.to} | 生成日:{" "}
          {historicalStats.generatedAt}
        </p>
        {footerNote && <p>※ {footerNote}</p>}
      </div>
    </div>
  );
}
