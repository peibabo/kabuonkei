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
 * JP スナップショットの最新エントリから「今日の分」のスコアだけを採用する。
 *
 * snapshot-japan-fg job（平日 JST 17:00）は祝日含む平日に必ず当日日付で
 * エントリを書くため、日本版アラート実行時（平日 JST 17:15）に最新エントリが
 * 今日以外なら「生成 job の遅延/失敗で前日値を見ている」とみなして採用しない。
 * 前日値のまま発火判定すると誤発火・失報がエラーにならず沈黙するのを防ぐ。
 */
export function pickFreshJpScore(
  snapshots: Array<{ date: string; score: number }> | undefined,
  todayJst: string
): { ok: true; score: number } | { ok: false; reason: string } {
  if (!snapshots || snapshots.length === 0) {
    return { ok: false, reason: "snapshots が空" };
  }
  const latest = snapshots[snapshots.length - 1];
  if (typeof latest?.score !== "number" || !Number.isFinite(latest.score)) {
    return { ok: false, reason: `最新エントリの score が不正: ${JSON.stringify(latest)}` };
  }
  if (latest.date !== todayJst) {
    return {
      ok: false,
      reason: `最新スナップショットが古い（latest=${latest.date}, today=${todayJst}）。snapshot-japan-fg job の遅延/失敗の可能性`,
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
