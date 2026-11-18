import type { MetadataRoute } from "next";
import { getEventPublishedAt, getEventsMeta } from "@/lib/events";
import { LEARN_ARTICLES, latestLearnModifiedAt } from "@/lib/learn-articles";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";
import { getVixSp500Analysis } from "@/lib/vix-sp500-analysis";
import { getDivergenceAnalysis } from "@/lib/divergence-analysis";
import { getPortfolioHistory } from "@/lib/portfolio";
import { getJapanSectorHeatmap } from "@/lib/japan-sector-heatmap";
import {
  getNikkeiCrashAnalysis,
  NIKKEI_CRASH_ARTICLE,
} from "@/lib/nikkei-crash-analysis";
import { getStockCodes, getStockTemperatureFile } from "@/lib/stock-temperature";

/** 利用規約・プライバシーポリシーの最終改定日（各ページの「最終改定日」と揃える） */
const TERMS_REVISED_AT = "2026-04-23";
const PRIVACY_REVISED_AT = "2026-11-17";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kabuonkei.com";
  const now = new Date();

  // lastModified は内容が実際に変わった日にする。デプロイのたびに全ページを「今日更新」にすると
  // Google が lastmod を信用しなくなるため、更新日を管理していない固定ページには付けない
  const events = getEventsMeta();
  const latestEventPublishedAt = new Date(
    events.map(getEventPublishedAt).sort().at(-1) ?? "2026-04-19"
  );
  const eventRoutes: MetadataRoute.Sitemap = events.map((e) => ({
    url: `${siteUrl}/events/${e.slug}`,
    lastModified: new Date(getEventPublishedAt(e)),
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  const learnRoutes: MetadataRoute.Sitemap = LEARN_ARTICLES.map((a) => ({
    url: `${siteUrl}/learn/${a.slug}`,
    lastModified: new Date(a.modifiedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 銘柄別温度は毎営業日再生成されるので generatedAt を使う
  const stockModified = new Date(getStockTemperatureFile().generatedAt);
  const stockRoutes: MetadataRoute.Sitemap = [
    { path: "/stock", priority: 0.7 },
    { path: "/ranking", priority: 0.7 },
    ...getStockCodes().map((code) => ({ path: `/stock/${code}`, priority: 0.5 })),
  ].map(({ path, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified: stockModified,
    changeFrequency: "daily",
    priority,
  }));

  // 分析記事は月次で再生成されるので lastModified には generatedAt を使う
  const marginAnalysis = getMarginRatioAnalysis();
  const marginAnalysisModified = new Date(marginAnalysis.generatedAt);
  const vixAnalysis = getVixSp500Analysis();
  const vixAnalysisModified = new Date(vixAnalysis.generatedAt);
  const divergenceAnalysis = getDivergenceAnalysis();
  const divergenceAnalysisModified = new Date(divergenceAnalysis.generatedAt);
  const portfolio = getPortfolioHistory();
  const portfolioModified = new Date(portfolio.generatedAt);
  // セクターヒートマップは毎月1日に再生成されるので generatedAt を使う
  const sectorHeatmap = getJapanSectorHeatmap();
  const sectorHeatmapModified = new Date(sectorHeatmap.generatedAt);
  const crashAnalysisModified = new Date(getNikkeiCrashAnalysis().generatedAt);
  const analysisIndexModified = new Date(
    Math.max(
      marginAnalysisModified.getTime(),
      vixAnalysisModified.getTime(),
      divergenceAnalysisModified.getTime(),
      sectorHeatmapModified.getTime(),
      crashAnalysisModified.getTime()
    )
  );

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/glossary`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/widget`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/events`,
      lastModified: latestEventPublishedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guide`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/guide/nisa-tsumitate`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guide/short-term-trader`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guide/fire-long-term`,
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
      lastModified: new Date(latestLearnModifiedAt()),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...learnRoutes,
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
      url: `${siteUrl}/analysis/sector-rotation-temperature`,
      lastModified: sectorHeatmapModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}${NIKKEI_CRASH_ARTICLE.path}`,
      lastModified: crashAnalysisModified,
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
      url: `${siteUrl}/sectors`,
      lastModified: sectorHeatmapModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/alerts`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: new Date(TERMS_REVISED_AT),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(PRIVACY_REVISED_AT),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...eventRoutes,
    ...stockRoutes,
  ];
}
