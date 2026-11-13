import type { AlertKind, AlertMarket, AlertVariant } from "../../src/lib/types";

export function variantOf(market: AlertMarket, kind: AlertKind): AlertVariant {
  return `${market}_${kind}` as AlertVariant;
}

/** 現在の JST 時刻を YYYY-MM-DD に丸める */
export function jstIsoDate(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

/**
 * JP スナップショットの最新エントリが「直近営業日の分」のときだけスコアを採用する。
 *
 * スナップショットの日付は日経225 の最終取引日（`resolveTradingDate`）で記録される。
 * 呼び出し側は同じ基準で求めた直近営業日を `expectedDate` に渡す。最新エントリが
 * それより古ければ「生成 job の遅延/失敗で前営業日の値を見ている」とみなして採用しない。
 * 古い値のまま発火判定すると誤発火・失報がエラーにならず沈黙するのを防ぐ。
 * 休場日は直近営業日のエントリがそのまま最新なので採用され、状態は変化しない。
 */
export function pickFreshJpScore(
  snapshots: Array<{ date: string; score: number }> | undefined,
  expectedDate: string
): { ok: true; score: number } | { ok: false; reason: string } {
  if (!snapshots || snapshots.length === 0) {
    return { ok: false, reason: "snapshots が空" };
  }
  const latest = snapshots[snapshots.length - 1];
  if (typeof latest?.score !== "number" || !Number.isFinite(latest.score)) {
    return { ok: false, reason: `最新エントリの score が不正: ${JSON.stringify(latest)}` };
  }
  if (latest.date !== expectedDate) {
    return {
      ok: false,
      reason: `最新スナップショットが直近営業日のものではない（latest=${latest.date}, expected=${expectedDate}）。snapshot-japan-fg job の遅延/失敗の可能性`,
    };
  }
  return { ok: true, score: latest.score };
}

/**
 * 本送信（dry-run 以外）に必要な環境変数のうち未設定のものを返す。
 *
 * RESEND_FROM_EMAIL はワークフロー側で既定値を置かない（サンドボックス
 * onboarding@resend.dev への暗黙フォールバックは実購読者に届かず沈黙失敗する）ため、
 * 送信ループや Redis 状態更新に進む前にここで検知して中断する。
 */
export function missingSendEnv(env: Record<string, string | undefined>): string[] {
  return ["RESEND_API_KEY", "RESEND_FROM_EMAIL"].filter((k) => !env[k]);
}

/** "2026/04/24(金)" 形式のラベル */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
export function formatJstFullDateLabel(date: Date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  const w = WEEKDAYS[jst.getUTCDay()];
  return `${y}/${m}/${d}(${w})`;
}
