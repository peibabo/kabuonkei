import { getSentimentDescription, getSentimentLevel } from "./sentiment";
import { COLD_THRESHOLD, HOT_THRESHOLD } from "./alerts/state-transition";

export interface ShareTextInput {
  market: "jp" | "us";
  japanScore: number | null;
  usScore: number | null;
  japanLevel: string | null;
  usLevel: string | null;
  dateLabel: string;
  siteUrl: string;
}

function extremeHeader(
  japanScore: number | null,
  usScore: number | null,
  dateLabel: string,
): string | null {
  const scores = [japanScore, usScore].filter(
    (s): s is number => s != null,
  );
  if (scores.length === 0) return null;
  if (Math.min(...scores) <= COLD_THRESHOLD) {
    return `⚠️ 極寒アラート ${dateLabel}`;
  }
  const max = Math.max(...scores);
  // ちょうど 80 は温度計ゲージと同じ「過熱」（沸騰は 81 以上）なので実スコアから導出
  if (max >= HOT_THRESHOLD) {
    return `🔥 ${getSentimentLevel(max)}アラート ${dateLabel}`;
  }
  return null;
}

/**
 * X 共有用の定型文を生成する純粋関数。
 * 加重 280 字以内に収まる短尺版で、日米両方のスコアを含めつつ
 * ユーザーがクリックした市場（`market`）を左側／先頭に置く。
 */
export function buildShareText(input: ShareTextInput): string {
  const lines: string[] = [];
  const header =
    extremeHeader(input.japanScore, input.usScore, input.dateLabel) ??
    `🌡 今日の市場温度（${input.dateLabel}）`;
  lines.push(header, "");

  const jpLine =
    input.japanScore != null && input.japanLevel
      ? `🇯🇵 日本 ${input.japanScore} ${input.japanLevel}（${getSentimentDescription(input.japanScore)}）`
      : null;
  const usLine =
    input.usScore != null && input.usLevel
      ? `🇺🇸 米国 ${input.usScore} ${input.usLevel}（${getSentimentDescription(input.usScore)}）`
      : null;

  const ordered =
    input.market === "jp" ? [jpLine, usLine] : [usLine, jpLine];
  for (const line of ordered) {
    if (line) lines.push(line);
  }

  lines.push("");
  const base = input.siteUrl.replace(/\/+$/, "");
  lines.push(
    `▶ ${base}/?ref=share&utm_source=x&utm_campaign=share_card`,
  );
  return lines.join("\n");
}
