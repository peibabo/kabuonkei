import { describe, it, expect } from "vitest";
import { buildWebSiteJsonLd } from "@/lib/website-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumb-jsonld";
import { buildDatasetJsonLd } from "@/lib/dataset-jsonld";
import { getRelatedEvents, getEventPublishedAt } from "@/lib/events";

describe("buildWebSiteJsonLd", () => {
  it("returns valid JSON containing WebSite and Organization graph", () => {
    const raw = buildWebSiteJsonLd();
    const parsed = JSON.parse(raw);
    expect(parsed["@context"]).toBe("https://schema.org");
    const types = (parsed["@graph"] as Array<{ "@type": string }>).map(
      (n) => n["@type"],
    );
    expect(types).toContain("WebSite");
    expect(types).toContain("Organization");
  });

  it("WebSite node references Organization via publisher @id", () => {
    const parsed = JSON.parse(buildWebSiteJsonLd()) as {
      "@graph": Array<Record<string, unknown>>;
    };
    const website = parsed["@graph"].find((n) => n["@type"] === "WebSite");
    const organization = parsed["@graph"].find(
      (n) => n["@type"] === "Organization",
    );
    expect(website).toBeDefined();
    expect(organization).toBeDefined();
    expect((website?.publisher as { "@id": string })["@id"]).toBe(
      organization?.["@id"],
    );
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("emits ListItem entries with sequential positions", () => {
    const raw = buildBreadcrumbJsonLd([
      { name: "ホーム", path: "/" },
      { name: "イベント", path: "/events" },
      { name: "コロナショック" },
    ]);
    const parsed = JSON.parse(raw) as {
      "@type": string;
      itemListElement: Array<{ position: number; name: string; item?: string }>;
    };
    expect(parsed["@type"]).toBe("BreadcrumbList");
    expect(parsed.itemListElement).toHaveLength(3);
    expect(parsed.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
  });

  it("omits item URL on the final (current page) entry", () => {
    const parsed = JSON.parse(
      buildBreadcrumbJsonLd([
        { name: "ホーム", path: "/" },
        { name: "現在ページ" },
      ]),
    ) as { itemListElement: Array<{ item?: string }> };
    expect(parsed.itemListElement[0].item).toBeDefined();
    expect(parsed.itemListElement[1].item).toBeUndefined();
  });
});

describe("buildDatasetJsonLd", () => {
  it("returns a Dataset node with absolute URL and organization creator", () => {
    const raw = buildDatasetJsonLd({
      url: "/sectors",
      name: "テストデータセット",
      description: "説明",
      dateModified: "2026-07-03",
      temporalCoverage: { from: "2016-07-03", to: "2026-07-03" },
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Dataset");
    expect(parsed.url).toMatch(/^https?:\/\/.+\/sectors$/);
    expect(parsed.dateModified).toBe("2026-07-03");
    expect(parsed.temporalCoverage).toBe("2016-07-03/2026-07-03");
    expect((parsed.creator as { "@type": string })["@type"]).toBe(
      "Organization",
    );
  });

  it("omits temporalCoverage when not provided", () => {
    const parsed = JSON.parse(
      buildDatasetJsonLd({
        url: "https://example.com/data",
        name: "n",
        description: "d",
        dateModified: "2026-01-01",
      }),
    ) as Record<string, unknown>;
    expect(parsed.temporalCoverage).toBeUndefined();
    expect(parsed.url).toBe("https://example.com/data");
  });
});

describe("getRelatedEvents", () => {
  it("returns up to 3 events excluding the source", () => {
    const related = getRelatedEvents("reiwa-black-monday-2024", 3);
    expect(related).toHaveLength(3);
    expect(related.every((e) => e.slug !== "reiwa-black-monday-2024")).toBe(
      true,
    );
  });

  it("returns empty array for unknown slug", () => {
    expect(getRelatedEvents("nonexistent-slug")).toEqual([]);
  });

  it("falls back to closest dates when relatedSlugs is unset", () => {
    // covid-crash-nikkei-2020 (2020-03-19) のとき、
    // 最も近いはずの covid-crash-sp500-2020 (2020-03-23) が含まれる
    const related = getRelatedEvents("covid-crash-nikkei-2020", 3);
    const slugs = related.map((e) => e.slug);
    expect(slugs).toContain("covid-crash-sp500-2020");
  });
});

describe("getEventPublishedAt", () => {
  it("returns the explicit publishedAt when present", () => {
    expect(
      getEventPublishedAt({
        slug: "x",
        date: "2024-01-01",
        label: "x",
        oneLiner: "x",
        publishedAt: "2026-05-01",
      }),
    ).toBe("2026-05-01");
  });

  it("falls back to default when publishedAt is unset", () => {
    expect(
      getEventPublishedAt({
        slug: "x",
        date: "2024-01-01",
        label: "x",
        oneLiner: "x",
      }),
    ).toBe("2026-04-19");
  });
});
