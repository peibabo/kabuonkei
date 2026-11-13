import type { SentimentLevel, SentimentDescription } from "./types";

/** 温度帯（低い順） */
export const SENTIMENT_LEVELS: readonly SentimentLevel[] = [
  "極寒",
  "冷え込み",
  "平温",
  "過熱",
  "沸騰",
];

export function getSentimentLevel(score: number): SentimentLevel {
  if (score <= 20) return "極寒";
  if (score <= 40) return "冷え込み";
  if (score <= 60) return "平温";
  if (score <= 80) return "過熱";
  return "沸騰";
}

export function getSentimentDescription(score: number): SentimentDescription {
  if (score <= 20) return "総悲観";
  if (score <= 40) return "弱気";
  if (score <= 60) return "中立";
  if (score <= 80) return "強気";
  return "総楽観";
}

export function getSentimentColor(score: number): string {
  if (score <= 20) return "#2563eb"; // blue-600（極寒）
  if (score <= 40) return "#0ea5e9"; // sky-500（冷え込み）
  if (score <= 60) return "#ca8a04"; // yellow-600（平温）
  if (score <= 80) return "#ea580c"; // orange-600（過熱）
  return "#dc2626"; // red-600（沸騰）
}

/** getSentimentColor と同じ色の Tailwind 文字色クラス（行数の多い表で inline style を避ける用） */
export const SENTIMENT_TEXT_CLASS: Record<SentimentLevel, string> = {
  極寒: "text-blue-600",
  冷え込み: "text-sky-500",
  平温: "text-yellow-600",
  過熱: "text-orange-600",
  沸騰: "text-red-600",
};

export function getSentimentTextClass(score: number): string {
  return SENTIMENT_TEXT_CLASS[getSentimentLevel(score)];
}
