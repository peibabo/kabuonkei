/**
 * トップ画面ヒーロー「今日の見出し」の決定木生成器。
 *
 * 入力: 日米スコア + 昨日比
 * 出力: 主見出し / サブ / 推奨 CTA
 *
 * 設計方針:
 * - 純粋関数。LLM 不使用。テスト容易。
 * - レベル組み合わせ (5×5 = 25) を主見出しに、デルタ方向をサブの動詞に反映。
 * - 極端値 (≤20 or ≥80) で primary CTA を「アラート」に切り替え。
 */

import { getSentimentLevel } from "./sentiment";
import type { SentimentLevel } from "./types";

export type HeroCta = "similar-days" | "hints" | "alert";

export interface HeadlineInputs {
  jp: number | null;
  us: number;
  jpDelta: number | null;
  usDelta: number;
}

export interface HeadlineOutput {
  headline: string;
  subline: string;
  ctaPrimary: HeroCta;
  ctaSecondary: HeroCta;
}

const DELTA_THRESHOLD = 5;

/** スコアに対応する平温（41-60）からの「ズレ方向」を返す */
function levelKey(level: SentimentLevel): "cold-extreme" | "cold" | "neutral" | "hot" | "hot-extreme" {
  switch (level) {
    case "極寒": return "cold-extreme";
    case "冷え込み": return "cold";
    case "平温": return "neutral";
    case "過熱": return "hot";
    case "沸騰": return "hot-extreme";
  }
}

/** 25 パターンの主見出し */
function buildHeadline(jpLevel: SentimentLevel, usLevel: SentimentLevel): string {
  const jp = levelKey(jpLevel);
  const us = levelKey(usLevel);

  // 同レベル
  if (jp === us) {
    if (jp === "hot-extreme") return "二大市場、同時に沸騰。";
    if (jp === "hot") return "日米そろって、過熱気味。";
    if (jp === "neutral") return "日米とも、平温で凪。";
    if (jp === "cold") return "日米とも、冷え込み中。";
    return "世界が冷え切っている。";
  }

  // 片方だけ極端 (沸騰 / 極寒)
  if (jp === "hot-extreme" && us !== "hot-extreme") return "日本だけ、沸騰している。";
  if (us === "hot-extreme" && jp !== "hot-extreme") return "米国だけ、沸騰している。";
  if (jp === "cold-extreme" && us !== "cold-extreme") return "日本だけ、凍えている。";
  if (us === "cold-extreme" && jp !== "cold-extreme") return "米国だけ、凍えている。";

  // 過熱 × 冷え（明確なねじれ） — 「だけ熱い」より先に判定
  if (jp === "hot" && us === "cold") return "日米でねじれ。日本が熱く、米国が冷えている。";
  if (jp === "cold" && us === "hot") return "日米でねじれ。米国が熱く、日本が冷えている。";

  // 過熱 × 平温
  if (jp === "hot" && us === "neutral") return "日本だけが、熱い。";
  if (us === "hot" && jp === "neutral") return "米国だけが、熱い。";

  // 冷え × 平温
  if (jp === "cold" && us === "neutral") return "日本だけが、冷えている。";
  if (us === "cold" && jp === "neutral") return "米国だけが、冷えている。";

  // フォールバック（理論上ここには来ないが念のため）
  return `日本 ${jpLevel}、米国 ${usLevel}。`;
}

/** デルタを「上昇 / 下降 / 横ばい」に丸める */
type DeltaDirection = "up" | "down" | "flat";
function deltaDirection(delta: number | null): DeltaDirection {
  if (delta == null) return "flat";
  if (delta >= DELTA_THRESHOLD) return "up";
  if (delta <= -DELTA_THRESHOLD) return "down";
  return "flat";
}

/** サブテキスト（昨日比方向 + 補足） */
function buildSubline(
  jp: number | null,
  us: number,
  jpLevel: SentimentLevel | null,
  usLevel: SentimentLevel,
  jpDir: DeltaDirection,
  usDir: DeltaDirection,
  similarCount?: number,
  winRate3m?: number,
): string {
  const parts: string[] = [];

  if (jp != null && jpLevel) {
    parts.push(`日本 ${jp}°(${jpLevel})`);
  }
  parts.push(`米国 ${us}°(${usLevel})`);

  let summary = parts.join("、");

  // 動きの説明
  const moves: string[] = [];
  if (jpDir === "up") moves.push("日本は熱を強め");
  else if (jpDir === "down") moves.push("日本は冷え");
  if (usDir === "up") moves.push("米国は熱を強め");
  else if (usDir === "down") moves.push("米国は冷え");

  if (moves.length > 0) {
    summary += `。${moves.join("、")}た。`;
  } else {
    summary += "。";
  }

  // 過去類似のヒント
  if (similarCount != null && similarCount > 0) {
    if (winRate3m != null) {
      summary += `この組み合わせは過去 ${similarCount} 回。3 ヶ月後 日経勝率 ${winRate3m}%。`;
    } else {
      summary += `過去類似 ${similarCount} 件。`;
    }
  }

  return summary;
}

export interface HeadlineExtras {
  /** 過去類似日件数（0-N） */
  similarCount?: number;
  /** 3 ヶ月後の日経 prevailing 勝率（%）。表示しないなら省略 */
  winRate3m?: number;
}

/**
 * 主見出し + サブ + CTA を組み立てる。
 */
export function buildHeroCopy(
  inputs: HeadlineInputs,
  extras: HeadlineExtras = {},
): HeadlineOutput {
  const usLevel = getSentimentLevel(inputs.us);
  const jpLevel = inputs.jp != null ? getSentimentLevel(inputs.jp) : null;
  const jpDir = deltaDirection(inputs.jpDelta);
  const usDir = deltaDirection(inputs.usDelta);

  // jp が null の場合（極稀。日本データ落ち）は単純な US 主体見出し
  let headline: string;
  if (inputs.jp == null || jpLevel == null) {
    headline = `米国は ${usLevel}。日本データ取得待ち。`;
  } else {
    headline = buildHeadline(jpLevel, usLevel);
  }

  const subline = buildSubline(
    inputs.jp,
    inputs.us,
    jpLevel,
    usLevel,
    jpDir,
    usDir,
    extras.similarCount,
    extras.winRate3m,
  );

  // CTA: 極端値（≤20 or ≥80）なら primary = アラート、それ以外は類似日
  const isExtreme = (s: number) => s <= 20 || s >= 80;
  const anyExtreme = isExtreme(inputs.us) || (inputs.jp != null && isExtreme(inputs.jp));

  const ctaPrimary: HeroCta = anyExtreme ? "alert" : "similar-days";
  const ctaSecondary: HeroCta = anyExtreme ? "similar-days" : "hints";

  return { headline, subline, ctaPrimary, ctaSecondary };
}
