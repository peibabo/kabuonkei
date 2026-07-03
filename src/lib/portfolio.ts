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
  /** 一括買い持ちベンチマーク */
  benchmark: number;
  /** 月次積立（DCA）ベンチマーク */
  benchmarkDca: number;
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
  /** 一括買い持ち */
  benchmarkReturn: number;
  /** 温度ルール vs 一括買い持ち */
  alpha: number;
  cagr: number;
  benchmarkCagr: number;
  maxDrawdown: number;
  benchmarkMaxDrawdown: number;
  sharpe: number;
  benchmarkSharpe: number;
  /** 積立（DCA）ベンチマーク */
  dcaReturn: number;
  dcaCagr: number;
  dcaMaxDrawdown: number;
  dcaSharpe: number;
  /** 温度ルール vs 積立 */
  alphaVsDca: number;
}

export interface PortfolioCurrent {
  date: string;
  score: number | null;
  band: string;
  equityRatio: number;
  cashRatio: number;
  nav: number;
  benchmark: number;
  /** 月次積立 NAV。過去の JSON には存在しない可能性あり */
  benchmarkDca?: number;
}

export interface PortfolioCashYieldScenario {
  cashYield: number;
  label: string;
  stats: PortfolioStats;
}

/**
 * 温度信号の寄与度分析: 同じ平均株比率を持つ「定数配分」と温度ルールを比較し、
 * α vs DCA のうち「温度信号 timing に依るもの」と「単に株比率が高いこと」を分離する。
 * α vs DCA は両者の足し算だが、現実には後者が支配的になるケースもある。
 */
export interface PortfolioTemperatureContribution {
  /** 温度ルールの実現平均株比率（日次 equityRatio の平均） */
  avgEquityRatio: number;
  /** 同じ平均株比率を定数で持ち続けた場合の stats */
  constantStats: PortfolioStats;
  /** 温度ルール total − 定数 total（pp。正なら温度信号がリターンに寄与） */
  alphaVsConstant: number;
  /** 温度ルール maxDD − 定数 maxDD（pp。どちらも負値なので、負なら温度ルールのほうが DD が深い＝悪化） */
  ddVsConstant: number;
  /** 温度ルール Sharpe − 定数 Sharpe */
  sharpeVsConstant: number;
}

export interface PortfolioSection {
  equitySymbol: string;
  displayName: string;
  daily: PortfolioDailyPoint[];
  trades: PortfolioTrade[];
  stats: PortfolioStats;
  current: PortfolioCurrent;
  /** 現金金利の感度分析。古い JSON には存在しない可能性があるので optional */
  cashYieldSensitivity?: PortfolioCashYieldScenario[];
  /** 温度信号の純寄与度（古い JSON には存在しない可能性があるので optional） */
  temperatureContribution?: PortfolioTemperatureContribution;
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
