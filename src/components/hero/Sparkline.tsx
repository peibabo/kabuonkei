/**
 * 軽量 SVG sparkline。Recharts 不使用（バンドル削減）。
 * 0-100 の温度スコアを縦軸に、配列順を横軸に展開する純粋プレゼンテーションコンポーネント。
 *
 * - 1 点以下 → null（描画しない）
 * - viewBox 100×30 で固定、親で width/height をコントロール
 */

interface SparklineProps {
  values: number[];
  /** 線の色。CSS color 文字列。 */
  color?: string;
  /** ariaLabel。スクリーンリーダー向け説明。 */
  ariaLabel?: string;
  /** クラス名。CSS で width / height を制御する。 */
  className?: string;
}

const VIEW_W = 100;
const VIEW_H = 30;
const SCORE_MIN = 0;
const SCORE_MAX = 100;

export default function Sparkline({
  values,
  color = "#374151",
  ariaLabel = "温度の直近推移",
  className = "w-full h-6",
}: SparklineProps) {
  if (values.length < 2) return null;

  const stepX = VIEW_W / (values.length - 1);
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      // 上下にわずかな余白を取り、極値で線が枠に張り付かないようにする
      const normalized = (v - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
      const y = VIEW_H - 2 - normalized * (VIEW_H - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
