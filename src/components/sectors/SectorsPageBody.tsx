"use client";

import { useState } from "react";
import {
  getJapanSectorHeatmap,
  getTopSectorsForScore,
  type SectorPeriodKey,
} from "@/lib/japan-sector-heatmap";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { useMarketData } from "@/components/dashboard/useMarketData";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import SectorHeatmapTable, {
  PERIODS,
  PERIOD_LABELS,
  LOW_SAMPLE_THRESHOLD,
} from "./SectorHeatmapTable";

const RANK_BADGES = ["🥇", "🥈", "🥉", "④", "⑤"];

/** 5温度帯それぞれの代表スコア（帯の中央値）。静的な帯別 TOP5 の列挙に使う */
const LEVEL_MID_SCORES: readonly number[] = [10, 30, 50, 70, 90];

/**
 * /sectors ページ本体。
 * 静的 JSON（17業種 × 5温度帯）はライブスコアなしで常に全描画し、
 * `useMarketData()` で日本版温度が取れたときだけ「現在帯」の
 * ハイライトと TOP5 コールアウトをプログレッシブに追加表示する。
 */
export default function SectorsPageBody() {
  const [period, setPeriod] = useState<SectorPeriodKey>("3m");
  const { data } = useMarketData();
  const heatmap = getJapanSectorHeatmap();

  const japanScore = data?.japanFearGreed?.score ?? null;
  const currentLevel = japanScore != null ? getSentimentLevel(japanScore) : null;
  const currentColor = japanScore != null ? getSentimentColor(japanScore) : null;
  const currentTop = japanScore != null
    ? getTopSectorsForScore(japanScore, period, 5)
    : [];

  return (
    <div className="not-prose space-y-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">
          🗾 17業種 × 5温度帯 ヒートマップ
        </h2>
        <PeriodSwitcher<SectorPeriodKey>
          periods={PERIODS}
          labels={PERIOD_LABELS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      {japanScore != null && currentLevel != null && currentColor != null && currentTop.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{
            borderLeft: `4px solid ${currentColor}`,
            backgroundColor: `${currentColor}10`,
          }}
        >
          <p className="text-xs text-gray-600 mb-2">
            現在の日本版温度は{" "}
            <span className="font-bold" style={{ color: currentColor }}>
              {Math.round(japanScore)}度（{currentLevel}）
            </span>
            。この帯で過去{PERIOD_LABELS[period]}後の平均リターンが高かった業種 TOP5
          </p>
          <div className="flex flex-wrap gap-2">
            {currentTop.map((r, i) => (
              <div
                key={r.sector.code}
                className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 text-sm shadow-sm border border-gray-200"
              >
                <span>{RANK_BADGES[i]}</span>
                <span className="font-medium text-gray-900">
                  {r.sector.name}
                </span>
                <span className={returnColorClass(r.stats.avgReturn)}>
                  {formatReturn(r.stats.avgReturn)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
        <SectorHeatmapTable period={period} currentLevel={currentLevel} />
      </div>

      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          🌡️ 温度帯別の強かった業種 TOP5（{PERIOD_LABELS[period]}後）
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LEVEL_MID_SCORES.map((midScore) => {
            const level = getSentimentLevel(midScore);
            const color = getSentimentColor(midScore);
            const rankings = getTopSectorsForScore(midScore, period, 5);
            if (rankings.length === 0) return null;
            const occurrences = rankings[0].levelStats.occurrences;
            const isLowSample = occurrences < LOW_SAMPLE_THRESHOLD;
            return (
              <div
                key={level}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <p className="text-sm font-bold mb-2 flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span style={{ color }}>{level}</span>
                  <span className="text-xs font-normal text-gray-400">
                    （該当 {occurrences} 日{isLowSample ? "・参考値" : ""}）
                  </span>
                </p>
                <ol className="space-y-1 list-none pl-0">
                  {rankings.map((r, i) => (
                    <li
                      key={r.sector.code}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="w-6 shrink-0">{RANK_BADGES[i]}</span>
                      <span className="flex-1 text-gray-800">
                        {r.sector.name}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${returnColorClass(r.stats.avgReturn)}`}
                      >
                        {formatReturn(r.stats.avgReturn)}
                      </span>
                      <span className="text-xs text-gray-400 tabular-nums">
                        勝率{r.stats.winRate.toFixed(0)}%
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-xs text-gray-400">
        データ期間: {heatmap.dataRange.from} 〜 {heatmap.dataRange.to} | 生成日:{" "}
        {heatmap.generatedAt}（毎月1日に自動更新）
      </p>
    </div>
  );
}
