import FearGreedGauge from "../FearGreedGauge";
import type { FearGreedData, JapanFearGreedData } from "@/lib/types";

export default function TemperatureSection({
  japanFearGreed,
  fearGreed,
}: {
  japanFearGreed: JapanFearGreedData | null;
  fearGreed: FearGreedData;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {japanFearGreed && (
        <FearGreedGauge
          market="jp"
          data={japanFearGreed}
          title="🇯🇵 市場温度（日本）"
        />
      )}
      <FearGreedGauge
        market="us"
        data={fearGreed}
        title="🇺🇸 Fear & Greed（米国）"
      />
    </div>
  );
}
