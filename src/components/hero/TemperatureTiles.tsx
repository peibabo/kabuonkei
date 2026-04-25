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
 * 補足 2 タイル: 平均 / 昨日比
 * 半円ゲージ (FearGreedGauge) が JP/US スコアの主役なので、
 * ここでは「日米合算の温度感」と「動き」だけを見せる。
 *
 * 平均 sparkline は JP / US の 7 日推移を index 単位で平均した系列。
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
  const avg = jp != null ? Math.round((jp + us) / 2) : null;
  const avgLevel = avg != null ? getSentimentLevel(avg) : null;
  const avgColor = avg != null ? getSentimentColor(avg) : undefined;

  // 平均の昨日比は「日米平均の昨日比」として算出（jp 取得不可なら US だけで）
  const avgDelta =
    jp != null && jpDelta != null ? (jpDelta + usDelta) / 2 : usDelta;

  // 平均 sparkline: JP と US の sparkline を index ごとに平均（長さは短い方に揃える）
  const avgSparkline = (() => {
    if (!jpSparkline || jpSparkline.length === 0) return usSparkline;
    if (!usSparkline || usSparkline.length === 0) return jpSparkline;
    const len = Math.min(jpSparkline.length, usSparkline.length);
    const jpTail = jpSparkline.slice(-len);
    const usTail = usSparkline.slice(-len);
    return jpTail.map((v, i) => (v + usTail[i]) / 2);
  })();

  return (
    <div className="grid grid-cols-2 gap-3 mb-10">
      <Tile
        label="日米平均"
        value={avg != null ? `${avg}°` : "—"}
        sub={avgLevel ?? "—"}
        color={avgColor}
        sparkline={avgSparkline}
        sparklineLabel="日米平均 直近"
      />
      <Tile
        label="昨日比（日米平均）"
        value={formatDelta(avgDelta)}
        sub={deltaSub(avgDelta)}
      />
    </div>
  );
}
