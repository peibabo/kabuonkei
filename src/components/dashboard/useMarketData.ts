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
 */
export function useMarketData(): UseMarketDataResult {
  const [data, setData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
