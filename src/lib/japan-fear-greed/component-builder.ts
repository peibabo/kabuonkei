import type {
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
} from "../types";

/** 算出可能な component を生成する薄いヘルパー。rawValue と note は呼び出し側が用意する */
export function buildAvailableComponent(args: {
  id: JapanFearGreedComponentId;
  label: string;
  score: number;
  rawValue: number | null;
  note?: string;
}): JapanFearGreedComponent {
  return {
    id: args.id,
    label: args.label,
    score: args.score,
    rawValue: args.rawValue,
    available: true,
    ...(args.note ? { note: args.note } : {}),
  };
}

/** 算出不能な component を生成する薄いヘルパー。score=50・rawValue=null・available=false を固定 */
export function buildUnavailableComponent(
  id: JapanFearGreedComponentId,
  label: string,
): JapanFearGreedComponent {
  return {
    id,
    label,
    score: 50,
    rawValue: null,
    available: false,
  };
}

/**
 * 利用可能な component 配列から重み付き平均スコアを算出する。
 * weights 未指定の component は重み 1。全要素の合計重みが 0 の場合は 50 を返す。
 */
export function computeWeightedScore(
  components: JapanFearGreedComponent[],
  weights?: Partial<Record<JapanFearGreedComponentId, number>>,
): number {
  const available = components.filter((c) => c.available);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const c of available) {
    const w = weights?.[c.id] ?? 1;
    weightedSum += c.score * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 50;
}
