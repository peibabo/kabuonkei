import JapanTemperatureTrendCard from "../JapanTemperatureTrendCard";
import TemperatureTrendCard from "../TemperatureTrendCard";
import FearGreedGauge from "../FearGreedGauge";
import { getSentimentLevel } from "@/lib/sentiment";
import type {
  ChartPoint,
  FearGreedData,
  JapanFearGreedData,
} from "@/lib/types";

export default function TrendSection({
  japanFearGreed,
  fearGreed,
  vixChart,
}: {
  japanFearGreed: JapanFearGreedData | null;
  fearGreed: FearGreedData;
  vixChart: ChartPoint[];
}) {
  const usLevelLabel = getSentimentLevel(fearGreed.score);
  const japanScore = japanFearGreed?.score ?? 50;
  const usScore = fearGreed.score;

  return (
    <div className="space-y-6">
      {/* 半円ゲージ 2 列（旧 TemperatureSection から降格して同居） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {japanFearGreed && (
          <FearGreedGauge
            market="jp"
            data={japanFearGreed}
            title="🇯🇵 市場温度（日本）"
            partnerScore={fearGreed.score}
            partnerLevel={usLevelLabel}
          />
        )}
        <FearGreedGauge
          market="us"
          data={fearGreed}
          title="🇺🇸 Fear & Greed（米国）"
          partnerScore={japanFearGreed?.score ?? null}
          partnerLevel={japanFearGreed?.level ?? null}
        />
      </div>

      {/* 推移チャート */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JapanTemperatureTrendCard currentScore={japanScore} />
        <TemperatureTrendCard vixChart={vixChart} currentScore={usScore} />
      </div>
    </div>
  );
}
