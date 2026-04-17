"use client";

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { getSentimentLevel, getSentimentColor } from "@/lib/types";
import {
  getSimpleHistory,
  getFullSnapshots,
  sliceByDays,
  type JapanTempPoint,
} from "@/lib/japan-temperature-history";

type Period = "1M" | "3M" | "6M" | "1Y" | "5Y" | "10Y";

const PERIOD_DAYS: Record<Period, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
  "5Y": 1826,
  "10Y": 3652,
};

const PERIOD_LABELS: Record<Period, string> = {
  "1M": "1ヶ月",
  "3M": "3ヶ月",
  "6M": "6ヶ月",
  "1Y": "1年",
  "5Y": "5年",
  "10Y": "10年",
};

const TEMPERATURE_BANDS = [
  { y1: 0, y2: 20, color: "#2563eb" },
  { y1: 20, y2: 40, color: "#0ea5e9" },
  { y1: 40, y2: 60, color: "#ca8a04" },
  { y1: 60, y2: 80, color: "#ea580c" },
  { y1: 80, y2: 100, color: "#dc2626" },
];

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

function formatXAxisDate(dateStr: string, longPeriod: boolean): string {
  const [year, month, day] = dateStr.split("-");
  if (longPeriod) return `${year}/${Number(month)}`;
  return `${Number(month)}/${Number(day)}`;
}

interface Props {
  currentScore: number;
}

export default function JapanTemperatureTrendCard({ currentScore }: Props) {
  const [period, setPeriod] = useState<Period>("1Y");
  const lineColor = getSentimentColor(currentScore);

  const allSimple = useMemo(() => getSimpleHistory(), []);
  const allFull = useMemo(() => getFullSnapshots(), []);

  const displayData = useMemo<MergedRow[]>(() => {
    const days = PERIOD_DAYS[period];
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
          温度の推移（日本）
        </h2>
        <p className="text-sm text-gray-500">
          過去データがまだ生成されていません。
        </p>
      </div>
    );
  }

  const longPeriod = period === "5Y" || period === "10Y";
  const tickInterval = {
    "1M": 6,
    "3M": 14,
    "6M": 30,
    "1Y": 60,
    "5Y": 240,
    "10Y": 500,
  }[period];

  const hasFullSnapshots = displayData.some((d) => d.fullScore != null);

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-lg font-bold text-gray-700">温度の推移（日本）</h2>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(PERIOD_DAYS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                period === p
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart
          data={displayData}
          margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
        >
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
            tickFormatter={(d) => formatXAxisDate(d, longPeriod)}
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

          {/* 簡易版: 淡い破線 */}
          <Line
            type="monotone"
            dataKey="simpleScore"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
            isAnimationActive={false}
            name="simple"
          />
          {/* フル版: 濃い実線（現在スコアの温度色） */}
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

      {/* 凡例: 温度帯 */}
      <div className="flex justify-center gap-3 mt-3 text-xs text-gray-500">
        {[
          { label: "極寒", color: "#2563eb" },
          { label: "冷え込み", color: "#0ea5e9" },
          { label: "平温", color: "#ca8a04" },
          { label: "過熱", color: "#ea580c" },
          { label: "沸騰", color: "#dc2626" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* 系列の説明 */}
      <div className="mt-3 pt-3 border-t border-gray-100 text-[11px] text-gray-500 leading-relaxed">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-block w-6 h-px"
            style={{
              background:
                "repeating-linear-gradient(to right, #94a3b8 0 4px, transparent 4px 7px)",
            }}
          />
          <span>
            <strong>簡易版（2要素）</strong>：日経225×125日MA乖離 + USDJPY
            50日モメンタムの平均。過去10年まで遡れる。
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-6 h-[2px]"
            style={{ backgroundColor: lineColor }}
          />
          <span>
            <strong>本体（5要素）</strong>：上記2要素＋海外投資家フロー・信用倍率・裁定残の5要素平均。
            {hasFullSnapshots
              ? "平日JST17:00に日次で記録中。"
              : "まだ記録が蓄積されていません（平日JST17:00から記録開始）。"}
          </span>
        </div>
      </div>
    </div>
  );
}
