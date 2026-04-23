import distributionData from "@/data/score-distribution.json";

export type DistributionMarket = "us" | "jp";

export interface PercentileResult {
  /** 0-100。「このスコア以下だった日の割合」 */
  percentile: number;
  /** 該当スコア以下だった日数 */
  rank: number;
  /** 全日数 */
  total: number;
  /** データ範囲 */
  dataRange: { from: string; to: string };
}

interface DistributionBlock {
  count: number;
  dataRange: { from: string; to: string };
  scores: number[];
}

interface DistributionFile {
  generatedAt: string;
  dataRange: { from: string; to: string };
  us: DistributionBlock;
  jp: DistributionBlock;
}

const raw = distributionData as unknown as DistributionFile;

/**
 * 昇順ソート済み配列に対して "value 以下の要素数" を二分探索で求める。
 * Array.prototype.findIndex の線形走査より遥かに速い（O(log n)）。
 *
 * @internal テスト公開用にエクスポート
 */
export function countLessOrEqual(
  sortedAsc: readonly number[],
  value: number
): number {
  // upper bound: value より大きい最初のインデックス = value 以下の要素数
  let lo = 0;
  let hi = sortedAsc.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sortedAsc[mid] <= value) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/**
 * 指定スコアが過去10年中の何パーセンタイルに位置するかを返す。
 *
 * - percentile: そのスコア以下だった日の割合（0-100）。
 *   例: percentile=10 なら「過去10年中、下位10%」 = 歴史的にも低水準
 * - rank: そのスコア以下だった具体的な日数
 */
export function getScorePercentile(
  score: number,
  market: DistributionMarket
): PercentileResult | null {
  const block = raw[market];
  if (!block || !block.scores || block.scores.length === 0) {
    return null;
  }
  const rank = countLessOrEqual(block.scores, score);
  const percentile = (rank / block.count) * 100;
  return {
    percentile,
    rank,
    total: block.count,
    dataRange: block.dataRange,
  };
}

/** データ範囲のメタ情報取得 */
export function getDistributionMeta() {
  return {
    generatedAt: raw.generatedAt,
    dataRange: raw.dataRange,
    us: { count: raw.us.count, dataRange: raw.us.dataRange },
    jp: { count: raw.jp.count, dataRange: raw.jp.dataRange },
  };
}
