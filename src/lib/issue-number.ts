/**
 * 株温計の「号数」を計算する。
 * リリース日（2026-04-19）を 第1号 として、JST 基準でカレンダー日数 + 1 を返す。
 * v2: 営業日ベース化、号数アーカイブ `/archive/[issue]` 連携
 */

/** リリース日 (JST 0:00 = UTC 前日 15:00) */
export const RELEASE_DATE_UTC = Date.UTC(2026, 3, 18, 15, 0, 0); // 2026-04-19 00:00 JST

/**
 * 指定時刻（既定: 現在）の JST カレンダー日付に基づく号数を返す。
 * - リリース日当日 = 第1号
 * - リリース日より前 = 0（号数表示しない側で扱う）
 */
export function getIssueNumber(now: Date | number = Date.now()): number {
  const ms = typeof now === "number" ? now : now.getTime();
  const todayJstMidnight = jstMidnight(ms);
  const releaseJstMidnight = jstMidnight(RELEASE_DATE_UTC);
  const days = Math.round(
    (todayJstMidnight - releaseJstMidnight) / 86_400_000,
  );
  return days < 0 ? 0 : days + 1;
}

/** UTC ms を JST 当日 0:00 の UTC ms に正規化する */
function jstMidnight(ms: number): number {
  const jst = new Date(ms + 9 * 60 * 60 * 1000);
  return Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate()) - 9 * 60 * 60 * 1000;
}
