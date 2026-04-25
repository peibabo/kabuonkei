import { describe, it, expect } from "vitest";
import { buildAtomFeed } from "@/lib/feed";

describe("buildAtomFeed", () => {
  const xml = buildAtomFeed();

  it("returns an Atom 1.0 XML document", () => {
    expect(xml.startsWith("<?xml version=\"1.0\" encoding=\"utf-8\"?>")).toBe(
      true,
    );
    expect(xml).toContain("<feed xmlns=\"http://www.w3.org/2005/Atom\"");
  });

  it("contains the analysis articles, portfolio, and event entries", () => {
    expect(xml).toContain("/analysis/margin-ratio-temperature");
    expect(xml).toContain("/analysis/vix-threshold-sp500");
    expect(xml).toContain("/analysis/temperature-divergence");
    expect(xml).toContain("/portfolio");
    // 14 イベント全件が含まれている
    expect(xml).toContain("/events/reiwa-black-monday-2024");
    expect(xml).toContain("/events/covid-crash-nikkei-2020");
  });

  it("has a self link pointing to /feed.xml", () => {
    expect(xml).toMatch(
      /<link rel="self" type="application\/atom\+xml" href="[^"]+\/feed\.xml"\/>/,
    );
  });

  it("escapes XML-sensitive characters in entry titles", () => {
    // "S&P500" のようにアンパサンドがエスケープされていること
    expect(xml).not.toMatch(/<title>[^<]*S&P500/);
    expect(xml).toContain("S&amp;P500");
  });

  it("emits ISO datetime values for published/updated", () => {
    expect(xml).toMatch(/<published>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(xml).toMatch(/<updated>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
