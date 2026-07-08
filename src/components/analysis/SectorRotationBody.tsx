"use client";

import { useEffect, useState } from "react";
import type { SectorPeriodKey } from "@/lib/japan-sector-heatmap";
import {
  getSectorRankingForLevel,
  computeLevelAverages,
  computeGroupAverage,
  DEFENSIVE_SECTOR_CODES,
  CYCLICAL_SECTOR_CODES,
  SENTIMENT_LEVELS,
} from "@/lib/sector-rotation";
import { getSentimentColor } from "@/lib/sentiment";
import { formatReturn, returnColorClass } from "@/lib/format";
import { trackEvent } from "@/lib/analytics";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import {
  PERIODS,
  PERIOD_LABELS,
} from "@/components/sectors/SectorHeatmapTable";

const LEVEL_MID_SCORES: Record<string, number> = {
  極寒: 10,
  冷え込み: 30,
  平温: 50,
  過熱: 70,
  沸騰: 90,
};

function levelColor(level: string): string {
  return getSentimentColor(LEVEL_MID_SCORES[level] ?? 50);
}

/** 極寒・沸騰の TOP5 / WORST3 対比カード */
function ExtremeBandCard({
  level,
  period,
}: {
  level: "極寒" | "沸騰";
  period: SectorPeriodKey;
}) {
  const rankings = getSectorRankingForLevel(level, period);
  const top5 = rankings.slice(0, 5);
  const worst3 = rankings.slice(-3).reverse();
  const color = levelColor(level);
  const occurrences = rankings[0]?.levelStats.occurrences ?? 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <p className="text-sm font-bold mb-3 flex items-center gap-1.5">
        <span
          className="inline-block w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span style={{ color }}>{level}</span>
        <span className="text-xs font-normal text-gray-400">
          （該当 {occurrences} 日 / {PERIOD_LABELS[period]}後）
        </span>
      </p>
      <p className="text-xs text-gray-500 mb-1">強かった TOP5</p>
      <ol className="space-y-1 list-none pl-0 mb-3">
        {top5.map((r, i) => (
          <li key={r.sector.code} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0 text-gray-400 tabular-nums">
              {i + 1}.
            </span>
            <span className="flex-1 text-gray-800">{r.sector.name}</span>
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
      <p className="text-xs text-gray-500 mb-1">弱かった WORST3</p>
      <ol className="space-y-1 list-none pl-0">
        {worst3.map((r) => (
          <li key={r.sector.code} className="flex items-center gap-2 text-sm">
            <span className="w-5 shrink-0" />
            <span className="flex-1 text-gray-600">{r.sector.name}</span>
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
}

/**
 * 分析記事「温度帯×業種」のインタラクティブ本体。
 * (1) 温度帯別の全業種平均（U字カーブ）
 * (2) 極寒 vs 沸騰の TOP5/WORST3 対比
 * (3) ディフェンシブ vs 景気敏感グループの温度帯別平均
 */
export default function SectorRotationBody() {
  const [period, setPeriod] = useState<SectorPeriodKey>("3m");

  useEffect(() => {
    trackEvent("analysis_view", { slug: "sector-rotation-temperature" });
  }, []);

  const levelAverages = computeLevelAverages(period);
  const maxAvg = Math.max(
    ...levelAverages.map((a) => Math.abs(a.avgAcrossSectors)),
    0.1
  );

  return (
    <div className="not-prose space-y-8">
      <div className="flex justify-end">
        <PeriodSwitcher<SectorPeriodKey>
          periods={PERIODS}
          labels={PERIOD_LABELS}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <section>
        <h3 className="text-base font-bold text-gray-900 mb-3">
          ① 温度帯別の全業種平均リターン（{PERIOD_LABELS[period]}後）
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[480px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-right font-semibold">該当日数</th>
                <th className="px-3 py-2 text-right font-semibold">
                  全業種平均
                </th>
                <th className="px-3 py-2 text-left font-semibold" aria-hidden="true" />
                <th className="px-3 py-2 text-right font-semibold">平均勝率</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              {levelAverages.map((a) => {
                const color = levelColor(a.level);
                const barWidth = Math.round(
                  (Math.abs(a.avgAcrossSectors) / maxAvg) * 100
                );
                return (
                  <tr key={a.level}>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {a.level}
                      </span>
                    </td>
                    <td className="text-right text-gray-500 tabular-nums">
                      {a.occurrences}日
                    </td>
                    <td
                      className={`text-right font-semibold tabular-nums ${returnColorClass(a.avgAcrossSectors)}`}
                    >
                      {formatReturn(a.avgAcrossSectors)}
                    </td>
                    <td className="w-32">
                      <span
                        className="block h-2 rounded"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor:
                            a.avgAcrossSectors >= 0 ? "#dc2626" : "#16a34a",
                          opacity: 0.5,
                        }}
                      />
                    </td>
                    <td className="text-right text-gray-500 tabular-nums">
                      {a.winRateAcrossSectors.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          ※ 各温度帯における 17 業種の平均リターンの単純平均（等ウェイト）
        </p>
      </section>

      <section>
        <h3 className="text-base font-bold text-gray-900 mb-3">
          ② 極寒 vs 沸騰 — 強い業種は入れ替わるか
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ExtremeBandCard level="極寒" period={period} />
          <ExtremeBandCard level="沸騰" period={period} />
        </div>
      </section>

      <section>
        <h3 className="text-base font-bold text-gray-900 mb-3">
          ③ ディフェンシブ vs 景気敏感（{PERIOD_LABELS[period]}後の平均）
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg min-w-[480px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">温度帯</th>
                <th className="px-3 py-2 text-right font-semibold">
                  🛡 ディフェンシブ
                  <span className="block text-[10px] font-normal text-gray-400">
                    食品・医薬品・電力ガス
                  </span>
                </th>
                <th className="px-3 py-2 text-right font-semibold">
                  ⚙️ 景気敏感
                  <span className="block text-[10px] font-normal text-gray-400">
                    鉄鋼非鉄・機械・電機精密
                  </span>
                </th>
                <th className="px-3 py-2 text-right font-semibold">差</th>
              </tr>
            </thead>
            <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-gray-100">
              {SENTIMENT_LEVELS.map((level) => {
                const defensive = computeGroupAverage(
                  DEFENSIVE_SECTOR_CODES,
                  level,
                  period
                );
                const cyclical = computeGroupAverage(
                  CYCLICAL_SECTOR_CODES,
                  level,
                  period
                );
                const gap = cyclical - defensive;
                return (
                  <tr key={level}>
                    <td>
                      <span className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2 h-2 rounded-full"
                          style={{ backgroundColor: levelColor(level) }}
                        />
                        {level}
                      </span>
                    </td>
                    <td
                      className={`text-right tabular-nums ${returnColorClass(defensive)}`}
                    >
                      {formatReturn(defensive)}
                    </td>
                    <td
                      className={`text-right tabular-nums ${returnColorClass(cyclical)}`}
                    >
                      {formatReturn(cyclical)}
                    </td>
                    <td className="text-right font-semibold tabular-nums text-gray-700">
                      {gap >= 0 ? "+" : ""}
                      {gap.toFixed(1)}pp
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          ※ 差 = 景気敏感 − ディフェンシブ。正なら景気敏感グループが優位だった温度帯
        </p>
      </section>
    </div>
  );
}
