"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  TREND_X_AXIS_BASE_PROPS,
  TREND_Y_AXIS_PROPS,
} from "./_trend/axisProps";
import { renderTemperatureBands } from "./_trend/renderTemperatureBands";
import TemperatureLegend from "./_trend/TemperatureLegend";
import { formatXAxisDate } from "./_trend/formatXAxisDate";

interface Point {
  date: string;
  score: number;
}

interface Props {
  title: string;
  data: Point[];
  eventDate: string;
  lineColor: string;
  emptyMessage: string;
}

function EventTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Point }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-sm">
      <div className="text-gray-600">{p.date}</div>
      <div className="font-semibold">温度 {p.score}</div>
    </div>
  );
}

/** イベント日前後 ±90 日の温度推移を1枚で示すチャート */
export default function EventTrendChart({
  title,
  data,
  eventDate,
  lineColor,
  emptyMessage,
}: Props) {
  const tickInterval = data.length === 0 ? 0 : Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-12 text-center">
          {emptyMessage}
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
          >
            {renderTemperatureBands()}
            <XAxis
              {...TREND_X_AXIS_BASE_PROPS}
              tickFormatter={(d) => formatXAxisDate(d as string)}
              interval={tickInterval}
            />
            <YAxis {...TREND_Y_AXIS_PROPS} />
            <Tooltip content={<EventTooltip />} />
            <ReferenceLine
              x={eventDate}
              stroke="#111827"
              strokeWidth={1}
              strokeDasharray="4 3"
              label={{
                value: "イベント日",
                fontSize: 11,
                fill: "#374151",
                position: "top",
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
      <TemperatureLegend />
    </div>
  );
}
