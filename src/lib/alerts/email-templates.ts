import type { AlertKind, AlertMarket, AlertVariant } from "@/lib/types";

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export interface VerifyEmailInput {
  verifyUrl: string;
  unsubscribeUrl: string;
  email: string;
  variants: AlertVariant[];
}

export interface AlertEmailInput {
  market: AlertMarket;
  kind: AlertKind;
  score: number;
  dateLabelJst: string;
  dashboardUrl: string;
  unsubscribeUrl: string;
  similarDay?: {
    date: string;
    label: string;
    return1m?: number | null;
    return3m?: number | null;
    return6m?: number | null;
  } | null;
}

const VARIANT_LABEL_JP: Record<AlertVariant, string> = {
  us_cold: "米国 極寒（≤20）",
  us_hot: "米国 過熱（≥80）",
  jp_cold: "日本 極寒（≤20）",
  jp_hot: "日本 過熱（≥80）",
};

export function variantLabel(variant: AlertVariant): string {
  return VARIANT_LABEL_JP[variant];
}

const MARKET_LABEL: Record<AlertMarket, string> = {
  us: "米国",
  jp: "日本",
};

const KIND_LABEL: Record<AlertKind, { sentiment: string; description: string; emoji: string }> = {
  cold: { sentiment: "極寒", description: "総悲観", emoji: "⚠️" },
  hot: { sentiment: "過熱・沸騰", description: "総楽観", emoji: "🔥" },
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildVerifyEmail(input: VerifyEmailInput): EmailContent {
  const variantLines = input.variants.map((v) => `- ${variantLabel(v)}`).join("\n");
  const variantLinesHtml = input.variants
    .map((v) => `<li>${escapeHtml(variantLabel(v))}</li>`)
    .join("");
  const subject = "【株温計】温度アラート登録の確認";
  const text = `株温計（https://kabuonkei.com）の温度アラートにご登録ありがとうございます。

下記リンクを 24 時間以内にクリックして登録を完了してください:

${input.verifyUrl}

登録内容:
- メール: ${input.email}
- 通知対象:
${variantLines}

お心当たりがない場合は本メールを破棄してください。確認されない場合、24 時間後に登録は自動で無効になります。

---
株温計
配信解除（登録に心当たりがない場合のみ）:
${input.unsubscribeUrl}
`;
  const html = `<!doctype html>
<html lang="ja"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  <h2 style="font-size:18px;">株温計 温度アラート登録の確認</h2>
  <p>株温計（<a href="https://kabuonkei.com">kabuonkei.com</a>）の温度アラートにご登録ありがとうございます。</p>
  <p>下記ボタンを <strong>24 時間以内</strong> にクリックして登録を完了してください。</p>
  <p style="margin:24px 0;">
    <a href="${escapeHtml(input.verifyUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;">登録を確定する</a>
  </p>
  <p style="color:#555;font-size:14px;">ボタンが押せない場合は下記 URL をブラウザに貼り付けてください:<br>
    <span style="word-break:break-all;">${escapeHtml(input.verifyUrl)}</span>
  </p>
  <h3 style="font-size:14px;margin-top:24px;">登録内容</h3>
  <ul>
    <li>メール: ${escapeHtml(input.email)}</li>
    <li>通知対象:
      <ul>${variantLinesHtml}</ul>
    </li>
  </ul>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="color:#777;font-size:12px;">お心当たりがない場合は本メールを破棄してください。24 時間後に自動で無効になります。<br>
  配信解除（登録に心当たりがない場合のみ）: <a href="${escapeHtml(input.unsubscribeUrl)}">${escapeHtml(input.unsubscribeUrl)}</a></p>
</body></html>`;
  return { subject, text, html };
}

export function buildAlertEmail(input: AlertEmailInput): EmailContent {
  const market = MARKET_LABEL[input.market];
  const kind = KIND_LABEL[input.kind];
  const subject = `${kind.emoji} 【株温計】${market}市場が${kind.sentiment}圏に突入（スコア${input.score}）`;

  const similarLine = input.similarDay
    ? `▶ 近い過去の類似日: ${input.similarDay.date}（${input.similarDay.label}）` +
      [
        input.similarDay.return1m != null
          ? ` 1M ${formatPct(input.similarDay.return1m)}`
          : "",
        input.similarDay.return3m != null
          ? ` / 3M ${formatPct(input.similarDay.return3m)}`
          : "",
        input.similarDay.return6m != null
          ? ` / 6M ${formatPct(input.similarDay.return6m)}`
          : "",
      ].join("")
    : "";

  const text = `${input.dateLabelJst} 時点で、${market}市場の温度が ${kind.sentiment} 圏に突入しました。

スコア: ${input.score} / 100
判定: ${kind.sentiment}（${kind.description}）

▶ ダッシュボードで詳細を見る
${input.dashboardUrl}
${similarLine ? `\n${similarLine}\n` : ""}
このメールは、株温計の温度アラートにご登録いただいた方にお送りしています。

配信解除（ワンクリック）:
${input.unsubscribeUrl}

---
株温計
お問い合わせ: info@kabuonkei.com
`;

  const similarHtml = input.similarDay
    ? `<p style="margin-top:16px;color:#333;">近い過去の類似日: <strong>${escapeHtml(input.similarDay.date)}</strong>（${escapeHtml(
        input.similarDay.label
      )}）<br>${
        input.similarDay.return1m != null
          ? `1M ${formatPct(input.similarDay.return1m)}`
          : ""
      }${
        input.similarDay.return3m != null
          ? ` / 3M ${formatPct(input.similarDay.return3m)}`
          : ""
      }${
        input.similarDay.return6m != null
          ? ` / 6M ${formatPct(input.similarDay.return6m)}`
          : ""
      }</p>`
    : "";

  const barColor = input.kind === "cold" ? "#2563eb" : "#dc2626";

  const html = `<!doctype html>
<html lang="ja"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;">
  <p style="color:#777;font-size:12px;margin:0 0 8px 0;">${escapeHtml(input.dateLabelJst)} 時点</p>
  <h2 style="font-size:20px;margin:0 0 12px 0;">${kind.emoji} ${escapeHtml(market)}市場が${escapeHtml(kind.sentiment)}圏に突入</h2>
  <table role="presentation" style="border-collapse:collapse;margin:12px 0;">
    <tr>
      <td style="background:${barColor};color:#fff;font-size:28px;font-weight:700;padding:12px 20px;border-radius:8px;">
        スコア ${input.score} / 100
      </td>
    </tr>
  </table>
  <p><strong>判定:</strong> ${escapeHtml(kind.sentiment)}（${escapeHtml(kind.description)}）</p>
  <p style="margin:24px 0;">
    <a href="${escapeHtml(input.dashboardUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;">ダッシュボードで詳細を見る</a>
  </p>
  ${similarHtml}
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="color:#777;font-size:12px;">このメールは株温計の温度アラートにご登録いただいた方にお送りしています。<br>
  配信解除（ワンクリック）: <a href="${escapeHtml(input.unsubscribeUrl)}">${escapeHtml(input.unsubscribeUrl)}</a><br>
  お問い合わせ: <a href="mailto:info@kabuonkei.com">info@kabuonkei.com</a></p>
</body></html>`;

  return { subject, text, html };
}

function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
