/**
 * 埋め込みウィジェットの HTML スニペットを生成する純粋関数。
 * `siteUrl` は末尾スラッシュを含まない絶対 URL（例: https://kabuonkei.com）。
 */
export function buildEmbedSnippet(siteUrl: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `<a href="${base}/?ref=widget" target="_blank" rel="noopener">
  <img src="${base}/widget/today"
       width="400" height="400"
       alt="株温計 - 今日の市場温度" />
</a>`;
}
