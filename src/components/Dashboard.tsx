"use client";

import { useMarketData } from "./dashboard/useMarketData";
import LoadingView from "./dashboard/LoadingView";
import ErrorView from "./dashboard/ErrorView";
import DashboardHeader from "./dashboard/DashboardHeader";
import DashboardFooter from "./dashboard/DashboardFooter";
import TemperatureSection from "./dashboard/TemperatureSection";
import TrendSection from "./dashboard/TrendSection";
import StatsSection from "./dashboard/StatsSection";
import PersonalizedHintCard from "./PersonalizedHintCard";
import CrossStatsCard from "./CrossStatsCard";
import SimilarDaysSection from "./dashboard/SimilarDaysSection";
import JapanMarketSection from "./dashboard/JapanMarketSection";
import MarketDataSection from "./dashboard/MarketDataSection";

export default function Dashboard() {
  const { data, loading, error } = useMarketData();

  if (loading) return <LoadingView />;
  if (error || !data)
    return <ErrorView message={error ?? "データを取得できませんでした"} />;

  const japanScore = data.japanFearGreed?.score ?? null;
  const usScore = data.fearGreed.score;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <DashboardHeader lastUpdated={data.lastUpdated} />
      <TemperatureSection
        japanFearGreed={data.japanFearGreed}
        fearGreed={data.fearGreed}
      />
      <TrendSection
        japanScore={japanScore ?? 50}
        vixChart={data.volatility[0]?.chart ?? []}
        usScore={usScore}
      />
      <StatsSection japanScore={japanScore} usScore={usScore} />
      <PersonalizedHintCard japanScore={japanScore} usScore={usScore} />
      <CrossStatsCard japanScore={japanScore} usScore={usScore} />
      <SimilarDaysSection japanScore={japanScore} usScore={usScore} />
      <JapanMarketSection />
      <MarketDataSection
        volatility={data.volatility}
        indices={data.indices}
        bonds={data.bonds}
        forex={data.forex}
        commodities={data.commodities}
      />
      <DashboardFooter />
    </div>
  );
}
