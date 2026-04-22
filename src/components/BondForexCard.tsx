"use client";

import MiniChart from "./MiniChart";
import type { BondYieldData, ForexData } from "@/lib/types";
import { formatJstDateTimeLabel } from "@/lib/jst-date";

interface Props {
  bonds: BondYieldData;
  forex: ForexData;
}

export default function BondForexCard({ bonds, forex }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">金利・為替</h2>

      {/* 米国10年債 */}
      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-gray-600">
            {bonds.name}
          </span>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">
              {bonds.yield.toFixed(3)}%
            </span>
            <span
              className={`ml-2 text-sm font-medium ${
                bonds.change >= 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {bonds.change >= 0 ? "+" : ""}
              {bonds.change.toFixed(3)}
            </span>
          </div>
        </div>
        <div className="flex justify-end mb-2">
          <span className="text-xs text-gray-400">
            {formatJstDateTimeLabel(bonds.marketTime)}
          </span>
        </div>
        <MiniChart data={bonds.chart} color="#6366f1" />
      </div>

      {/* ドル円 */}
      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-gray-600">
            {forex.name}（{forex.pair}）
          </span>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">
              {forex.rate.toFixed(2)}
            </span>
            <span
              className={`ml-2 text-sm font-medium ${
                forex.changePercent >= 0 ? "text-red-500" : "text-green-500"
              }`}
            >
              {forex.changePercent >= 0 ? "+" : ""}
              {forex.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex justify-end">
          <span className="text-xs text-gray-400">
            {formatJstDateTimeLabel(forex.marketTime)}
          </span>
        </div>
      </div>
    </div>
  );
}
