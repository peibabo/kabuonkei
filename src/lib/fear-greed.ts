import type { FearGreedData } from "./types";

interface CNNFearGreedResponse {
  fear_and_greed: {
    score: number;
    rating: string;
    previous_close: number;
    one_week_ago: { score: number };
    one_month_ago: { score: number };
    one_year_ago: { score: number };
    timestamp: string;
  };
}

/**
 * VIXの値からFear & Greedスコアを簡易推定する。
 * VIX 10以下 → 95（沸騰）、VIX 40以上 → 5（極寒）の線形マッピング。
 */
export function estimateFearGreedFromVix(vix: number): number {
  const score = Math.round(100 - ((vix - 10) / 30) * 100);
  return Math.max(0, Math.min(100, score));
}

export async function fetchFearGreedIndex(
  vixFallback?: number
): Promise<FearGreedData> {
  // まずCNN APIを試す
  try {
    const res = await fetch(
      "https://production.dataviz.cnn.io/index/fearandgreed/graphdata",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: "https://edition.cnn.com/",
          Origin: "https://edition.cnn.com",
        },
        next: { revalidate: 3600 },
      }
    );

    if (res.ok) {
      const data: CNNFearGreedResponse = await res.json();
      const fg = data.fear_and_greed;

      return {
        score: Math.round(fg.score),
        rating: fg.rating,
        previousClose: Math.round(fg.previous_close),
        oneWeekAgo: Math.round(fg.one_week_ago.score),
        oneMonthAgo: Math.round(fg.one_month_ago.score),
        oneYearAgo: Math.round(fg.one_year_ago.score),
        timestamp: fg.timestamp,
      };
    }
  } catch {
    // CNN API失敗時はフォールバックへ
  }

  // フォールバック: VIXベースの簡易推定
  const vix = vixFallback ?? 20;
  const score = estimateFearGreedFromVix(vix);

  return {
    score,
    rating: "estimated",
    previousClose: score,
    oneWeekAgo: score,
    oneMonthAgo: score,
    oneYearAgo: score,
    timestamp: new Date().toISOString(),
  };
}
