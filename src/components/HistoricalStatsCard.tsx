"use client";

import { useState } from "react";
import { getSentimentLevel, getSentimentColor } from "@/lib/types";
import {
  getHistoricalStats,
  getStatsForScore,
  type PeriodStats,
  type SentimentLevelStats,
} from "@/lib/historical-stats";

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
  stats: SentimentLevelStats;
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
        過去10年で「
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

type IndexTab = "nikkei225" | "sp500";

export default function HistoricalStatsCard({ currentScore }: Props) {
  const [activeTab, setActiveTab] = useState<IndexTab>("nikkei225");
  const historicalStats = getHistoricalStats();
  const currentStats = getStatsForScore(currentScore);
  const currentLevel = getSentimentLevel(currentScore);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">
        📊 過去の統計
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        過去10年、同じ温度のとき何が起きた？
      </p>

      {currentStats && (
        <HighlightMessage stats={currentStats} score={currentScore} />
      )}

      {/* モバイル用タブ切り替え */}
      <div className="flex gap-2 mb-4 md:hidden">
        <button
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
            activeTab === "nikkei225"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
          onClick={() => setActiveTab("nikkei225")}
        >
          日経225
        </button>
        <button
          className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
            activeTab === "sp500"
              ? "bg-gray-900 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
          onClick={() => setActiveTab("sp500")}
        >
          S&P 500
        </button>
      </div>

      {/* デスクトップ: 全カラム表示 */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-2 text-left text-xs text-gray-500 font-medium">
                温度
              </th>
              <th className="px-2 py-2 text-center text-xs text-gray-500 font-medium">
                日数
              </th>
              <th
                className="px-2 py-2 text-center text-xs text-gray-400 font-medium"
                colSpan={3}
              >
                日経225（平均リターン）
              </th>
              <th
                className="px-2 py-2 text-center text-xs text-gray-400 font-medium"
                colSpan={3}
              >
                S&P 500（平均リターン）
              </th>
            </tr>
            <tr className="border-b border-gray-100">
              <th colSpan={2} />
              <th className="px-2 py-1 text-center text-xs text-gray-400">
                1ヶ月
              </th>
              <th className="px-2 py-1 text-center text-xs text-gray-400">
                3ヶ月
              </th>
              <th className="px-2 py-1 text-center text-xs text-gray-400">
                6ヶ月
              </th>
              <th className="px-2 py-1 text-center text-xs text-gray-400">
                1ヶ月
              </th>
              <th className="px-2 py-1 text-center text-xs text-gray-400">
                3ヶ月
              </th>
              <th className="px-2 py-1 text-center text-xs text-gray-400">
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
                  <ReturnCell stats={levelStats.sp500["1m"]} />
                  <ReturnCell stats={levelStats.sp500["3m"]} />
                  <ReturnCell stats={levelStats.sp500["6m"]} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* モバイル: タブで切り替え */}
      <div className="md:hidden overflow-x-auto">
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
              const indexData =
                activeTab === "nikkei225"
                  ? levelStats.nikkei225
                  : levelStats.sp500;
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
                  <ReturnCell stats={indexData["1m"]} />
                  <ReturnCell stats={indexData["3m"]} />
                  <ReturnCell stats={indexData["6m"]} />
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
        <p>
          ※ VIXベースの温度推定による過去統計です。将来のリターンを保証するものではありません。
        </p>
      </div>
    </div>
  );
}
