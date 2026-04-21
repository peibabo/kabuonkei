"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getSimpleHistory,
  getFullSnapshots,
  sliceByDays,
  type JapanTempPoint,
} from "@/lib/japan-temperature-history";
import TemperatureLegend from "./_trend/TemperatureLegend";
import TrendCardHeader from "./_trend/TrendCardHeader";
import { formatXAxisDate } from "./_trend/formatXAxisDate";
import { JP_TREND_PERIODS, type JpTrendPeriod } from "./_trend/periods";
import { renderTemperatureBands } from "./_trend/renderTemperatureBands";
import {
  TREND_X_AXIS_BASE_PROPS,
  TREND_Y_AXIS_PROPS,
} from "./_trend/axisProps";

interface MergedRow {
  date: string;
  simpleScore: number | null;
  fullScore: number | null;
  simple?: JapanTempPoint;
  full?: JapanTempPoint;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: MergedRow }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm min-w-[180px]">
      <p className="text-gray-500 text-xs mb-1">{label ?? row.date}</p>
      {row.full != null && (
        <div className="mb-1">
          <p className="font-bold text-xs" style={{ color: getSentimentColor(row.full.score) }}>
            本体5要素: {row.full.score}（{row.full.level}）
          </p>
          <p className="text-[10px] text-gray-500">
            N225:{row.full.components?.nikkeiMa} / 海外:{row.full.components?.foreignFlow}
            / 信用:{row.full.components?.marginRatio} / 裁定:{row.full.components?.arbitrage}
            / 為替:{row.full.components?.usdJpyMomentum}
          </p>
        </div>
      )}
      {row.simple != null && (
        <div>
          <p
            className="font-medium text-xs"
            style={{ color: getSentimentColor(row.simple.score) }}
          >
            簡易版: {row.simple.score}（{getSentimentLevel(row.simple.score)}）
          </p>
          <p className="text-[10px] text-gray-500">
            C1:{row.simple.c1}
            {row.simple.c5 != null ? ` / C5:${row.simple.c5}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

interface Props {
  currentScore: number;
}

export default function JapanTemperatureTrendCard({ currentScore }: Props) {
  const [period, setPeriod] = useState<JpTrendPeriod>("3M");
  const lineColor = getSentimentColor(currentScore);

  const allSimple = useMemo(() => getSimpleHistory(), []);
  const allFull = useMemo(() => getFullSnapshots(), []);

  const displayData = useMemo<MergedRow[]>(() => {
    const days = JP_TREND_PERIODS.days[period];
    const simpleSlice = sliceByDays(allSimple, days);
    const fullSlice = sliceByDays(allFull, days);

    const byDate = new Map<string, MergedRow>();
    for (const s of simpleSlice) {
      byDate.set(s.date, {
        date: s.date,
        simpleScore: s.score,
        fullScore: null,
        simple: s,
      });
    }
    for (const f of fullSlice) {
      const existing = byDate.get(f.date);
      if (existing) {
        existing.fullScore = f.score;
        existing.full = f;
      } else {
        byDate.set(f.date, {
          date: f.date,
          simpleScore: null,
          fullScore: f.score,
          full: f,
        });
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [allSimple, allFull, period]);

  if (displayData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          🇯🇵 温度の推移（日本）
        </h2>
        <p className="text-sm text-gray-500">
          過去データがまだ生成されていません。
        </p>
      </div>
    );
  }

  const longPeriod = period === "5Y" || period === "10Y";
  const tickInterval = JP_TREND_PERIODS.tickIntervals[period];
  const hasFullSnapshots = displayData.some((d) => d.fullScore != null);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <TrendCardHeader
        title="🇯🇵 温度の推移（日本）"
        periods={JP_TREND_PERIODS.periods}
        labels={JP_TREND_PERIODS.labels}
        value={period}
        onChange={setPeriod}
      />

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={displayData}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
          <defs>
            <linearGradient id="japanTemperatureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {renderTemperatureBands()}

          <XAxis
            {...TREND_X_AXIS_BASE_PROPS}
            tickFormatter={(d) => formatXAxisDate(d, longPeriod)}
            interval={tickInterval}
          />
          <YAxis {...TREND_Y_AXIS_PROPS} />
          <Tooltip content={<CustomTooltip />} />

          {/* 簡易版: 温度色の実線 + グラデーション塗り（米国版と同じ描画） */}
          <Area
            type="monotone"
            dataKey="simpleScore"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#japanTemperatureGradient)"
            connectNulls
            isAnimationActive={false}
            name="simple"
          />
          {/* フル版: 温度色のやや太い実線（スナップショット蓄積後に上から重ねる） */}
          <Line
            type="monotone"
            dataKey="fullScore"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={{ r: 2, fill: lineColor }}
            connectNulls
            isAnimationActive={false}
            name="full"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <TemperatureLegend />

      {/* 系列の説明 */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
        <p>
          <strong>簡易版（2要素）</strong>：日経225×125日MA乖離 + USDJPY
          50日モメンタムの平均で過去10年分を描画。
        </p>
        <p>
          <strong className="ml-1">本体（5要素）</strong>
          ：上記2要素＋海外投資家フロー・信用倍率・裁定残の5要素平均を平日JST17:00に日次記録し、蓄積次第やや太い線で上書き表示
          {hasFullSnapshots ? "中" : "（まだ記録なし）"}。
        </p>
      </div>
    </div>
  );
}
