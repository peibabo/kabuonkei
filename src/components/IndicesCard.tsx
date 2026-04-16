"use client";

import type { IndexData } from "@/lib/types";

interface Props {
  data: IndexData[];
}

export default function IndicesCard({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h2 className="text-lg font-bold text-gray-700 mb-4">主要指数</h2>
      <div className="space-y-3">
        {data.map((item) => (
          <div
            key={item.symbol}
            className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
          >
            <span className="text-sm font-medium text-gray-600">
              {item.name}
            </span>
            <div className="text-right">
              <span className="text-base font-bold text-gray-900">
                {item.price.toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span
                className={`ml-2 text-sm font-medium ${
                  item.changePercent >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {item.changePercent >= 0 ? "+" : ""}
                {item.changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
