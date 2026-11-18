"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getJapanHistory,
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

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: JapanTempPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm min-w-[160px]">
      <p className="text-gray-500 text-xs mb-1">{label ?? row.date}</p>
      <p className="font-bold text-xs" style={{ color: getSentimentColor(row.score) }}>
        市場温度: {row.score}（{getSentimentLevel(row.score)}）
      </p>
      {row.nikkei != null && (
        <p className="text-[11px] text-gray-500">
          日経225: {row.nikkei.toLocaleString("ja-JP")}
        </p>
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

  const allHistory = useMemo(() => getJapanHistory(), []);
  const displayData = useMemo(
    () => sliceByDays(allHistory, JP_TREND_PERIODS.days[period]),
    [allHistory, period],
  );

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
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.15} />
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

          <Area
            type="monotone"
            dataKey="score"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#japanTemperatureGradient)"
            isAnimationActive={false}
            name="score"
          />
        </ComposedChart>
      </ResponsiveContainer>

      <TemperatureLegend />

      <p className="mt-3 pt-3 border-t border-gray-100 text-[12px] text-gray-500 leading-relaxed">
        市場温度 = 日経225 の終値と、直前 125 営業日の移動平均との乖離（±15% を 0〜100）。過去 10 年分を同じ式で計算しています。
      </p>
    </div>
  );
}
