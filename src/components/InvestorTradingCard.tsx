"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import type { InvestorTradingWeek, ChartPoint } from "@/lib/types";
import MiniChart from "./MiniChart";

interface Props {
  latest: InvestorTradingWeek;
  foreignHistory: ChartPoint[];
}

export default function InvestorTradingCard({
  latest,
  foreignHistory,
}: Props) {
  const barData = latest.entities.map((e) => ({
    name: e.name,
    value: e.netAmount,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-1">
        🇯🇵 投資主体別売買動向
      </h2>
      <p className="text-xs text-gray-500 mb-1">
        誰が買って、誰が売っている？
      </p>
      <p className="text-xs text-gray-400 mb-4">
        {latest.weekLabel}（{latest.startDate} 〜 {latest.endDate}）
      </p>

      {/* 横棒チャート */}
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${Math.round(v).toLocaleString()}`}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 11, fill: "#4b5563" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [
              `${Number(value) >= 0 ? "+" : ""}${Number(value).toLocaleString()}億円`,
              "差引き",
            ]}
            contentStyle={{
              fontSize: "12px",
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          />
          <ReferenceLine x={0} stroke="#d1d5db" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {barData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.value >= 0 ? "#ef4444" : "#22c55e"}
                fillOpacity={entry.name === "海外投資家" ? 1 : 0.6}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 海外投資家の推移 */}
      {foreignHistory.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            海外投資家 週次推移（億円）
          </p>
          <MiniChart
            data={foreignHistory}
            color="#ef4444"
            height={50}
          />
        </div>
      )}
    </div>
  );
}
