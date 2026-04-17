"use client";

import MiniChart from "./MiniChart";
import type { ArbitrageBalanceDay, ChartPoint } from "@/lib/types";

interface Props {
  latest: ArbitrageBalanceDay;
  buyHistory: ChartPoint[];
}

export default function ArbitrageBalanceCard({ latest, buyHistory }: Props) {
  // 前日比の計算
  const prevDay =
    buyHistory.length >= 2 ? buyHistory[buyHistory.length - 2] : null;
  const change = prevDay ? latest.buyBalance - prevDay.value : 0;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-1">裁定残</h2>
      <p className="text-xs text-gray-500 mb-1">
        先物市場に溜まった将来の売り圧力
      </p>
      <p className="text-xs text-gray-400 mb-4">{latest.date} 現在</p>

      {/* 裁定買い残メイン表示 */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">裁定買い残</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-gray-900">
            {latest.buyBalance.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">百万株</span>
          {change !== 0 && (
            <span
              className={`text-sm font-medium ${
                change >= 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {change.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* 裁定売り残 */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">裁定売り残</p>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-gray-700">
            {latest.sellBalance.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500">百万株</span>
        </div>
      </div>

      {/* 買い残推移チャート */}
      {buyHistory.length > 1 && (
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">
            裁定買い残 推移（百万株）
          </p>
          <MiniChart data={buyHistory} color="#3b82f6" height={60} />
        </div>
      )}
    </div>
  );
}
