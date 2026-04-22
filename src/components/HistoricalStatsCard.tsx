"use client";

import { useState } from "react";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getHistoricalStats,
  getStatsForScore,
  hasJpIndex,
  type JpIndexKey,
  type Market,
  type PeriodStats,
  type SentimentLevelStats,
} from "@/lib/historical-stats";
import { formatReturn } from "@/lib/format";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";

interface Props {
  currentScore: number;
  market: Market;
}

const JP_INDEX_LABELS: Record<JpIndexKey, string> = {
  nikkei225: "日経平均",
  topix: "TOPIX",
};

const JP_INDEX_KEYS: readonly JpIndexKey[] = ["nikkei225", "topix"];

const COPY: Record<
  Market,
  { heading: string; defaultFooter: string }
> = {
  us: {
    heading: "🇺🇸 過去の統計（米国版温度）",
    defaultFooter:
      "VIXベースの温度推定による S&P500 の過去統計です。将来のリターンを保証するものではありません。",
  },
  jp: {
    heading: "🇯🇵 過去の統計（日本版温度）",
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
  indexLabel,
}: {
  stats: SentimentLevelStats;
  score: number;
  market: Market;
  indexLabel: string;
}) {
  const color = getSentimentColor(score);
  const threeMonth = stats.stats["3m"];
  const winCount = Math.round(
    (threeMonth.winRate / 100) * threeMonth.sampleSize
  );
  const temperatureLabel = market === "us" ? "米国版温度" : "日本版温度";
  const indexPhrase = `${indexLabel}が上昇`;

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
  const [jpIndex, setJpIndex] = useState<JpIndexKey>("nikkei225");
  const showJpIndexSwitcher = market === "jp" && hasJpIndex("topix");
  const effectiveIndex: JpIndexKey = market === "jp" ? jpIndex : "nikkei225";

  const historicalStats =
    market === "us"
      ? getHistoricalStats("us")
      : getHistoricalStats("jp", effectiveIndex);
  const currentStats =
    market === "us"
      ? getStatsForScore(currentScore, "us")
      : getStatsForScore(currentScore, "jp", effectiveIndex);
  const currentLevel = getSentimentLevel(currentScore);
  const copy = COPY[market];
  const footerNote = historicalStats.note ?? copy.defaultFooter;
  const indexLabel =
    market === "us" ? "S&P500" : JP_INDEX_LABELS[effectiveIndex];
  const subtitle =
    market === "us"
      ? "米国版温度が同じだったとき、S&P500 はどう動いた？"
      : `日本版温度が同じだったとき、${indexLabel}はどう動いた？`;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">{copy.heading}</h2>
        {showJpIndexSwitcher && (
          <PeriodSwitcher<JpIndexKey>
            periods={JP_INDEX_KEYS}
            labels={JP_INDEX_LABELS}
            value={jpIndex}
            onChange={setJpIndex}
          />
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">{subtitle}</p>

      {currentStats && (
        <HighlightMessage
          stats={currentStats}
          score={currentScore}
          market={market}
          indexLabel={indexLabel}
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
