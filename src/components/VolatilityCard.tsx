"use client";

import MiniChart from "./MiniChart";
import type { VolatilityData } from "@/lib/types";

interface Props {
  data: VolatilityData[];
}

export default function VolatilityCard({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">ボラティリティ</h2>
      <div className="space-y-6">
        {data.map((item) => (
          <div key={item.symbol}>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-medium text-gray-600">
                {item.name}
              </span>
              <div className="text-right">
                <span className="text-xl font-bold text-gray-900">
                  {item.price.toFixed(2)}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    item.change >= 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {item.change >= 0 ? "+" : ""}
                  {item.change.toFixed(2)}
                </span>
              </div>
            </div>
            <MiniChart
              data={item.chart}
              color={item.change >= 0 ? "#ef4444" : "#22c55e"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
