import { formatSignedDelta } from "@/lib/format";
import { getSentimentColor } from "@/lib/sentiment";
import Sparkline from "./Sparkline";

interface WeekTileProps {
  label: string;
  /** 約 1 週間前 → 今 の温度（古い→新しい順）。2 点未満なら「—」表示 */
  series: number[];
}

/** 週の変化幅を言葉にする（1 日の変化より幅が大きいので閾値も広め） */
export function weekChangeLabel(delta: number): string {
  if (delta >= 10) return "↑ 大きく上昇";
  if (delta >= 3) return "↗ 上昇";
  if (delta <= -10) return "↓ 大きく下降";
  if (delta <= -3) return "↘ 下降";
  return "→ ほぼ横ばい";
}

/**
 * 確定済みの過去点（5 営業日前〜前営業日）の末尾に今の値を足して、
 * 「約 1 週間前 → 今」の系列にする。日米とも同じ形（`market-data.ts` で作成）。
 */
export function buildWeekSeries(
  history: number[] | undefined,
  current: number | null,
): number[] {
  if (current == null) return [];
  if (!history || history.length === 0) return [];
  return [...history, current];
}

function WeekTile({ label, series }: WeekTileProps) {
  if (series.length < 2) {
    return (
      <div className="bg-white border border-gray-300 px-4 py-4 md:px-5 md:py-5 flex flex-col">
        <p className="text-xs text-gray-500 tracking-wider">{label}</p>
        <p className="mt-1 text-3xl md:text-4xl font-bold leading-none">—</p>
      </div>
    );
  }
  const from = series[0];
  const to = series[series.length - 1];
  const delta = to - from;
  const color = getSentimentColor(to);

  return (
    <div className="bg-white border border-gray-300 px-4 py-4 md:px-5 md:py-5 flex flex-col">
      <p className="text-xs text-gray-500 tracking-wider">{label}</p>
      <p className="mt-1 text-3xl md:text-4xl font-bold tabular-nums leading-none text-gray-900">
        {formatSignedDelta(delta)}
      </p>
      <p className="mt-1 text-xs md:text-sm text-gray-700 tabular-nums">
        {Math.round(from)}° → <span style={{ color }}>{Math.round(to)}°</span>
        <span className="ml-2">{weekChangeLabel(delta)}</span>
      </p>
      <div className="mt-2">
        <Sparkline
          values={series}
          color={color}
          ariaLabel={`${label}の温度推移`}
          className="w-full h-5 md:h-6"
        />
      </div>
    </div>
  );
}

/**
 * 補足 2 タイル: 日本・米国それぞれの「この 1 週間」の温度変化。
 * 日米は温度の定義が違うため平均はとらず、別々に見せる。
 */
export default function TemperatureTiles({
  jp,
  us,
  jpSparkline,
  usSparkline,
}: {
  jp: number | null;
  us: number;
  jpSparkline?: number[];
  usSparkline?: number[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-10">
      <WeekTile
        label="🇯🇵 日本 この1週間"
        series={buildWeekSeries(jpSparkline, jp)}
      />
      <WeekTile
        label="🇺🇸 米国 この1週間"
        series={buildWeekSeries(usSparkline, us)}
      />
    </div>
  );
}
