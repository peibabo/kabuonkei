import {
  getScorePercentile,
  type DistributionMarket,
} from "@/lib/score-distribution";

interface Props {
  score: number;
  market: DistributionMarket;
}

/**
 * 過去10年中のスコア位置づけを示すバッジ。
 *
 * - 下位 20% 以下: 「❄️ 歴史的にも冷たい水準」
 * - 上位 20% 以上: 「🔥 歴史的にも熱い水準」
 * - それ以外: 通常（📊 過去10年中、下位 XX%）
 *
 * データ未生成時は null を返して非表示。
 */
export default function HistoricalPercentileBadge({ score, market }: Props) {
  const result = getScorePercentile(score, market);
  if (!result || result.total === 0) return null;

  const { percentile, rank, total } = result;
  // 表示は整数に丸める
  const percentileRounded = Math.round(percentile);
  const daysBelow = rank;
  const yearsCovered = Math.round(total / 250); // 営業日 ≒ 250 日/年

  // 上位何% は 100 - percentile で計算
  const upperPct = Math.round(100 - percentile);

  // 極端温度のバッジ
  if (percentile <= 20) {
    return (
      <div className="mt-3 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs leading-relaxed text-center">
        <p className="font-semibold text-blue-700">
          ❄️ 歴史的にも冷たい水準（下位 {percentileRounded}%）
        </p>
        <p className="text-gray-600 mt-0.5">
          過去約 {yearsCovered} 年（{total.toLocaleString()} 日）中、
          このスコア以下だったのは {daysBelow.toLocaleString()} 日
        </p>
      </div>
    );
  }

  if (percentile >= 80) {
    return (
      <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs leading-relaxed text-center">
        <p className="font-semibold text-red-700">
          🔥 歴史的にも熱い水準（上位 {upperPct}%）
        </p>
        <p className="text-gray-600 mt-0.5">
          過去約 {yearsCovered} 年（{total.toLocaleString()} 日）中、
          このスコア以上だったのは {(total - daysBelow).toLocaleString()} 日
        </p>
      </div>
    );
  }

  // 通常（下位 20〜80% 帯）
  return (
    <p className="mt-3 text-xs text-gray-500 text-center leading-relaxed">
      📊 過去約 {yearsCovered} 年中、このスコア以下だった日は{" "}
      <span className="font-semibold text-gray-700">
        {percentileRounded}%
      </span>
      （{total.toLocaleString()} 日中 {daysBelow.toLocaleString()} 日）
    </p>
  );
}
