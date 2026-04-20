import InvestorTradingCard from "../InvestorTradingCard";
import ArbitrageBalanceCard from "../ArbitrageBalanceCard";
import MarginTradingCard from "../MarginTradingCard";
import {
  getLatestInvestorTrading,
  getForeignInvestorNetHistory,
  getLatestArbitrageBalance,
  getArbitrageBuyBalanceHistory,
  getLatestMarginTrading,
  getMarginRatioHistory,
} from "@/lib/japan-market-data";

export default function JapanMarketSection() {
  const latestInvestor = getLatestInvestorTrading();
  const foreignHistory = getForeignInvestorNetHistory();
  const latestArbitrage = getLatestArbitrageBalance();
  const buyHistory = getArbitrageBuyBalanceHistory();
  const latestMargin = getLatestMarginTrading();
  const marginHistory = getMarginRatioHistory();

  if (!latestInvestor && !latestArbitrage && !latestMargin) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      {latestInvestor && (
        <InvestorTradingCard
          latest={latestInvestor}
          foreignHistory={foreignHistory}
        />
      )}
      {latestArbitrage && (
        <ArbitrageBalanceCard
          latest={latestArbitrage}
          buyHistory={buyHistory}
        />
      )}
      {latestMargin && (
        <MarginTradingCard
          latest={latestMargin}
          ratioHistory={marginHistory}
        />
      )}
    </div>
  );
}
