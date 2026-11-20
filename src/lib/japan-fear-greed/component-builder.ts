import type {
  JapanFearGreedComponent,
  JapanFearGreedComponentId,
  JapanFearGreedGroup,
} from "../types";

/** 算出可能な component を生成する薄いヘルパー。rawValue と note は呼び出し側が用意する */
export function buildAvailableComponent(args: {
  id: JapanFearGreedComponentId;
  label: string;
  group: JapanFearGreedGroup;
  score: number;
  rawValue: number | null;
  note?: string;
}): JapanFearGreedComponent {
  return {
    id: args.id,
    label: args.label,
    group: args.group,
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
  group: JapanFearGreedGroup,
): JapanFearGreedComponent {
  return {
    id,
    label,
    group,
    score: 50,
    rawValue: null,
    available: false,
  };
}
