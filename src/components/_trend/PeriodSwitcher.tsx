"use client";

interface Props<P extends string> {
  periods: readonly P[];
  labels: Record<P, string>;
  value: P;
  onChange: (p: P) => void;
}

/** 期間切替ボタン群（米国版4種 / 日本版6種のどちらでも使える汎用UI） */
export default function PeriodSwitcher<P extends string>({
  periods,
  labels,
  value,
  onChange,
}: Props<P>) {
  return (
    <div className="flex flex-wrap gap-1">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            value === p
              ? "bg-gray-800 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {labels[p]}
        </button>
      ))}
    </div>
  );
}
