import japanData from "@/data/japan-similar-days.json";
import usData from "@/data/us-similar-days.json";
import type { SimilarDayEntry, SimilarDaysFile } from "./types";
import { getEventsAsDateMap } from "./events";

export { findSimilarDays } from "./similar-days/find";

export function getJapanSimilarDays(): SimilarDayEntry[] {
  return (japanData as SimilarDaysFile).daily;
}

export function getUsSimilarDays(): SimilarDayEntry[] {
  return (usData as SimilarDaysFile).daily;
}

export function getJapanSimilarDaysFile(): SimilarDaysFile {
  return japanData as SimilarDaysFile;
}

export function getUsSimilarDaysFile(): SimilarDaysFile {
  return usData as SimilarDaysFile;
}

/** 類似日カード向けに `date → ラベル` の辞書を返す。実体は `events-meta.json`。 */
export function getMarketEvents(): Record<string, string> {
  return getEventsAsDateMap();
}
