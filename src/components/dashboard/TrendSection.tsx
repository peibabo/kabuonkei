import JapanTemperatureTrendCard from "../JapanTemperatureTrendCard";
import TemperatureTrendCard from "../TemperatureTrendCard";
import type { ChartPoint } from "@/lib/types";

export default function TrendSection({
  japanScore,
  vixChart,
  usScore,
}: {
  japanScore: number;
  vixChart: ChartPoint[];
  usScore: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <JapanTemperatureTrendCard currentScore={japanScore} />
      <TemperatureTrendCard vixChart={vixChart} currentScore={usScore} />
    </div>
  );
}
