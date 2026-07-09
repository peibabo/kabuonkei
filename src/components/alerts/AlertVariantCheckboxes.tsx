"use client";

import type { AlertVariant } from "@/lib/types";
import { COLD_THRESHOLD, HOT_THRESHOLD } from "@/lib/alerts/state-transition";

interface Props {
  value: AlertVariant[];
  onChange: (next: AlertVariant[]) => void;
  disabled?: boolean;
}

interface Row {
  id: AlertVariant;
  market: string;
  kind: string;
  hint: string;
}

const ROWS: Row[] = [
  { id: "jp_cold", market: "日本", kind: `極寒 (≤${COLD_THRESHOLD})`, hint: "総悲観・逆張り妙味" },
  { id: "jp_hot", market: "日本", kind: `過熱 (≥${HOT_THRESHOLD})`, hint: "総楽観・警戒" },
  { id: "us_cold", market: "米国", kind: `極寒 (≤${COLD_THRESHOLD})`, hint: "VIX 跳ね・総悲観" },
  { id: "us_hot", market: "米国", kind: `過熱 (≥${HOT_THRESHOLD})`, hint: "S&P500 総楽観・警戒" },
];

export default function AlertVariantCheckboxes({
  value,
  onChange,
  disabled,
}: Props) {
  function toggle(id: AlertVariant) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold text-gray-900 mb-2">
        通知する温度（複数選択可）
      </legend>
      <div className="space-y-2">
        {ROWS.map((row) => {
          const checked = value.includes(row.id);
          return (
            <label
              key={row.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 text-blue-600 rounded"
                checked={checked}
                onChange={() => toggle(row.id)}
                disabled={disabled}
                aria-describedby={`${row.id}-hint`}
              />
              <span className="flex-1 text-sm">
                <span className="font-semibold text-gray-900">
                  {row.market} {row.kind}
                </span>
                <span
                  id={`${row.id}-hint`}
                  className="block text-xs text-gray-500 mt-0.5"
                >
                  {row.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
