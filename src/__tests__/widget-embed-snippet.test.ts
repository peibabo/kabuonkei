import { describe, it, expect } from "vitest";
import { buildEmbedSnippet } from "@/app/widget/_lib/embed-snippet";

describe("buildEmbedSnippet", () => {
  it("基本的な URL で <a> + <img> の HTML を返す", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com");
    expect(html).toContain('href="https://kabuonkei.com/?ref=widget"');
    expect(html).toContain('src="https://kabuonkei.com/widget/today"');
    expect(html).toContain('width="400"');
    expect(html).toContain('height="400"');
    expect(html).toContain('alt="株温計 - 今日の市場温度"');
  });

  it("クリック時は新規タブ / noopener で開く", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
  });

  it("`?ref=widget` トラッキング用クエリが必ず付く", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com");
    expect(html).toMatch(/\?ref=widget/);
  });

  it("siteUrl 末尾にスラッシュがあっても二重にならない", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com/");
    expect(html).toContain('href="https://kabuonkei.com/?ref=widget"');
    expect(html).toContain('src="https://kabuonkei.com/widget/today"');
    expect(html).not.toContain("kabuonkei.com//widget");
  });

  it("独自指標である旨のクレジット行を含む", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com");
    expect(html).toContain("独自指標");
    expect(html).toContain("公開データより計算");
    expect(html).toContain("株温計");
  });

  it("クレジット行は株温計サイトへのリンクを含む（ref=widget_credit でトラッキング）", () => {
    const html = buildEmbedSnippet("https://kabuonkei.com");
    expect(html).toContain('href="https://kabuonkei.com/?ref=widget_credit"');
  });
});
