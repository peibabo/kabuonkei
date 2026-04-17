import type {
  JapanMarketData,
  InvestorTradingData,
  InvestorTradingWeek,
  ArbitrageBalanceData,
  ArbitrageBalanceDay,
  MarginTradingData,
  MarginTradingWeek,
  ChartPoint,
} from "./types";
import rawData from "@/data/japan-market-data.json";

const data = rawData as unknown as JapanMarketData;

// --- 投資主体別売買動向 ---

export function getInvestorTradingData(): InvestorTradingData {
  return data.investorTrading;
}

export function getLatestInvestorTrading(): InvestorTradingWeek | undefined {
  const weeks = data.investorTrading.weeks;
  return weeks[weeks.length - 1];
}

/** 海外投資家の週次ネット売買推移（チャート用） */
export function getForeignInvestorNetHistory(): ChartPoint[] {
  return data.investorTrading.weeks.map((week) => {
    const foreign = week.entities.find((e) => e.name === "海外投資家");
    return {
      date: week.endDate,
      value: foreign?.netAmount ?? 0,
    };
  });
}

// --- 裁定残 ---

export function getArbitrageBalanceData(): ArbitrageBalanceData {
  return data.arbitrageBalance;
}

export function getLatestArbitrageBalance(): ArbitrageBalanceDay | undefined {
  const daily = data.arbitrageBalance.daily;
  return daily[daily.length - 1];
}

/** 裁定買い残の日次推移（チャート用） */
export function getArbitrageBuyBalanceHistory(): ChartPoint[] {
  return data.arbitrageBalance.daily.map((day) => ({
    date: day.date,
    value: day.buyBalance,
  }));
}

// --- 信用倍率 ---

export function getMarginTradingData(): MarginTradingData {
  return data.marginTrading;
}

export function getLatestMarginTrading(): MarginTradingWeek | undefined {
  const weekly = data.marginTrading.weekly;
  return weekly[weekly.length - 1];
}

/** 信用倍率の週次推移（チャート用） */
export function getMarginRatioHistory(): ChartPoint[] {
  return data.marginTrading.weekly.map((week) => ({
    date: week.date,
    value: week.ratio,
  }));
}
