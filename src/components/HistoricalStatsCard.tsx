"use client";

import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getHistoricalStats,
  getStatsForScore,
  type Market,
  type PeriodStats,
  type SentimentLevelStats,
} from "@/lib/historical-stats";
import { formatReturn } from "@/lib/format";

interface Props {
  currentScore: number;
  market: Market;
}

const COPY: Record<
  Market,
  { heading: string; subtitle: string; indexLabel: string; defaultFooter: string }
> = {
  us: {
    heading: "🇺🇸 過去の統計（米国版温度）",
    subtitle: "米国版温度が同じだったとき、S&P500 はどう動いた？",
    indexLabel: "S&P500",
    defaultFooter:
      "VIXベースの温度推定による S&P500 の過去統計です。将来のリターンを保証するものではありません。",
  },
  jp: {
    heading: "🇯🇵 過去の統計（日本版温度）",
    subtitle: "日本版温度が同じだったとき、日経平均はどう動いた？",
    indexLabel: "日経平均",
    defaultFooter:
      "日本版温度の過去統計です。将来のリターンを保証するものではありません。",
  },
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
  market,
}: {
  stats: SentimentLevelStats;
  score: number;
  market: Market;
}) {
  const color = getSentimentColor(score);
  const threeMonth = stats.stats["3m"];
  const winCount = Math.round(
    (threeMonth.winRate / 100) * threeMonth.sampleSize
  );
  const temperatureLabel = market === "us" ? "米国版温度" : "日本版温度";
  const indexPhrase = market === "us" ? "S&P500が上昇" : "日経平均が上昇";

  return (
    <div
      className="rounded-lg p-4 mb-6"
      style={{
        borderLeft: `4px solid ${color}`,
        backgroundColor: `${color}10`,
      }}
    >
      <p className="text-sm text-gray-800 leading-relaxed">
        過去10年、{temperatureLabel}が「
        <span className="font-bold" style={{ color }}>
          {stats.level}
        </span>
        」だった
        <span className="font-bold">{stats.occurrences}日間</span>
        のうち、3ヶ月後に{indexPhrase}したのは
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

export default function HistoricalStatsCard({ currentScore, market }: Props) {
  const historicalStats = getHistoricalStats(market);
  const currentStats = getStatsForScore(currentScore, market);
  const currentLevel = getSentimentLevel(currentScore);
  const copy = COPY[market];
  const footerNote = historicalStats.note ?? copy.defaultFooter;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">{copy.heading}</h2>
      <p className="text-sm text-gray-500 mb-4">{copy.subtitle}</p>

      {currentStats && (
        <HighlightMessage
          stats={currentStats}
          score={currentScore}
          market={market}
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
        <p>※ {footerNote}</p>
      </div>
    </div>
  );
}
