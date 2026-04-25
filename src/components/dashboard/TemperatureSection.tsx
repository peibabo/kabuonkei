import FearGreedGauge from "../FearGreedGauge";
import { getSentimentLevel } from "@/lib/sentiment";
import type { FearGreedData, JapanFearGreedData } from "@/lib/types";

/**
 * 半円ゲージ × 2（日米）。トップ画面ヒーロー直下の「🌡 今の温度」章で
 * 株温計＝温度計のメインビジュアルとして表示する。
 */
export default function TemperatureSection({
  japanFearGreed,
  fearGreed,
}: {
  japanFearGreed: JapanFearGreedData | null;
  fearGreed: FearGreedData;
}) {
  const usLevelLabel = getSentimentLevel(fearGreed.score);
  return (
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
  );
}
