export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function mapToScore(
  value: number,
  fear: number,
  greed: number
): number {
  const raw = ((value - fear) / (greed - fear)) * 100;
  return Math.round(clamp(raw, 0, 100));
}
