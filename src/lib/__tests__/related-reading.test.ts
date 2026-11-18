import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { LEARN_ARTICLES, latestLearnModifiedAt } from "../learn-articles";
import {
  ANALYSIS_READINGS,
  ROTATING_COUNT,
  buildStockRelatedReading,
  rotatingPool,
} from "../related-reading";
import { getEventsMeta } from "../events";
import { getStockCodes } from "../stock-temperature";
import sitemap from "../../app/sitemap";

const APP_DIR = join(__dirname, "../../app");

describe("LEARN_ARTICLES", () => {
  it("/learn 配下の記事ページと 1 対 1 で対応する", () => {
    const dirs = readdirSync(join(APP_DIR, "learn"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(LEARN_ARTICLES.map((a) => a.slug).sort()).toEqual(dirs);
  });

  it("公開日・更新日が各記事ページの PUBLISHED_AT / MODIFIED_AT と一致する", () => {
    for (const a of LEARN_ARTICLES) {
      const src = readFileSync(join(APP_DIR, "learn", a.slug, "page.tsx"), "utf-8");
      const published = src.match(/const PUBLISHED_AT = "([\d-]+)"/)?.[1];
      const modified = src.match(/const MODIFIED_AT = "([\d-]+)"/)?.[1] ?? published;
      expect({ slug: a.slug, publishedAt: a.publishedAt, modifiedAt: a.modifiedAt }).toEqual({
        slug: a.slug,
        publishedAt: published,
        modifiedAt: modified,
      });
    }
  });

  it("latestLearnModifiedAt は最も新しい更新日を返す", () => {
    const max = [...LEARN_ARTICLES.map((a) => a.modifiedAt)].sort().at(-1);
    expect(latestLearnModifiedAt()).toBe(max);
  });
});

describe("ANALYSIS_READINGS", () => {
  it("/analysis 配下の記事ページと 1 対 1 で対応する", () => {
    const dirs = readdirSync(join(APP_DIR, "analysis"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `/analysis/${d.name}`)
      .sort();
    expect(ANALYSIS_READINGS.map((r) => r.href).sort()).toEqual(dirs);
  });
});

describe("buildStockRelatedReading", () => {
  const events = getEventsMeta();

  it("定番 3 本 + 銘柄ごとの 3 本を、重複なく返す", () => {
    const links = buildStockRelatedReading("7203", events);
    expect(links).toHaveLength(3 + ROTATING_COUNT);
    expect(new Set(links.map((l) => l.href)).size).toBe(links.length);
    expect(links.slice(0, 3).map((l) => l.href)).toEqual([
      "/learn/when-to-buy-stocks",
      "/learn/what-is-fear-greed",
      "/analysis/sector-rotation-temperature",
    ]);
  });

  it("同じ銘柄コードなら毎回同じ記事を返す", () => {
    expect(buildStockRelatedReading("6758", events)).toEqual(
      buildStockRelatedReading("6758", events)
    );
  });

  it("日経225 の全銘柄で、候補の記事すべてに 1 本以上のリンクが張られる", () => {
    const counts = new Map<string, number>();
    for (const code of getStockCodes()) {
      for (const l of buildStockRelatedReading(code, events).slice(3)) {
        counts.set(l.href, (counts.get(l.href) ?? 0) + 1);
      }
    }
    for (const r of rotatingPool(events)) {
      expect(counts.get(r.href) ?? 0, r.href).toBeGreaterThan(0);
    }
  });
});

describe("sitemap の lastModified", () => {
  const entries = sitemap();
  const byPath = new Map(
    entries.map((e) => [new URL(e.url).pathname, e.lastModified as Date | undefined])
  );

  it("解説記事は各記事の更新日になる", () => {
    for (const a of LEARN_ARTICLES) {
      expect(byPath.get(`/learn/${a.slug}`)?.toISOString().slice(0, 10)).toBe(a.modifiedAt);
    }
  });

  it("更新日を管理していない固定ページには付けない", () => {
    for (const p of ["/about", "/glossary", "/widget", "/guide", "/alerts"]) {
      expect(byPath.has(p), p).toBe(true);
      expect(byPath.get(p), p).toBeUndefined();
    }
  });

  it("イベント記事は公開日になり、デプロイ日にはならない", () => {
    const today = new Date().toISOString().slice(0, 10);
    const eventDates = [...byPath.entries()]
      .filter(([p]) => p.startsWith("/events/"))
      .map(([, d]) => d?.toISOString().slice(0, 10));
    expect(eventDates.length).toBe(getEventsMeta().length);
    expect(eventDates.every((d) => d != null && d <= today)).toBe(true);
  });
});
