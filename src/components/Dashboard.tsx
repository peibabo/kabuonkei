"use client";

import { useMarketData } from "./dashboard/useMarketData";
import LoadingView from "./dashboard/LoadingView";
import ErrorView from "./dashboard/ErrorView";
import DashboardHeader from "./dashboard/DashboardHeader";
import DashboardFooter from "./dashboard/DashboardFooter";
import DashboardSection from "./dashboard/DashboardSection";
import TemperatureSection from "./dashboard/TemperatureSection";
import TrendSection from "./dashboard/TrendSection";
import StatsSection from "./dashboard/StatsSection";
import PersonalizedHintCard from "./PersonalizedHintCard";
import CrossStatsCard from "./CrossStatsCard";
import SectorHeatmapCard from "./SectorHeatmapCard";
import PortfolioTeaserCard from "./PortfolioTeaserCard";
import SimilarDaysSection from "./dashboard/SimilarDaysSection";
import JapanMarketSection from "./dashboard/JapanMarketSection";
import MarketDataSection from "./dashboard/MarketDataSection";
import AlertBanner from "./alerts/AlertBanner";
import HeadlineHero from "./hero/HeadlineHero";
import TemperatureTiles from "./hero/TemperatureTiles";

export default function Dashboard() {
  const { data, loading, error } = useMarketData();

  if (loading) return <LoadingView />;
  if (error || !data)
    return <ErrorView message={error ?? "データを取得できませんでした"} />;

  const japanScore = data.japanFearGreed?.score ?? null;
  const usScore = data.fearGreed.score;

  // 昨日比: US は CNN の previousClose、JP は直近スナップショットからの差分
  const usDelta = usScore - data.fearGreed.previousClose;
  const jpDelta =
    japanScore != null && data.previousJapanScore != null
      ? japanScore - data.previousJapanScore
      : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <DashboardHeader lastUpdated={data.lastUpdated} />

      <AlertBanner japanScore={japanScore} usScore={usScore} />

      {/* 朝刊風ヒーロー（B 案）: 見出し */}
      <HeadlineHero
        jp={japanScore}
        us={usScore}
        jpDelta={jpDelta}
        usDelta={usDelta}
        jpStreak={data.japanLevelStreak}
      />

      {/* サービスの肝: 株温計＝温度計 (半円ゲージ × 2) を直下に */}
      <DashboardSection
        id="now"
        emoji="🌡️"
        title="今の温度"
        description="日本・米国の温度計と、直近の動き"
      >
        <TemperatureSection
          japanFearGreed={data.japanFearGreed}
          fearGreed={data.fearGreed}
        />
        <TemperatureTiles
          jp={japanScore}
          us={usScore}
          jpDelta={jpDelta}
          usDelta={usDelta}
          jpSparkline={data.japanSparkline}
          usSparkline={data.usSparkline}
        />
      </DashboardSection>

      <DashboardSection
        id="similar"
        emoji="🔁"
        title="今日の類似日"
        description="今の温度に最も近かった過去の日と、その後の動き"
      >
        <SimilarDaysSection japanScore={japanScore} usScore={usScore} />
      </DashboardSection>

      <DashboardSection
        id="trend"
        emoji="📈"
        title="温度の推移"
        description="直近〜10年の温度スコアの時系列"
      >
        <TrendSection
          japanScore={japanScore ?? 50}
          vixChart={data.volatility[0]?.chart ?? []}
          usScore={usScore}
        />
      </DashboardSection>

      <DashboardSection
        id="stats"
        emoji="📊"
        title="過去の傾向"
        description="この温度帯だった時の、過去の将来リターン"
      >
        <StatsSection japanScore={japanScore} usScore={usScore} />
      </DashboardSection>

      <DashboardSection
        id="hint"
        emoji="👤"
        title="あなたへのヒント"
        description="投資スタイル別の読み方と次のアクション"
      >
        <PersonalizedHintCard japanScore={japanScore} usScore={usScore} />
      </DashboardSection>

      <DashboardSection
        id="deep"
        emoji="🔍"
        title="詳しく見る"
        description="温度×他市場のクロス分析と業種ヒートマップ"
      >
        <CrossStatsCard japanScore={japanScore} usScore={usScore} />
        <SectorHeatmapCard japanScore={japanScore} />
        <PortfolioTeaserCard />
      </DashboardSection>

      <DashboardSection
        id="data"
        emoji="📉"
        title="市場の生データ"
        description="需給・指数・債券・為替・コモディティの最新値"
      >
        <JapanMarketSection />
        <MarketDataSection
          volatility={data.volatility}
          indices={data.indices}
          bonds={data.bonds}
          forex={data.forex}
          commodities={data.commodities}
        />
      </DashboardSection>

      <DashboardFooter />
    </div>
  );
}
