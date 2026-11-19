/**
 * 「どの営業日のデータか」を実行時刻ではなく市場の最終取引時刻から決める純粋関数。
 *
 * GitHub Actions の schedule は数時間単位で遅延することがあり、平日 17:00 JST 指定の
 * ジョブが日付をまたいで翌日未明に走る。実行時刻の日付をそのまま使うと、
 * 金曜の引け値が土曜の日付で記録されるなど 1 営業日後ろにずれるため、
 * 日経225 の最終取引時刻（Yahoo Finance の regularMarketTime）を基準にする。
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

/**
 * 最終取引からこれ以上経っていたら「今日は休場（祝日・週末）」とみなす。
 * 通常日は 15:30 引け → 遅延込みでも翌 03:00 頃（約 12 時間後）までに実行される。
 * 祝日の実行は前営業日の引けから 24 時間以上あくので、その間を閾値にする。
 */
export const MARKET_CLOSED_THRESHOLD_HOURS = 20;

/** Date を JST の YYYY-MM-DD に変換 */
export function toJstIsoDate(d: Date): string {
  return new Date(d.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

export interface TradingDateResult {
  /** データが属する営業日（JST, YYYY-MM-DD） */
  date: string;
  /** 直近取引から時間が経っており、実行日が休場とみられる */
  marketClosed: boolean;
  /** 最終取引時刻が取れず、実行時刻からの推定にフォールバックした */
  fallback: boolean;
}

/**
 * 最終取引時刻から営業日を決める。
 *
 * 最終取引時刻が取れない場合は「翌朝 9:00 JST の寄り付きまでは前日分」とみなし、
 * 実行時刻の 9 時間前の JST 日付（= UTC 日付）で代用する。
 */
export function resolveTradingDate(
  marketTime: Date | null | undefined,
  now: Date = new Date()
): TradingDateResult {
  if (
    !(marketTime instanceof Date) ||
    Number.isNaN(marketTime.getTime()) ||
    marketTime.getTime() > now.getTime() + HOUR_MS
  ) {
    return {
      date: now.toISOString().slice(0, 10),
      marketClosed: false,
      fallback: true,
    };
  }
  const elapsedHours = (now.getTime() - marketTime.getTime()) / HOUR_MS;
  return {
    date: toJstIsoDate(marketTime),
    marketClosed: elapsedHours > MARKET_CLOSED_THRESHOLD_HOURS,
    fallback: false,
  };
}

/** この時刻（JST）より前の実行では、当日分の終値（取引時間中の途中値）を使わない */
export const SAFE_CLOSE_HOUR_JST = 16;

/**
 * 取引時間中（JST 16 時より前）の実行なら、当日の途中値を終値の Map から取り除く。
 * 取り除いたら true。
 */
export function dropIntradayToday(closes: Map<string, number>, now: Date = new Date()): boolean {
  const hourJst = (now.getUTCHours() + 9) % 24;
  if (hourJst >= SAFE_CLOSE_HOUR_JST) return false;
  return closes.delete(toJstIsoDate(now));
}
