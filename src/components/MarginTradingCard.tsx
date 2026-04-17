"use client";

import MiniChart from "./MiniChart";
import type { MarginTradingWeek, ChartPoint } from "@/lib/types";

interface Props {
  latest: MarginTradingWeek;
  ratioHistory: ChartPoint[];
}

export default function MarginTradingCard({ latest, ratioHistory }: Props) {
  // 前週比の計算
  const prevWeek =
    ratioHistory.length >= 2 ? ratioHistory[ratioHistory.length - 2] : null;
  const change = prevWeek ? latest.ratio - prevWeek.value : 0;
  const roundedChange = Math.round(change * 100) / 100;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-1">信用倍率</h2>
      <p className="text-xs text-gray-500 mb-1">
        買い残が多いほど上値が重くなる傾向
      </p>
      <p className="text-xs text-gray-400 mb-4">{latest.date} 現在</p>

      {/* 信用倍率メイン表示 */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">信用倍率</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {latest.ratio.toFixed(2)}
          </span>
          <span className="text-sm text-gray-500">倍</span>
          {roundedChange !== 0 && (
            <span
              className={`text-sm font-medium ${
                roundedChange >= 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {roundedChange >= 0 ? "+" : ""}
              {roundedChange.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* 買い残・売り残 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">信用買い残</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-700">
              {latest.buyBalance.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">億円</span>
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">信用売り残</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold text-gray-700">
              {latest.sellBalance.toLocaleString()}
            </span>
            <span className="text-xs text-gray-500">億円</span>
          </div>
        </div>
      </div>

      {/* 倍率推移チャート */}
      {ratioHistory.length > 1 && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">信用倍率 推移（倍）</p>
          <MiniChart data={ratioHistory} color="#f59e0b" height={60} />
        </div>
      )}
    </div>
  );
}
