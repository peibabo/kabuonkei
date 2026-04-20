"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import type { ChartPoint } from "@/lib/types";
import { getSentimentLevel, getSentimentColor } from "@/lib/sentiment";
import {
  getStaticTemperatureHistory,
  mergeTemperatureData,
} from "@/lib/temperature-history";
import type { TemperaturePoint } from "@/lib/temperature-history";
import { TEMPERATURE_BANDS } from "./_trend/constants";
import TemperatureLegend from "./_trend/TemperatureLegend";
import PeriodSwitcher from "./_trend/PeriodSwitcher";
import { formatXAxisDate } from "./_trend/formatXAxisDate";
import { US_TREND_PERIODS, type UsTrendPeriod } from "./_trend/periods";

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-700">🇺🇸 温度の推移（米国）</h2>
        <PeriodSwitcher
          periods={US_TREND_PERIODS.periods}
          labels={US_TREND_PERIODS.labels}
          value={period}
          onChange={setPeriod}
        />
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={displayData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="temperatureGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
              <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {TEMPERATURE_BANDS.map((band) => (
            <ReferenceArea
              key={band.y1}
              y1={band.y1}
              y2={band.y2}
              fill={band.color}
              fillOpacity={0.06}
              ifOverflow="extendDomain"
            />
          ))}

          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatXAxisDate(d)}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 20, 40, 60, 80, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
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
