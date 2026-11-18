"use client";

import { useEffect, useState } from "react";
import type { MarketData } from "@/lib/types";

const POLL_INTERVAL_MS = 15 * 60 * 1000;

export interface UseMarketDataResult {
  data: MarketData | null;
  loading: boolean;
  error: string | null;
}

/**
 * `/api/market` から MarketData を取得する hook。
 * 初回マウント時に 1 回取得し、以降 15 分ごとに再取得する。
 * unmount 時に interval をクリア。
 *
 * `initialData` を渡すと（トップページのサーバー描画）、それを最初から表示して
 * 初回の取得を省き、15 分ごとの再取得だけを行う。
 */
export function useMarketData(
  initialData: MarketData | null = null,
): UseMarketDataResult {
  const [data, setData] = useState<MarketData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialData == null);
  const hasInitialData = initialData != null;

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      try {
        const res = await fetch("/api/market");
        if (!res.ok) throw new Error("データの取得に失敗しました");
        const json = (await res.json()) as MarketData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "予期せぬエラーが発生しました",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (!hasInitialData) fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasInitialData]);

  return { data, loading, error };
}
