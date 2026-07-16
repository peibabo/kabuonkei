/**
 * トップ画面ヒーロー「今日の見出し」の生成器（決定木 v2）。
 *
 * 入力: 日米スコア + 昨日比 + 日本レベル連続日数 + JST 通日番号
 * 出力: 主見出し / サブ / 推奨 CTA
 *
 * 設計方針:
 * - 純粋関数。LLM 不使用。テスト容易。現在時刻には触れず、日付は dayNumber 引数で受ける。
 * - 決定木はレベル組み合わせ (5×5) を「状態キー」に写像し、文言は状態キー別の
 *   バリエーションプール（base + トレンド候補 + streak 候補）から JST 日付で決定的に選ぶ。
 *   同一日は常に同じ文言、状態が続く日は毎日別の文言に回る。
 * - 接近オーバーライド: レベルが違ってもスコア差 < 10 なら「だけ」等の対比断言をやめ、
 *   「日米ほぼ同温」系の見出しに切替（境界の丸め誤差を対比として報じない）。
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

/** streak 候補を混ぜる最低連続日数 */
const STREAK_THRESHOLD = 3;

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

/** 決定木が返す状態キー（既存 15 状態 + jp データ欠損の us-only + 接近 4 状態） */
export type HeadlineStateKey =
  | "both-boiling"
  | "both-hot"
  | "both-neutral"
  | "both-cold"
  | "both-frozen"
  | "jp-boiling-solo"
  | "us-boiling-solo"
  | "jp-frozen-solo"
  | "us-frozen-solo"
  | "twist-jp-hot"
  | "twist-us-hot"
  | "jp-hot-solo"
  | "us-hot-solo"
  | "jp-cold-solo"
  | "us-cold-solo"
  | "us-only"
  | `near-${NearBoundaryKey}`;

/**
 * 接近オーバーライドの境界キー。
 * スコア差 < NEAR_GAP_THRESHOLD でレベルが異なるのは隣接レベルのみ
 * （非隣接の最小差は 21）なので、レベル境界 4 本のいずれかに定まる。
 */
export type NearBoundaryKey = "boiling-hot" | "hot-neutral" | "neutral-cold" | "cold-frozen";

/** レベルが違ってもこの差未満なら「ほぼ同温」として扱う */
const NEAR_GAP_THRESHOLD = 10;

type MarketName = "日本" | "米国";

/**
 * 日米のレベルが異なりスコア差 < NEAR_GAP_THRESHOLD のとき、
 * 跨いでいる境界キーと高低の市場名を返す。該当しなければ null。
 */
export function resolveNearBoundary(
  jp: number | null,
  us: number,
): { key: NearBoundaryKey; hi: MarketName; lo: MarketName } | null {
  if (jp == null) return null;
  if (getSentimentLevel(jp) === getSentimentLevel(us)) return null;
  if (Math.abs(jp - us) >= NEAR_GAP_THRESHOLD) return null;

  const hiScore = Math.max(jp, us);
  const key: NearBoundaryKey =
    hiScore > 80 ? "boiling-hot"
    : hiScore > 60 ? "hot-neutral"
    : hiScore > 40 ? "neutral-cold"
    : "cold-frozen";
  const hi: MarketName = jp > us ? "日本" : "米国";
  const lo: MarketName = hi === "日本" ? "米国" : "日本";
  return { key, hi, lo };
}

/**
 * レベル組み合わせ → 状態キー。分岐構造は v1 の決定木をそのまま踏襲。
 * 接近状態（near-*）はレベルでなくスコア差で決まるため、ここでは返さない
 * （buildHeroCopy が resolveNearBoundary で先に判定する）。
 */
export function getHeadlineStateKey(
  jpLevel: SentimentLevel | null,
  usLevel: SentimentLevel,
): Exclude<HeadlineStateKey, `near-${NearBoundaryKey}`> {
  if (jpLevel == null) return "us-only";

  const jp = levelKey(jpLevel);
  const us = levelKey(usLevel);

  // 同レベル
  if (jp === us) {
    if (jp === "hot-extreme") return "both-boiling";
    if (jp === "hot") return "both-hot";
    if (jp === "neutral") return "both-neutral";
    if (jp === "cold") return "both-cold";
    return "both-frozen";
  }

  // 片方だけ極端 (沸騰 / 極寒)
  if (jp === "hot-extreme") return "jp-boiling-solo";
  if (us === "hot-extreme") return "us-boiling-solo";
  if (jp === "cold-extreme") return "jp-frozen-solo";
  if (us === "cold-extreme") return "us-frozen-solo";

  // 過熱 × 冷え（明確なねじれ） — 「だけ熱い」より先に判定
  if (jp === "hot" && us === "cold") return "twist-jp-hot";
  if (jp === "cold" && us === "hot") return "twist-us-hot";

  // 過熱 × 平温 / 冷え × 平温
  if (jp === "hot") return "jp-hot-solo";
  if (us === "hot") return "us-hot-solo";
  if (jp === "cold") return "jp-cold-solo";
  return "us-cold-solo";
}

/**
 * 状態キー別の文言プール。
 * - base: 常時候補（各プール先頭は v1 の既存文言。dayNumber 未指定時の既定挙動を旧版に寄せる）
 * - up / down: 主役市場の昨日比が ±DELTA_THRESHOLD 以上のとき候補に追加
 * - streak: 日本レベルが STREAK_THRESHOLD 日以上続くとき候補に追加（日本を主語にできる状態のみ）
 */
interface HeadlinePool {
  base: readonly string[];
  up?: readonly string[];
  down?: readonly string[];
  streak?: ReadonlyArray<(n: number) => string>;
}

/** 決定木プールを持つ状態キー（us-only と接近状態は専用プールを使う） */
type PooledStateKey = Exclude<HeadlineStateKey, "us-only" | `near-${NearBoundaryKey}`>;

export const HEADLINE_POOLS: Record<PooledStateKey, HeadlinePool> = {
  // ---- 高頻度状態（実出現率 35.5% / 30.4% / 19.2%）は厚めに ----
  "jp-boiling-solo": {
    // 相手側は過熱〜極寒まであり得るため「落ち着き」等の断定はせず相対表現に留める
    base: [
      "日本だけ、沸騰している。",
      "熱源は東京。米国は一段下。",
      "日本市場、ひとり沸騰。",
      "東京の熱、なお冷めず。",
      "沸くのは日本、米国は一歩後ろ。",
      "日本の温度計、振り切れたまま。",
    ],
    up: ["日本、さらに熱を上げる。", "東京の沸騰、勢いを増す。"],
    down: ["沸騰は続く。ただ、上げは一服。", "日本、沸点から半歩引く。"],
    streak: [
      (n) => `日本の沸騰、${n}日目。`,
      (n) => `${n}日続く、東京の熱。`,
    ],
  },
  "both-hot": {
    base: [
      "日米そろって、過熱気味。",
      "太平洋の両岸、ともに熱い。",
      "日米の温度計、そろって過熱圏。",
      "熱を帯びる、二つの市場。",
      "日も米も、平温を上に離れる。",
      "過熱圏で並走する日米。",
    ],
    up: ["日米、そろって熱を上げる。", "過熱の日米、なお上向き。"],
    down: ["過熱圏のまま、熱はわずかに引く。", "日米、熱を残して一服。"],
    streak: [(n) => `日本の過熱、${n}日目。米国も熱い。`],
  },
  "both-boiling": {
    base: [
      "二大市場、同時に沸騰。",
      "日米、そろって沸点。",
      "世界の温度計、振り切れ気味。",
      "沸騰が沸騰を呼ぶ、日米同時高温。",
      "日も米も、沸いている。",
    ],
    up: ["同時沸騰、さらに加熱。"],
    down: ["沸騰圏内、だが熱はわずかに引く。", "日米、沸点の手前まで一歩戻る。"],
    streak: [(n) => `日本の沸騰、${n}日目。米国も沸く。`],
  },

  // ---- 中頻度・同レベル系 ----
  "both-neutral": {
    base: [
      "日米とも、平温で凪。",
      "波立たぬ日米、温度は真ん中。",
      "市場は小康。日米そろって平温。",
    ],
  },
  "both-cold": {
    base: [
      "日米とも、冷え込み中。",
      "二つの市場に、冷たい風。",
      "日米そろって、温度計は下向き。",
    ],
  },
  "both-frozen": {
    base: [
      "世界が冷え切っている。",
      "日米とも極寒。歴史的な冷え込み。",
      "温度計は底。世界同時の凍てつき。",
    ],
  },

  // ---- 片側 solo 系 ----
  "us-boiling-solo": {
    // 相手側は過熱〜極寒まであり得るため「落ち着き」等の断定はせず相対表現に留める
    base: [
      "米国だけ、沸騰している。",
      "熱源はニューヨーク。日本は一段下。",
      "米国市場、ひとり沸騰。",
    ],
  },
  "jp-frozen-solo": {
    base: ["日本だけ、凍えている。", "冷えるのは東京だけ。"],
  },
  "us-frozen-solo": {
    base: ["米国だけ、凍えている。", "冷えるのはニューヨークだけ。"],
  },
  "jp-hot-solo": {
    base: [
      "日本だけが、熱い。",
      "熱を帯びるのは東京だけ。",
      "日本先行の高温。米国は平温。",
    ],
    streak: [(n) => `日本の過熱、${n}日目。`],
  },
  "us-hot-solo": {
    base: [
      "米国だけが、熱い。",
      "熱を帯びるのはニューヨークだけ。",
      "米国先行の高温。日本は平温。",
    ],
  },
  "jp-cold-solo": {
    base: ["日本だけが、冷えている。", "冷えは東京だけ。米国は平温。"],
  },
  "us-cold-solo": {
    base: ["米国だけが、冷えている。", "冷えはニューヨークだけ。日本は平温。"],
  },

  // ---- ねじれ ----
  "twist-jp-hot": {
    base: [
      "日米でねじれ。日本が熱く、米国が冷えている。",
      "温度差くっきり。熱い日本、冷える米国。",
    ],
  },
  "twist-us-hot": {
    base: [
      "日米でねじれ。米国が熱く、日本が冷えている。",
      "温度差くっきり。熱い米国、冷える日本。",
    ],
  },
};

/**
 * 接近オーバーライド時の文言プール。高い側・低い側の市場名を受けて生成する。
 * 「だけ」「ねじれ」のような対比の断言はせず、両市場が近いことを主語にする。
 */
export const NEAR_POOLS: Record<NearBoundaryKey, ReadonlyArray<(hi: MarketName, lo: MarketName) => string>> = {
  "boiling-hot": [
    (hi) => `日米とも高温圏。${hi}が半歩先、沸騰の域。`,
    (hi) => `ほぼ同温の日米。${hi}は沸点越え。`,
    (hi) => `${hi}がわずかに先行。日米そろって熱い。`,
  ],
  "hot-neutral": [
    (hi) => `日米ほぼ同温。${hi}がやや熱め。`,
    (hi) => `平温と過熱の境目。${hi}が半歩上。`,
    (hi) => `温度差はわずか。${hi}が先に熱を帯びる。`,
  ],
  "neutral-cold": [
    (_hi, lo) => `日米ほぼ同温。${lo}がやや冷え。`,
    (_hi, lo) => `平温と冷えの境目。${lo}が半歩下。`,
    (_hi, lo) => `温度差はわずか。${lo}が先に冷えている。`,
  ],
  "cold-frozen": [
    (_hi, lo) => `日米そろって低温圏。${lo}は凍える域。`,
    (_hi, lo) => `ほぼ同温の冷え込み。${lo}が一段深い。`,
    (_hi, lo) => `${lo}がわずかに下、日米とも寒い。`,
  ],
};

/** jp データ欠損時の見出し（レベル文言を含むため関数生成） */
const US_ONLY_HEADLINES: ReadonlyArray<(usLevel: SentimentLevel) => string> = [
  (usLevel) => `米国は ${usLevel}。日本データ取得待ち。`,
  (usLevel) => `米国の温度は ${usLevel}。日本分は集計中。`,
];

/** 空プール時の最終フォールバック（理論上ここには来ないが念のため） */
function fallbackHeadline(jpLevel: SentimentLevel | null, usLevel: SentimentLevel): string {
  return jpLevel != null ? `日本 ${jpLevel}、米国 ${usLevel}。` : `米国 ${usLevel}。`;
}

/** デルタを「上昇 / 下降 / 横ばい」に丸める */
type DeltaDirection = "up" | "down" | "flat";
function deltaDirection(delta: number | null): DeltaDirection {
  if (delta == null) return "flat";
  if (delta >= DELTA_THRESHOLD) return "up";
  if (delta <= -DELTA_THRESHOLD) return "down";
  return "flat";
}

/**
 * 状態の「主役市場」のトレンド方向を返す。
 * 日本主語の状態 → 日本、米国主語 → 米国、日米両方 → 両者が同方向のときのみその方向。
 */
function relevantTrend(
  stateKey: HeadlineStateKey,
  jpDir: DeltaDirection,
  usDir: DeltaDirection,
): DeltaDirection {
  switch (stateKey) {
    case "jp-boiling-solo":
    case "jp-frozen-solo":
    case "jp-hot-solo":
    case "jp-cold-solo":
    case "twist-jp-hot":
      return jpDir;
    case "us-boiling-solo":
    case "us-frozen-solo":
    case "us-hot-solo":
    case "us-cold-solo":
    case "twist-us-hot":
    case "us-only":
      return usDir;
    default:
      // both-* 系は日米が同方向に動いたときだけトレンド扱い
      return jpDir === usDir ? jpDir : "flat";
  }
}

/** 32bit FNV-1a。状態キーごとにローテーションの位相をずらす（全状態が同期回転しないため） */
function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * 候補から JST 通日番号で決定的に 1 本選ぶ。
 * dayNumber % length なので、同じ状態が続く限り毎日必ず別の文言に回る。
 */
export function pickHeadlineVariant(
  stateKey: HeadlineStateKey,
  candidates: readonly string[],
  dayNumber: number,
): string | null {
  if (candidates.length === 0) return null;
  const offset = fnv1a(stateKey);
  const index = (((dayNumber + offset) % candidates.length) + candidates.length) % candidates.length;
  return candidates[index];
}

/** 状態キー + トレンド + streak からその日の候補リストを組み立てる */
function collectCandidates(
  stateKey: PooledStateKey,
  trend: DeltaDirection,
  jpStreak: number | null | undefined,
): string[] {
  const pool = HEADLINE_POOLS[stateKey];
  const candidates = [...pool.base];
  if (trend === "up" && pool.up) candidates.push(...pool.up);
  if (trend === "down" && pool.down) candidates.push(...pool.down);
  if (jpStreak != null && jpStreak >= STREAK_THRESHOLD && pool.streak) {
    candidates.push(...pool.streak.map((fn) => fn(jpStreak)));
  }
  return candidates;
}

/** 昨日比を "+6" / "-3" / "±0" に整形 */
function formatDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `${rounded}`;
  return "±0";
}

/** サブテキスト（スコア + 数値昨日比 + 過去類似ヒント） */
function buildSubline(
  jp: number | null,
  us: number,
  jpLevel: SentimentLevel | null,
  usLevel: SentimentLevel,
  jpDelta: number | null,
  usDelta: number,
  similarCount?: number,
  winRate3m?: number,
): string {
  const parts: string[] = [];

  if (jp != null && jpLevel) {
    const delta = jpDelta != null ? `・前日比${formatDelta(jpDelta)}` : "";
    parts.push(`日本 ${jp}°(${jpLevel}${delta})`);
  }
  parts.push(`米国 ${us}°(${usLevel}・前日比${formatDelta(usDelta)})`);

  let summary = parts.join("、") + "。";

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
  /** JST 通日番号（getJstDayNumber()）。文言ローテーションのシード。省略時 0 = 決定的な既定文言 */
  dayNumber?: number;
  /** 現在の日本レベルの連続営業日数（当日含む）。null/undefined = 不明 */
  jpStreak?: number | null;
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
  const dayNumber = extras.dayNumber ?? 0;

  const stateKey = getHeadlineStateKey(jpLevel, usLevel);
  const near = resolveNearBoundary(inputs.jp, inputs.us);

  let headline: string | null;
  if (stateKey === "us-only") {
    headline = pickHeadlineVariant(
      stateKey,
      US_ONLY_HEADLINES.map((fn) => fn(usLevel)),
      dayNumber,
    );
  } else if (near) {
    // 接近オーバーライド: レベル差は境界の丸め誤差なので対比の断言をしない
    headline = pickHeadlineVariant(
      `near-${near.key}`,
      NEAR_POOLS[near.key].map((fn) => fn(near.hi, near.lo)),
      dayNumber,
    );
  } else {
    const trend = relevantTrend(stateKey, jpDir, usDir);
    const candidates = collectCandidates(stateKey, trend, extras.jpStreak);
    headline = pickHeadlineVariant(stateKey, candidates, dayNumber);
  }

  const subline = buildSubline(
    inputs.jp,
    inputs.us,
    jpLevel,
    usLevel,
    inputs.jpDelta,
    inputs.usDelta,
    extras.similarCount,
    extras.winRate3m,
  );

  // CTA: 極端値（≤20 or ≥80）なら primary = アラート、それ以外は類似日
  const isExtreme = (s: number) => s <= 20 || s >= 80;
  const anyExtreme = isExtreme(inputs.us) || (inputs.jp != null && isExtreme(inputs.jp));

  const ctaPrimary: HeroCta = anyExtreme ? "alert" : "similar-days";
  const ctaSecondary: HeroCta = anyExtreme ? "similar-days" : "hints";

  return {
    headline: headline ?? fallbackHeadline(jpLevel, usLevel),
    subline,
    ctaPrimary,
    ctaSecondary,
  };
}
