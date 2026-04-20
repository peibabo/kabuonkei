"use client";

import FearGreedGauge from "./FearGreedGauge";
import VolatilityCard from "./VolatilityCard";
import IndicesCard from "./IndicesCard";
import BondForexCard from "./BondForexCard";
import CommodityCard from "./CommodityCard";
import HistoricalStatsCard from "./HistoricalStatsCard";
import TemperatureTrendCard from "./TemperatureTrendCard";
import JapanTemperatureTrendCard from "./JapanTemperatureTrendCard";
import SimilarDaysCard from "./SimilarDaysCard";
import InvestorTradingCard from "./InvestorTradingCard";
import ArbitrageBalanceCard from "./ArbitrageBalanceCard";
import MarginTradingCard from "./MarginTradingCard";
import { useMarketData } from "./dashboard/useMarketData";
import LoadingView from "./dashboard/LoadingView";
import ErrorView from "./dashboard/ErrorView";
import DashboardHeader from "./dashboard/DashboardHeader";
import DashboardFooter from "./dashboard/DashboardFooter";
import {
  getLatestInvestorTrading,
  getForeignInvestorNetHistory,
  getLatestArbitrageBalance,
  getArbitrageBuyBalanceHistory,
  getLatestMarginTrading,
  getMarginRatioHistory,
} from "@/lib/japan-market-data";
import {
  findSimilarDays,
  getJapanSimilarDaysFile,
  getMarketEvents,
  getUsSimilarDaysFile,
} from "@/lib/similar-days";

export default function Dashboard() {
  const { data, loading, error } = useMarketData();

  if (loading) return <LoadingView />;
  if (error || !data)
    return <ErrorView message={error ?? "データを取得できませんでした"} />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <DashboardHeader lastUpdated={data.lastUpdated} />

      {/* メインゲージ（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {data.japanFearGreed && (
          <FearGreedGauge
            market="jp"
            data={data.japanFearGreed}
            title="🇯🇵 市場温度（日本）"
          />
        )}
        <FearGreedGauge
          market="us"
          data={data.fearGreed}
          title="🇺🇸 Fear & Greed（米国）"
        />
      </div>

      {/* 温度の推移チャート（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <JapanTemperatureTrendCard
          currentScore={data.japanFearGreed?.score ?? 50}
        />
        <TemperatureTrendCard
          vixChart={data.volatility[0]?.chart ?? []}
          currentScore={data.fearGreed.score}
        />
      </div>

      {/* 過去の統計（日本版 / 米国版 2列配置） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {data.japanFearGreed && (
          <HistoricalStatsCard
            market="jp"
            currentScore={data.japanFearGreed.score}
          />
        )}
        <HistoricalStatsCard market="us" currentScore={data.fearGreed.score} />
      </div>

      {/* 今日の類似日（日本版 / 米国版 2列配置） */}
      {(() => {
        const events = getMarketEvents();
        const japanFile = getJapanSimilarDaysFile();
        const usFile = getUsSimilarDaysFile();
        const japanScore = data.japanFearGreed?.score ?? null;
        const usScore = data.fearGreed.score;
        const japanMatches =
          japanScore != null
            ? findSimilarDays(japanScore, japanFile.daily, events, 5)
            : [];
        const usMatches = findSimilarDays(usScore, usFile.daily, events, 5);
        if (japanMatches.length === 0 && usMatches.length === 0) return null;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {japanScore != null && japanMatches.length > 0 && (
              <SimilarDaysCard
                title="🇯🇵 今日の類似日（日本版）"
                subtitle="今日の温度に最も近かった過去の日と、その後の日経225"
                currentScore={japanScore}
                similarDays={japanMatches}
                marketLabel="日経225"
                dataRangeFrom={japanFile.dataRange.from}
                dataRangeTo={japanFile.dataRange.to}
              />
            )}
            {usMatches.length > 0 && (
              <SimilarDaysCard
                title="🇺🇸 今日の類似日（米国版）"
                subtitle="今日の温度に最も近かった過去の日と、その後のS&P500"
                currentScore={usScore}
                similarDays={usMatches}
                marketLabel="S&P500"
                dataRangeFrom={usFile.dataRange.from}
                dataRangeTo={usFile.dataRange.to}
              />
            )}
          </div>
        );
      })()}

      {/* 投資主体別売買動向 + 裁定残 + 信用倍率 */}
      {(() => {
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
      })()}

      {/* ボラティリティ + 主要指数 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <VolatilityCard data={data.volatility} />
        <IndicesCard data={data.indices} />
      </div>

      {/* 金利・為替 + コモディティ・暗号資産 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <BondForexCard bonds={data.bonds} forex={data.forex} />
        <CommodityCard data={data.commodities} />
      </div>

      <DashboardFooter />
    </div>
  );
}
