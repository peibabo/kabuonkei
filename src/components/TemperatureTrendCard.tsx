"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { ChartPoint } from "@/lib/types";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getStaticTemperatureHistory,
  mergeTemperatureData,
} from "@/lib/temperature-history";
import type { TemperaturePoint } from "@/lib/temperature-history";
import TemperatureLegend from "./_trend/TemperatureLegend";
import TrendCardHeader from "./_trend/TrendCardHeader";
import { formatXAxisDate } from "./_trend/formatXAxisDate";
import { US_TREND_PERIODS, type UsTrendPeriod } from "./_trend/periods";
import { renderTemperatureBands } from "./_trend/renderTemperatureBands";
import {
  TREND_X_AXIS_BASE_PROPS,
  TREND_Y_AXIS_PROPS,
} from "./_trend/axisProps";

interface Props {
  vixChart: ChartPoint[];
  currentScore: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: TemperaturePoint }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const level = getSentimentLevel(data.score);
  const color = getSentimentColor(data.score);

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs">{data.date}</p>
      <p className="font-bold" style={{ color }}>
        温度: {data.score}（{level}）
      </p>
      <p className="text-gray-600 text-xs">VIX: {data.vix}</p>
    </div>
  );
}

export default function TemperatureTrendCard({ vixChart, currentScore }: Props) {
  const [period, setPeriod] = useState<UsTrendPeriod>("3M");

  const mergedData = useMemo(() => {
    const staticData = getStaticTemperatureHistory();
    return mergeTemperatureData(staticData, vixChart);
  }, [vixChart]);

  const displayData = useMemo(() => {
    const days = US_TREND_PERIODS.days[period];
    return mergedData.slice(-days);
  }, [mergedData, period]);

  if (displayData.length === 0) return null;

  const lineColor = getSentimentColor(currentScore);
  const tickInterval = US_TREND_PERIODS.tickIntervals[period];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <TrendCardHeader
        title="🇺🇸 温度の推移（米国）"
        periods={US_TREND_PERIODS.periods}
        labels={US_TREND_PERIODS.labels}
        value={period}
        onChange={setPeriod}
      />

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {renderTemperatureBands()}

          <XAxis
            {...TREND_X_AXIS_BASE_PROPS}
            tickFormatter={(d) => formatXAxisDate(d)}
            interval={tickInterval}
          />
          <YAxis {...TREND_Y_AXIS_PROPS} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="score"
            stroke={lineColor}
            strokeWidth={2}
            fill="url(#temperatureGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      <TemperatureLegend />
    </div>
  );
}
