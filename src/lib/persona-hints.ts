import type { SentimentLevel } from "./types";
import { getSentimentLevel } from "./sentiment";

/** 投資スタイル別ペルソナ（/guide 配下の slug と一致） */
export type Persona = "nisa-tsumitate" | "short-term-trader" | "fire-long-term";

export interface PersonaMeta {
  icon: string;
  /** タブ表示用の短いラベル */
  tabLabel: string;
  /** ハイライト内の正式名称 */
  fullLabel: string;
  /** /guide/[slug] の slug */
  slug: string;
}

export const PERSONA_META: Record<Persona, PersonaMeta> = {
  "nisa-tsumitate": {
    icon: "📈",
    tabLabel: "📈 NISA積立",
    fullLabel: "NISA積立の人",
    slug: "nisa-tsumitate",
  },
  "short-term-trader": {
    icon: "⚡",
    tabLabel: "⚡ 短期",
    fullLabel: "短期トレーダーの人",
    slug: "short-term-trader",
  },
  "fire-long-term": {
    icon: "🎯",
    tabLabel: "🎯 FIRE",
    fullLabel: "FIRE目指しの人",
    slug: "fire-long-term",
  },
};

export const PERSONA_ORDER: readonly Persona[] = [
  "nisa-tsumitate",
  "short-term-trader",
  "fire-long-term",
];

export interface PersonaHint {
  /** 1-3 語の短い見出し（視覚ヒエラルキー用） */
  headline: string;
  /** 1-2 行の具体的な行動指針 */
  body: string;
}

/** ペルソナ × 温度帯 のヒント行動指針マトリクス */
export const PERSONA_HINTS: Record<
  Persona,
  Record<SentimentLevel, PersonaHint>
> = {
  "nisa-tsumitate": {
    極寒: {
      headline: "むしろチャンス局面",
      body:
        "総悲観で「積立をやめたい」心理が最大になる時期。過去 10 年、極寒から 3 ヶ月後の日経225 勝率は 100%。積立は続行、余剰資金があればスポット追加を検討。",
    },
    冷え込み: {
      headline: "底打ち待ちゾーン",
      body:
        "悲観優勢だが積立を止める理由はない。通常通りの積立を継続しつつ、ボーナス月の上乗せ候補として意識しておく。",
    },
    平温: {
      headline: "淡々と継続",
      body:
        "普通の地合い。追加アクションは不要。積立の自動設定を維持して、他のことに時間を使うのが正解の局面。",
    },
    過熱: {
      headline: "追加スポットは見送り",
      body:
        "楽観ムードで周囲の「儲かった話」が増える時期。積立自体は継続、ただし追加スポット買いは急がない。リバランスの点検タイミング。",
    },
    沸騰: {
      headline: "利確の誘惑を抑える",
      body:
        "「今のうちに利益確定したい」FOMO が出る局面。長期積立の前提を崩さず、つみたての自動化を維持。新規スポットは見送り。",
    },
  },
  "short-term-trader": {
    極寒: {
      headline: "逆張り候補の最前線",
      body:
        "狼狽投売りが出やすい局面。ショートはリスク大、押し目買い・リバウンド狙いの環境が整いやすい。類似日機能で過去の反発パターンを確認。",
    },
    冷え込み: {
      headline: "押し目買いゾーン",
      body:
        "悲観優勢でボラティリティ高め。分割エントリーで下げ余地に備える。戻り売りの重さも意識。",
    },
    平温: {
      headline: "テクニカル優先",
      body:
        "地合いはニュートラル。マクロの偏りを気にする局面ではなく、テクニカルや需給でシナリオを立てるのが王道。",
    },
    過熱: {
      headline: "ロングは慎重に",
      body:
        "楽観優勢で押し目は限定的。新規ロングはリスク限定で、利確のタイミングを意識する。戻り売り候補の準備を。",
    },
    沸騰: {
      headline: "戻り売り準備",
      body:
        "FOMO で追随買いが増える踏み上げ終盤。新規ロングは注意、利益確定を優先。戻り売り・ショートの準備をするフェーズ。",
    },
  },
  "fire-long-term": {
    極寒: {
      headline: "最大の買い場",
      body:
        "待機資金投入の最大チャンス。年間の追加投資枠を前倒しで使う検討価値あり。歴史的に極寒 → 3 ヶ月後の日経225 平均は +11.5%。",
    },
    冷え込み: {
      headline: "分散エントリー",
      body:
        "ボーナスや現金比率の一部を少し多めに投入するタイミング。下げ余地に備えて分割で買い下がる。",
    },
    平温: {
      headline: "通常ペース",
      body:
        "大きなアクション不要。積立＋既存ポートフォリオの維持。現金比率の大幅変更は不要。",
    },
    過熱: {
      headline: "リバランス点検",
      body:
        "株式比率が目標を上回っているなら、一部を現金・債券に戻すタイミング。追加スポット買いは控える。",
    },
    沸騰: {
      headline: "次の極寒に備える",
      body:
        "利益確定と待機資金の積み増しフェーズ。次の暴落時に投入できる現金クッションを確保。全売りは NG（機会損失大）、段階的に。",
    },
  },
};

/** 指定ペルソナと温度スコアからヒントを取得 */
export function getPersonaHint(persona: Persona, score: number): PersonaHint {
  const level = getSentimentLevel(score);
  return PERSONA_HINTS[persona][level];
}

/** 極端な温度帯（アラート扱い）かどうか */
export function isExtremeScore(score: number): boolean {
  const level = getSentimentLevel(score);
  return level === "極寒" || level === "沸騰";
}
