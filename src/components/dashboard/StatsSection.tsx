import HistoricalStatsCard from "../HistoricalStatsCard";

export default function StatsSection({
  japanScore,
  usScore,
}: {
  japanScore: number | null;
  usScore: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {japanScore != null && (
        <HistoricalStatsCard market="jp" currentScore={japanScore} />
      )}
      <HistoricalStatsCard market="us" currentScore={usScore} />
    </div>
  );
}
