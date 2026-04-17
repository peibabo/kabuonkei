import type { SentimentLevel, SentimentDescription } from "./types";

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
