/**
 * 埋め込みウィジェットの HTML スニペットを生成する純粋関数。
 * `siteUrl` は末尾スラッシュを含まない絶対 URL（例: https://kabuonkei.com）。
 *
 * 画像下のクレジット行は「公開データから独自計算した指標である」ことの明示と、
 * 株温計サイトへのリンク（SEO 被リンク）を兼ねる。
 */
export function buildEmbedSnippet(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `<a href="${base}/?ref=widget" target="_blank" rel="noopener">
  <img src="${base}/widget/today"
       width="400" height="400"
       alt="株温計 - 今日の市場温度" />
</a>
<small style="display:block;font-size:11px;color:#9ca3af;margin-top:4px;text-align:center">
  独自指標（公開データより計算）by <a href="${base}/?ref=widget_credit" target="_blank" rel="noopener" style="color:inherit">株温計</a>
</small>`;
}
