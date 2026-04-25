import type { AlertFireDecision, AlertState } from "@/lib/types";

export const COLD_THRESHOLD = 20;
export const HOT_THRESHOLD = 80;
export const COLD_HYSTERESIS = 25;
export const HOT_HYSTERESIS = 75;

export function computeCurrentState(
  prev: AlertState,
  score: number
): AlertState {
  if (score <= COLD_THRESHOLD) return "cold";
  if (score >= HOT_THRESHOLD) return "hot";
  if (prev === "cold" && score < COLD_HYSTERESIS) return "cold";
  if (prev === "hot" && score > HOT_HYSTERESIS) return "hot";
  return "neutral";
}

export function shouldFire(
  prev: AlertState,
  curr: AlertState
): AlertFireDecision {
  if (curr === "neutral") return { fire: false, kind: null };
  if (prev === curr) return { fire: false, kind: null };
  return { fire: true, kind: curr };
}

export function parseStoredState(raw: string | null | undefined): AlertState {
  if (raw === "cold" || raw === "hot" || raw === "neutral") return raw;
  return "neutral";
}
