import metaData from "@/data/events-meta.json";
import enrichedData from "@/data/events-enriched.json";
import type {
  EventMeta,
  EventEnrichedEntry,
  EventEnrichedFile,
} from "./types";

/** イベント詳細ページの既定公開日。events-meta.json で `publishedAt` 未指定時のフォールバック。
 * サイト本体のリリース日 (2026-04-19) を採用。 */
export const EVENTS_DEFAULT_PUBLISHED_AT = "2026-04-19";

export function getEventsMeta(): EventMeta[] {
  return metaData as EventMeta[];
}

export function getEventBySlug(slug: string): EventMeta | null {
  return (metaData as EventMeta[]).find((e) => e.slug === slug) ?? null;
}

/** イベントページの公開日。`publishedAt` 未指定なら既定値を返す */
export function getEventPublishedAt(event: EventMeta): string {
  return event.publishedAt ?? EVENTS_DEFAULT_PUBLISHED_AT;
}

/**
 * 関連イベントを最大 limit 件返す。
 * `relatedSlugs` が設定されていればそれを優先し、不足分は日付近接で補完する。
 * 自分自身は除外。
 */
export function getRelatedEvents(slug: string, limit = 3): EventMeta[] {
  const all = getEventsMeta();
  const self = all.find((e) => e.slug === slug);
  if (!self) return [];

  const others = all.filter((e) => e.slug !== slug);
  const result: EventMeta[] = [];
  const seen = new Set<string>();

  // 1. 手動キュレーション分を先に
  for (const relatedSlug of self.relatedSlugs ?? []) {
    if (seen.has(relatedSlug)) continue;
    const found = others.find((e) => e.slug === relatedSlug);
    if (found) {
      result.push(found);
      seen.add(relatedSlug);
      if (result.length >= limit) return result;
    }
  }

  // 2. 不足分を日付近接で補完
  const selfTime = new Date(self.date).getTime();
  const byProximity = [...others]
    .filter((e) => !seen.has(e.slug))
    .sort((a, b) => {
      const da = Math.abs(new Date(a.date).getTime() - selfTime);
      const db = Math.abs(new Date(b.date).getTime() - selfTime);
      return da - db;
    });
  for (const e of byProximity) {
    result.push(e);
    if (result.length >= limit) break;
  }
  return result;
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
