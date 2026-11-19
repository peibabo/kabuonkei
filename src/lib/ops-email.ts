/** 運営者宛てメール（定期実行の異常通知・X 投稿の下書き）の既定の送り先 */
export const DEFAULT_OPS_EMAIL = "info@kabuonkei.com";

/** 運営者宛てメールの送り先。環境変数 OPS_ALERT_EMAIL、未設定なら既定アドレス */
export function opsAlertEmail(): string {
  return process.env.OPS_ALERT_EMAIL || DEFAULT_OPS_EMAIL;
}
