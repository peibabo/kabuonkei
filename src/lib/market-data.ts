import type { MarketData, JapanMarketData, ChartPoint } from "./types";
import {
  getStaticTemperatureHistory,
  mergeTemperatureData,
} from "./temperature-history";
import { computeJapanFearGreed } from "./japan-fear-greed";
import rawJapanMarketData from "@/data/japan-market-data.json";
import { fetchFearGreedIndex } from "./fear-greed";
import { fetchChart } from "./yahoo";
import {
  fetchVolatilityData,
  fetchIndices,
  fetchBondYield,
  fetchForex,
  fetchCommodities,
} from "./indices";
import { buildMarketData } from "./market-data/compose";
import {
  getJapanHistory,
  previousScoreBefore,
} from "./japan-temperature-history";
import { mergeMarginWeeks } from "./japan-fear-greed";
import marginHistory from "@/data/margin-ratio-history.json";
import { computeJapanLevelStreak } from "./level-streak";
import { getJstDateKey } from "./jst-date";

const japanMarketData = rawJapanMarketData as unknown as JapanMarketData;

/** 「この 1 週間」タイル用に、今の値の前に置く確定済みの過去点の数（5 営業日前 → 今） */
const WEEK_HISTORY_POINTS = 5;

/**
 * 日本版の直近 5 営業日の温度（古い → 新しい順）。今の値の立会日以降は除く
 * （表示側で今の値を末尾に足すため。休場日・寄り付き前でも二重にならないよう sessionDate で切る）。
 */
function pickJapanSparkline(sessionDate: string): number[] {
  return getJapanHistory()
    .filter((p) => p.date < sessionDate)
    .slice(-WEEK_HISTORY_POINTS)
    .map((p) => p.score);
}

/**
 * 米国版の直近 5 営業日の温度（古い → 新しい順）。今の値の立会日以降は除く。
 * CNN が使えない間は oneWeekAgo / previousClose も今の値になってしまうため、
 * 推移チャートと同じ「静的な推移 + VIX チャートから推定」の系列を使う。
 */
function pickUsSparkline(vixChart: ChartPoint[]): number[] {
  const sessionDate = vixChart.at(-1)?.date ?? getJstDateKey();
  return mergeTemperatureData(getStaticTemperatureHistory(), vixChart)
    .filter((p) => p.date < sessionDate)
    .slice(-WEEK_HISTORY_POINTS)
    .map((p) => p.score);
}

/**
 * 全市場データを取得する。
 * キャッシュは呼び出し元の `/api/market` Route Handler 側で ISR（`revalidate = 900`）により行う。
 * この関数自体は都度実 fetch を行うため、route 外（scripts 等）から直接呼ぶ場合は注意。
 */
export async function fetchAllMarketData(): Promise<MarketData> {
  // VIXを先に取得し、Fear & GreedのフォールバックにVIX値を渡す
  // ^N225 の長期 chart も並行取得（日本版温度スコア用）
  const [
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    nikkei225Chart,
  ] = await Promise.all([
    fetchVolatilityData(),
    fetchIndices(),
    fetchBondYield(),
    fetchForex(),
    fetchCommodities(),
    fetchChart("^N225", 220),
  ]);

  const vixPrice = volatility.find((v) => v.symbol === "^VIX")?.price;
  const fearGreed = await fetchFearGreedIndex(vixPrice);

  const nikkei225Price =
    indices.find((i) => i.symbol === "^N225")?.price ?? null;
  const japanFearGreed = computeJapanFearGreed({
    nikkei225Chart,
    nikkei225Price,
    investorTrading: japanMarketData.investorTrading ?? null,
    // JPX のページは直近約 5 週分だけなので、4 週変化が欠けないよう長期履歴を足す
    marginTrading: mergeMarginWeeks(
      marginHistory.weekly,
      japanMarketData.marginTrading ?? null,
    ),
  });

  // 現在値の立会日（チャート末尾）。休場日や 17 時以降でも「前営業日」と正しく比べるために使う
  const sessionDate = nikkei225Chart.at(-1)?.date ?? getJstDateKey();
  const japanHistory = getJapanHistory();

  return buildMarketData({
    fearGreed,
    japanFearGreed,
    previousJapanScore: previousScoreBefore(japanHistory, sessionDate),
    japanLevelStreak: computeJapanLevelStreak({
      currentScore: japanFearGreed?.score ?? null,
      snapshots: japanHistory,
      todayJstKey: sessionDate,
    }),
    japanSparkline: pickJapanSparkline(sessionDate),
    usSparkline: pickUsSparkline(
      volatility.find((v) => v.symbol === "^VIX")?.chart ?? [],
    ),
    volatility,
    indices,
    bonds,
    forex,
    commodities,
    now: Date.now(),
  });
}
