import { getSentimentColor, getSentimentLevel } from "@/lib/sentiment";
import Sparkline from "./Sparkline";

interface TileSpec {
  label: string;
  value: string;
  sub: string;
  color?: string;
  sparkline?: number[];
  sparklineLabel?: string;
}

function Tile({ label, value, sub, color, sparkline, sparklineLabel }: TileSpec) {
  return (
    <div className="bg-white border border-gray-300 px-4 py-4 md:px-5 md:py-5 flex flex-col">
      <p className="text-xs text-gray-500 tracking-wider">{label}</p>
      <p
        className="mt-1 text-3xl md:text-4xl font-bold tabular-nums leading-none"
        style={{ color: color ?? "#111111" }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs md:text-sm text-gray-700">{sub}</p>
      {sparkline && sparkline.length >= 2 && (
        <div className="mt-2">
          <Sparkline
            values={sparkline}
            color={color ?? "#374151"}
            ariaLabel={sparklineLabel ?? "直近推移"}
            className="w-full h-5 md:h-6"
          />
        </div>
      )}
    </div>
  );
}

function formatDelta(delta: number | null): string {
  if (delta == null) return "—";
  if (delta === 0) return "±0.0";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}`;
}

function deltaSub(delta: number | null): string {
  if (delta == null) return "前回データなし";
  if (delta >= 5) return "↑ 上昇";
  if (delta <= -5) return "↓ 下降";
  if (delta > 0) return "↗ わずか上昇";
  if (delta < 0) return "↘ わずか下降";
  return "→ 横ばい";
}

/**
 * 4 タイル: JP / US / 平均 / 昨日比
 * Phase 1: 数字 + ラベル + サブテキスト
 * Phase 2 で各タイルに sparkline を追加予定
 */
export default function TemperatureTiles({
  jp,
  us,
  jpDelta,
  usDelta,
  jpSparkline,
  usSparkline,
}: {
  jp: number | null;
  us: number;
  jpDelta: number | null;
  usDelta: number;
  jpSparkline?: number[];
  usSparkline?: number[];
}) {
  const usLevel = getSentimentLevel(us);
  const jpLevel = jp != null ? getSentimentLevel(jp) : null;

  const avg = jp != null ? Math.round((jp + us) / 2) : null;
  const avgLevel = avg != null ? getSentimentLevel(avg) : null;

  // 平均の昨日比は「日米平均の昨日比」として算出（jp 取得不可なら US だけで）
  const avgDelta =
    jp != null && jpDelta != null ? (jpDelta + usDelta) / 2 : usDelta;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
      <Tile
        label="🇯🇵 日本"
        value={jp != null ? `${jp}°` : "—"}
        sub={jpLevel ?? "データ取得待ち"}
        color={jp != null ? getSentimentColor(jp) : undefined}
        sparkline={jpSparkline}
        sparklineLabel="日本の温度 直近 7 日"
      />
      <Tile
        label="🇺🇸 米国"
        value={`${us}°`}
        sub={usLevel}
        color={getSentimentColor(us)}
        sparkline={usSparkline}
        sparklineLabel="米国の温度 直近"
      />
      <Tile
        label="平均"
        value={avg != null ? `${avg}°` : "—"}
        sub={avgLevel ?? "—"}
        color={avg != null ? getSentimentColor(avg) : undefined}
      />
      <Tile
        label="日米平均 昨日比"
        value={formatDelta(avgDelta)}
        sub={deltaSub(avgDelta)}
      />
    </div>
  );
}
