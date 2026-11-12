import { TEMPERATURE_BANDS } from "@/components/_trend/constants";
import type { TemperaturePoint } from "@/lib/stock-temperature/score";

interface Props {
  history: TemperaturePoint[];
  /** スクリーンリーダー・画像代替用の説明 */
  label: string;
}

const W = 640;
const H = 220;
const PAD = { top: 8, right: 8, bottom: 22, left: 28 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

function y(score: number): number {
  return PAD.top + PLOT_H * (1 - score / 100);
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/**
 * 温度推移のサーバー描画 SVG（クライアント JS なし）。
 * 背景に温度帯の色帯、折れ線で温度、x 軸は始点・中間・終点の日付。
 */
export default function TemperatureChartSvg({ history, label }: Props) {
  if (history.length < 2) return null;
  const x = (i: number) => PAD.left + (PLOT_W * i) / (history.length - 1);
  const points = history.map(([, s], i) => `${x(i).toFixed(1)},${y(s).toFixed(1)}`).join(" ");
  const lastScore = history[history.length - 1][1];
  const tickIdx = [0, Math.floor((history.length - 1) / 2), history.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      className="w-full h-auto"
    >
      <title>{label}</title>
      {TEMPERATURE_BANDS.map((b) => (
        <rect
          key={b.y1}
          x={PAD.left}
          y={y(b.y2)}
          width={PLOT_W}
          height={y(b.y1) - y(b.y2)}
          fill={b.color}
          fillOpacity={0.08}
        />
      ))}
      {[0, 20, 40, 60, 80, 100].map((v) => (
        <g key={v}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke="#e5e7eb" strokeWidth={1} />
          <text x={PAD.left - 4} y={y(v) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
            {v}
          </text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke="#111827" strokeWidth={1.75} strokeLinejoin="round" />
      <circle cx={x(history.length - 1)} cy={y(lastScore)} r={3.5} fill="#111827" />
      {tickIdx.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={H - 6}
          fontSize={10}
          fill="#6b7280"
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
        >
          {shortDate(history[i][0])}
        </text>
      ))}
    </svg>
  );
}
