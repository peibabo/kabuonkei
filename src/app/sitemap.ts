import type { MetadataRoute } from "next";
import { getEventsMeta } from "@/lib/events";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";
import { getDivergenceAnalysis } from "@/lib/divergence-analysis";
import { getPortfolioHistory } from "@/lib/portfolio";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  const now = new Date();

  const eventRoutes: MetadataRoute.Sitemap = getEventsMeta().map((e) => ({
    url: `${siteUrl}/events/${e.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  // 分析記事は月次で再生成されるので lastModified には generatedAt を使う
  const marginAnalysis = getMarginRatioAnalysis();
  const marginAnalysisModified = new Date(marginAnalysis.generatedAt);
  const vixAnalysis = getVixSp500Analysis();
  const vixAnalysisModified = new Date(vixAnalysis.generatedAt);
  const divergenceAnalysis = getDivergenceAnalysis();
  const divergenceAnalysisModified = new Date(divergenceAnalysis.generatedAt);
  const analysisIndexModified = new Date(
    Math.max(
      marginAnalysisModified.getTime(),
      vixAnalysisModified.getTime(),
      divergenceAnalysisModified.getTime()
    )
  );
  const portfolio = getPortfolioHistory();
  const portfolioModified = new Date(portfolio.generatedAt);

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/glossary`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/widget`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/events`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guide`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guide/nisa-tsumitate`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guide/short-term-trader`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guide/fire-long-term`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/analysis`,
      lastModified: analysisIndexModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/learn`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/learn/what-is-vix`,
      lastModified: new Date("2026-04-28"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/learn/what-is-fear-greed`,
      lastModified: new Date("2026-04-28"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/analysis/margin-ratio-temperature`,
      lastModified: marginAnalysisModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/analysis/vix-threshold-sp500`,
      lastModified: vixAnalysisModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/analysis/temperature-divergence`,
      lastModified: divergenceAnalysisModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/portfolio`,
      lastModified: portfolioModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...eventRoutes,
  ];
}
