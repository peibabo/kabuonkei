/** 投資主体別売買動向: 各主体の売買差引 */
export interface InvestorTradingEntity {
  name: string; // "海外投資家" | "個人" | "信託銀行" | "投資信託" | "事業法人"
  netAmount: number; // 差引き（買越=正、売越=負）（億円）
}

/** 投資主体別売買動向: 週次データ */
export interface InvestorTradingWeek {
  weekLabel: string; // "2026年4月第2週"
  startDate: string; // "2026-04-06"
  endDate: string; // "2026-04-10"
  entities: InvestorTradingEntity[];
}

/** 投資主体別売買動向: 全体 */
export interface InvestorTradingData {
  generatedAt: string;
  weeks: InvestorTradingWeek[];
}

/** 裁定残: 日次データ */
export interface ArbitrageBalanceDay {
  date: string; // 報告日 "2026-04-14"
  buyBalance: number; // 裁定買い残（百万株）
  sellBalance: number; // 裁定売り残（百万株）
}

/** 裁定残: 全体 */
export interface ArbitrageBalanceData {
  generatedAt: string;
  daily: ArbitrageBalanceDay[];
}

/** 信用取引残高: 週次データ */
export interface MarginTradingWeek {
  date: string; // 申込日 "2026-04-10"
  buyBalance: number; // 信用買い残（億円）
  sellBalance: number; // 信用売り残（億円）
  ratio: number; // 信用倍率 = buyBalance / sellBalance
}

/** 信用取引残高: 全体 */
export interface MarginTradingData {
  generatedAt: string;
  weekly: MarginTradingWeek[];
}

/** 日本市場データ: 投資主体別 + 裁定残 + 信用倍率をまとめた型 */
export interface JapanMarketData {
  investorTrading: InvestorTradingData;
  arbitrageBalance: ArbitrageBalanceData;
  marginTrading: MarginTradingData;
}
