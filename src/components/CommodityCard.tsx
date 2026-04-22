"use client";

import MiniChart from "./MiniChart";
import type { CommodityData } from "@/lib/types";
import { formatJstDateTimeLabel } from "@/lib/jst-date";

interface Props {
  data: CommodityData[];
}

function formatPrice(symbol: string, price: number): string {
  if (symbol === "BTC-USD") {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getUnit(symbol: string): string {
  if (symbol === "BTC-USD") return "USD";
  if (symbol === "GC=F") return "USD/oz";
  if (symbol === "CL=F") return "USD/bbl";
  return "";
}

function getChartColor(symbol: string, changePercent: number): string {
  if (symbol === "GC=F") return "#eab308"; // gold
  if (symbol === "BTC-USD") return "#f97316"; // orange
  return changePercent >= 0 ? "#ef4444" : "#22c55e";
}

export default function CommodityCard({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">
        コモディティ・暗号資産
      </h2>
      <div className="space-y-6">
        {data.map((item) => (
          <div key={item.symbol}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-medium text-gray-600">
                {item.name}
              </span>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(item.symbol, item.price)}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  {getUnit(item.symbol)}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    item.changePercent >= 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {item.changePercent >= 0 ? "+" : ""}
                  {item.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="flex justify-end mb-2">
              <span className="text-xs text-gray-400">
                {formatJstDateTimeLabel(item.marketTime)}
              </span>
            </div>
            <MiniChart
              data={item.chart}
              color={getChartColor(item.symbol, item.changePercent)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
