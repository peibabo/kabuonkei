"use client";

import { useState } from "react";
import { useIsClient } from "@/hooks/useIsClient";
import Link from "next/link";
import PeriodSwitcher from "@/components/_trend/PeriodSwitcher";
import { getSentimentColor, getSentimentLevel } from "@/lib/sentiment";
import {
  PERSONA_META,
  PERSONA_ORDER,
  getPersonaHint,
  isExtremeScore,
  type Persona,
} from "@/lib/persona-hints";
import { trackEvent } from "@/lib/analytics";

interface Props {
  /** 参照する温度スコア（現状は日本版温度。null の場合は米国版にフォールバック） */
  japanScore: number | null;
  usScore: number;
}

const STORAGE_KEY = "kabuonkei.persona";
const DEFAULT_PERSONA: Persona = "nisa-tsumitate";

const TAB_LABELS: Record<Persona, string> = {
  "nisa-tsumitate": PERSONA_META["nisa-tsumitate"].tabLabel,
  "short-term-trader": PERSONA_META["short-term-trader"].tabLabel,
  "fire-long-term": PERSONA_META["fire-long-term"].tabLabel,
};

/** 読み込み時に 1 回だけ localStorage を読む（サーバーでは null） */
function readStoredPersonaOnce(): Persona | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (
      stored === "nisa-tsumitate" ||
      stored === "short-term-trader" ||
      stored === "fire-long-term"
    ) {
      return stored;
    }
  } catch {
    // localStorage が無効な環境ではデフォルトで続行
  }
  return null;
}

export default function PersonalizedHintCard({ japanScore, usScore }: Props) {
  // 前回選んだタイプは localStorage から読む。サーバー描画と初回ハイドレーションでは既定のタイプにして
  // ずれを防ぎ、ブラウザでは読み込み時に 1 回だけ読む（別タブの変更には追従しない。従来どおり）
  const isClient = useIsClient();
  const [storedPersona] = useState(readStoredPersonaOnce);
  const [selectedPersona, setPersona] = useState<Persona | null>(null);
  const persona =
    selectedPersona ?? (isClient ? storedPersona : null) ?? DEFAULT_PERSONA;

  const handleChange = (next: Persona) => {
    setPersona(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // no-op
    }
    trackEvent("persona_select", { persona: next });
  };

  const score = japanScore ?? usScore;
  const marketLabel = japanScore != null ? "日本版温度" : "米国版温度";
  const level = getSentimentLevel(score);
  const color = getSentimentColor(score);
  const extreme = isExtremeScore(score);
  const hint = getPersonaHint(persona, score);
  const meta = PERSONA_META[persona];

  // 極端温度時は amber 強調、通常時は温度色のサイドバー
  const containerClass = extreme
    ? "bg-amber-50 border border-amber-300 rounded-2xl shadow-md p-6 mb-8"
    : "bg-white rounded-2xl shadow-md p-6 mb-8";

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <h2 className="text-lg font-bold text-gray-900">
          {extreme ? "⚠️ " : "💡 "}
          あなたのスタイル別の読み方
        </h2>
        <PeriodSwitcher<Persona>
          periods={PERSONA_ORDER}
          labels={TAB_LABELS}
          value={persona}
          onChange={handleChange}
        />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        今の{marketLabel}（
        <span className="font-bold" style={{ color }}>
          {score} / {level}
        </span>
        ）で、
        <span className="font-semibold">{meta.fullLabel}</span>
        はどう動くべきか？
      </p>

      {extreme && (
        <div className="mb-4 text-xs text-amber-800 leading-relaxed">
          ※ 極端な温度帯では、投資スタイルによって判断が大きく異なります。タブを切り替えて他のタイプの指針も確認してください。
        </div>
      )}

      {/* hydration 前はデフォルトペルソナの hint を描画。切替時の描画のみ
          遅延するが、SSR と同じ内容なのでレイアウトのズレは起きない */}
      <div
        className="rounded-lg p-4 mb-4"
        style={{
          borderLeft: `4px solid ${color}`,
          backgroundColor: `${color}10`,
        }}
      >
        <p className="text-base font-bold mb-2" style={{ color }}>
          {hint.headline}
        </p>
        <p className="text-sm text-gray-800 leading-relaxed">{hint.body}</p>
      </div>

      <Link
        href={`/guide/${meta.slug}?ref=persona_hint`}
        className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline"
      >
        {meta.icon} {meta.fullLabel}向けの詳しい使い方を見る
        <span aria-hidden="true">→</span>
      </Link>

      <noscript>
        <p className="mt-3 text-xs text-gray-400">
          ※ JavaScript 有効時は前回選択したタイプが自動で開きます
        </p>
      </noscript>
    </div>
  );
}
