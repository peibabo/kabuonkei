import Link from "next/link";
import SimilarDaysCard from "../SimilarDaysCard";
import {
  findSimilarDays,
  getJapanSimilarDaysFile,
  getMarketEvents,
  getUsSimilarDaysFile,
} from "@/lib/similar-days";
import { getEventsMeta } from "@/lib/events";
import type { SimilarDayMatch } from "@/lib/types";

function enrichWithSlug(
  matches: SimilarDayMatch[],
  dateToSlug: Map<string, string>,
): SimilarDayMatch[] {
  return matches.map((m) =>
    m.eventLabel ? { ...m, eventSlug: dateToSlug.get(m.date) } : m,
  );
}

export default function SimilarDaysSection({
  japanScore,
  usScore,
}: {
  japanScore: number | null;
  usScore: number;
}) {
  const events = getMarketEvents();
  const japanFile = getJapanSimilarDaysFile();
  const usFile = getUsSimilarDaysFile();
  const dateToSlug = new Map(
    getEventsMeta().map((e) => [e.date, e.slug] as const),
  );
  const japanMatches = enrichWithSlug(
    japanScore != null
      ? findSimilarDays(japanScore, japanFile.daily, events, 5)
      : [],
    dateToSlug,
  );
  const usMatches = enrichWithSlug(
    findSimilarDays(usScore, usFile.daily, events, 5),
    dateToSlug,
  );

  if (japanMatches.length === 0 && usMatches.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <p className="mt-3 text-sm text-gray-600 text-right">
        <Link
          href="/events?ref=similar_days_footer"
          className="underline hover:text-gray-900"
        >
          過去の主要イベント一覧（14件）→
        </Link>
      </p>
    </div>
  );
}
