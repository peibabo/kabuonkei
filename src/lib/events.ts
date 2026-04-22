import metaData from "@/data/events-meta.json";
import enrichedData from "@/data/events-enriched.json";
import type {
  EventMeta,
  EventEnrichedEntry,
  EventEnrichedFile,
} from "./types";

export function getEventsMeta(): EventMeta[] {
  return metaData as EventMeta[];
}

export function getEventBySlug(slug: string): EventMeta | null {
  return (metaData as EventMeta[]).find((e) => e.slug === slug) ?? null;
}

/** findSimilarDays 向けの `date → label` 辞書を events-meta.json から合成する */
export function getEventsAsDateMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of metaData as EventMeta[]) {
    map[e.date] = e.label;
  }
  return map;
}

export function getEnrichedEntry(slug: string): EventEnrichedEntry | null {
  const file = enrichedData as EventEnrichedFile;
  return file.entries.find((e) => e.slug === slug) ?? null;
}
