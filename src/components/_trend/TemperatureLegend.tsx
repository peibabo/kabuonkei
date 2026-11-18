"use client";

import { TEMPERATURE_LEGEND_ITEMS } from "./constants";

export default function TemperatureLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-500">
      <span className="text-gray-400">背景の色:</span>
      {TEMPERATURE_LEGEND_ITEMS.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
