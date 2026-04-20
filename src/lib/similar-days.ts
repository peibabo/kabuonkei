import japanData from "@/data/japan-similar-days.json";
import usData from "@/data/us-similar-days.json";
import eventData from "@/data/market-events.json";
import type { SimilarDayEntry, SimilarDaysFile } from "./types";

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

export function getMarketEvents(): Record<string, string> {
  return eventData as Record<string, string>;
}
