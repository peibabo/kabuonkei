import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMarketData } from "../useMarketData";
import type { MarketData } from "@/lib/types";

const sample = { lastUpdated: "2026-11-18 16:00:00 JST" } as unknown as MarketData;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useMarketData", () => {
  it("initialData があれば最初から表示し、初回の取得はしない", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useMarketData(sample));
    expect(result.current).toEqual({ data: sample, loading: false, error: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("initialData が無ければ /api/market から取得する", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sample,
    });
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useMarketData());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith("/api/market");
    expect(result.current.data).toEqual(sample);
  });
});
