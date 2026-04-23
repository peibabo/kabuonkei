/**
 * 温度連動バーチャルポートフォリオの静的 JSON アクセサ。
 *
 * 生成は `npm run generate:portfolio-history` / `npm run snapshot:portfolio` 側。
 * ここでは型定義とバンド lookup / 期間切出のみ提供する。
 */

import portfolioData from "@/data/portfolio-history.json";
import type { SentimentLevel } from "./types";

export type PortfolioMarket = "jp" | "us";

export interface PortfolioDailyPoint {
  date: string;
  nav: number;
  benchmark: number;
  equityRatio: number;
  score: number | null;
}

export interface PortfolioTrade {
  date: string;
  score: number;
  band: SentimentLevel;
  fromEquityRatio: number;
  toEquityRatio: number;
  navBefore: number;
}

export interface PortfolioStats {
  totalReturn: number;
  benchmarkReturn: number;
  alpha: number;
  cagr: number;
  benchmarkCagr: number;
  maxDrawdown: number;
  benchmarkMaxDrawdown: number;
  sharpe: number;
  benchmarkSharpe: number;
}

export interface PortfolioCurrent {
  date: string;
  score: number | null;
  band: string;
  equityRatio: number;
  cashRatio: number;
  nav: number;
  benchmark: number;
}

export interface PortfolioSection {
  equitySymbol: string;
  displayName: string;
  daily: PortfolioDailyPoint[];
  trades: PortfolioTrade[];
  stats: PortfolioStats;
  current: PortfolioCurrent;
}

export interface PortfolioBand {
  level: SentimentLevel;
  scoreRange: [number, number];
  equityRatio: number;
}

export interface PortfolioHistory {
  generatedAt: string;
  dataRange: { from: string; to: string };
  rule: {
    bands: PortfolioBand[];
    rebalance: string;
    cashYield: number;
    fees: number;
    initialNav: number;
  };
  portfolios: {
    jp: PortfolioSection;
    us: PortfolioSection;
  };
}

/** JSON 全体を返す（SSR 側で読み込み、Client に渡す） */
export function getPortfolioHistory(): PortfolioHistory {
  return portfolioData as unknown as PortfolioHistory;
}

/** 市場別セクションを返す */
export function getPortfolioSection(
  market: PortfolioMarket
): PortfolioSection {
  return getPortfolioHistory().portfolios[market];
}

/** スコアから温度帯ルールを lookup */
export function resolveBandByScore(
  score: number,
  bands: PortfolioBand[]
): PortfolioBand {
  for (const b of bands) {
    if (score >= b.scoreRange[0] && score <= b.scoreRange[1]) return b;
  }
  return bands[bands.length - 1];
}

/**
 * 指定日数分だけ末尾を切り出す。カレンダー日ベース。
 * 履歴が短ければ全量返す。
 */
export function slicePortfolioDailyByDays(
  daily: PortfolioDailyPoint[],
  days: number
): PortfolioDailyPoint[] {
  if (daily.length === 0) return [];
  const lastDate = daily[daily.length - 1].date;
  const cutoff = new Date(lastDate);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return daily.filter((p) => p.date >= cutoffStr);
}

/** 現在の温度バンドに対応する目標株比率を返す（score が null なら最新ルール値） */
export function targetRatioForScore(
  score: number | null,
  bands: PortfolioBand[]
): number {
  if (score == null) return bands[Math.floor(bands.length / 2)].equityRatio;
  return resolveBandByScore(score, bands).equityRatio;
}
