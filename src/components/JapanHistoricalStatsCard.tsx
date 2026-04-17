"use client";

import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getJapanHistoricalStats,
  getJapanStatsForScore,
  type PeriodStats,
  type JapanSentimentLevelStats,
} from "@/lib/japan-historical-stats";

interface Props {
  currentScore: number;
}

function formatReturn(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

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
}: {
  stats: JapanSentimentLevelStats;
  score: number;
}) {
  const color = getSentimentColor(score);
  const threeMonth = stats.nikkei225["3m"];
  const winCount = Math.round(
    (threeMonth.winRate / 100) * threeMonth.sampleSize
  );

  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      <p className="text-sm text-gray-800 leading-relaxed">
        過去10年、日本版温度が「
        <span className="font-bold" style={{ color }}>
          {stats.level}
        </span>
        」だった
        <span className="font-bold">{stats.occurrences}日間</span>
        のうち、3ヶ月後に日経平均が上昇したのは
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

export default function JapanHistoricalStatsCard({ currentScore }: Props) {
  const historicalStats = getJapanHistoricalStats();
  const currentStats = getJapanStatsForScore(currentScore);
  const currentLevel = getSentimentLevel(currentScore);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        🇯🇵 過去の統計（日本版温度）
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        日本版温度が同じだったとき、日経平均はどう動いた？
      </p>

      {currentStats && (
        <HighlightMessage stats={currentStats} score={currentScore} />
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
                  <ReturnCell stats={levelStats.nikkei225["1m"]} />
                  <ReturnCell stats={levelStats.nikkei225["3m"]} />
                  <ReturnCell stats={levelStats.nikkei225["6m"]} />
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
        <p>※ {historicalStats.note}</p>
      </div>
    </div>
  );
}
