/**
 * 投資部門別売買状況（週次・二市場）の過去の推移（scripts/update-investor-flow-history.ts が作る）。
 * 集計（scripts/_lib/learn-extra-stats.ts）でだけ使い、画面からは直接読まない。
 */

export interface InvestorFlowWeek {
  startDate: string;
  endDate: string;
  /** 海外投資家の売買差引（億円、+ が買い越し） */
  foreign: number;
  /** 個人（現金 + 信用）の売買差引（億円） */
  individual: number;
}

export interface InvestorFlowHistory {
  source: string;
  unit: string;
  weeks: InvestorFlowWeek[];
}
