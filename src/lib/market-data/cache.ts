/**
 * 汎用 TTL メモリキャッシュ。
 * Date.now を差し替えできるよう factory 化し、テストで時間を制御できる形に分離。
 */
export interface MemoCache<T> {
  get(): T | null;
  set(value: T): void;
  invalidate(): void;
}

export function createMemoCache<T>(
  ttlMs: number,
  now: () => number = Date.now,
): MemoCache<T> {
  let cached: T | null = null;
  let timestamp = 0;

  return {
    get() {
      if (cached == null) return null;
      if (now() - timestamp >= ttlMs) return null;
      return cached;
    },
    set(value: T) {
      cached = value;
      timestamp = now();
    },
    invalidate() {
      cached = null;
      timestamp = 0;
    },
  };
}
