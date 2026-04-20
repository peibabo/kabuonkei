"use client";

import PeriodSwitcher from "./PeriodSwitcher";

interface Props<P extends string> {
  title: string;
  periods: readonly P[];
  labels: Record<P, string>;
  value: P;
  onChange: (p: P) => void;
}

/** 温度推移カード共通のタイトル + 期間切替ヘッダ（米国版/日本版で共用） */
export default function TrendCardHeader<P extends string>({
  title,
  periods,
  labels,
  value,
  onChange,
}: Props<P>) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
      <h2 className="text-lg font-bold text-gray-700">{title}</h2>
      <PeriodSwitcher
        periods={periods}
        labels={labels}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
