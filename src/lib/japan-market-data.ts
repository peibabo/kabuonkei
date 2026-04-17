import type {
  JapanMarketData,
  InvestorTradingData,
  InvestorTradingWeek,
  ArbitrageBalanceData,
  ArbitrageBalanceDay,
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
