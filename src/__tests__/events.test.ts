import { describe, it, expect } from "vitest";
import {
  getEventsMeta,
  getEventBySlug,
  getEventsAsDateMap,
  getEnrichedEntry,
} from "@/lib/events";
import { findSimilarDays, getMarketEvents } from "@/lib/similar-days";
import type { SimilarDayEntry } from "@/lib/types";

describe("getEventsMeta", () => {
  it("returns all 14 events", () => {
    const events = getEventsMeta();
    expect(events).toHaveLength(14);
  });

  it("each event has required fields", () => {
    for (const e of getEventsMeta()) {
      expect(e.slug).toMatch(/^[a-z0-9-]+$/);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.label.length).toBeGreaterThan(0);
      expect(e.oneLiner.length).toBeGreaterThan(0);
    }
  });

  it("each event has a non-empty longDescription (SEO 本文)", () => {
    for (const e of getEventsMeta()) {
      expect(e.longDescription, `event ${e.slug} missing longDescription`).toBeDefined();
      expect(e.longDescription!.length).toBeGreaterThan(200);
      // 3段落構成の想定（\n\n で区切り2箇所以上）
      expect(e.longDescription!.split("\n\n").length).toBeGreaterThanOrEqual(3);
    }
  });

  it("slugs are unique", () => {
    const slugs = getEventsMeta().map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("dates are unique", () => {
    const dates = getEventsMeta().map((e) => e.date);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe("getEventBySlug", () => {
  it("returns event for valid slug", () => {
    const e = getEventBySlug("reiwa-black-monday-2024");
    expect(e).not.toBeNull();
    expect(e?.date).toBe("2024-08-05");
    expect(e?.label).toBe("令和のブラックマンデー");
  });

  it("returns null for invalid slug", () => {
    expect(getEventBySlug("nonexistent")).toBeNull();
    expect(getEventBySlug("")).toBeNull();
  });
});

describe("getEventsAsDateMap", () => {
  it("returns date -> label map with 14 entries", () => {
    const map = getEventsAsDateMap();
    expect(Object.keys(map)).toHaveLength(14);
    expect(map["2024-08-05"]).toBe("令和のブラックマンデー");
    expect(map["2020-03-19"]).toBe("コロナショック日経底");
  });
});

describe("getEnrichedEntry", () => {
  it("returns null for slug when enriched file is empty", () => {
    // events-enriched.json はプレースホルダ状態、生成前はすべて null
    const result = getEnrichedEntry("reiwa-black-monday-2024");
    // CI 環境では enriched 生成済みの可能性もあるので、null または形状で判定
    if (result !== null) {
      expect(result.slug).toBe("reiwa-black-monday-2024");
      expect(result.jp).toBeDefined();
      expect(result.us).toBeDefined();
    }
  });
});

describe("REGRESSION: findSimilarDays output parity after market-events.json removal", () => {
  // 旧 market-events.json が持っていた 14 件の date → label 辞書（ベースライン）
  const LEGACY_MARKET_EVENTS: Record<string, string> = {
    "2015-08-24": "チャイナショック",
    "2016-01-20": "日銀マイナス金利導入",
    "2016-06-24": "Brexit翌日",
    "2016-11-09": "トランプ当選",
    "2018-02-05": "ボラティリティショック",
    "2018-12-24": "クリスマス暴落",
    "2020-03-19": "コロナショック日経底",
    "2020-03-23": "コロナショックS&P底",
    "2020-11-09": "ワクチン期待ラリー",
    "2022-06-13": "インフレ懸念ピーク",
    "2022-10-13": "インフレ鈍化サイン",
    "2023-03-13": "SVB破綻",
    "2024-08-05": "令和のブラックマンデー",
    "2024-11-06": "トランプ再選",
  };

  it("getMarketEvents() returns the same 14 entries as the legacy JSON", () => {
    const current = getMarketEvents();
    expect(current).toEqual(LEGACY_MARKET_EVENTS);
  });

  it("findSimilarDays output matches legacy behavior on representative scores", () => {
    // 簡易的な履歴データ: イベント日を含む複数エントリ
    const history: SimilarDayEntry[] = [
      { date: "2024-08-05", score: 10, return1m: 5.2, return3m: 8.1, return6m: 12.4 },
      { date: "2020-03-19", score: 12, return1m: 6.3, return3m: 15.0, return6m: 28.0 },
      { date: "2020-03-23", score: 14, return1m: 10.0, return3m: 20.0, return6m: 35.0 },
      { date: "2018-02-05", score: 20, return1m: -1.0, return3m: 2.0, return6m: 5.0 },
      { date: "2017-06-15", score: 50, return1m: 0.5, return3m: 1.5, return6m: 3.0 },
      { date: "2019-05-10", score: 65, return1m: 2.0, return3m: 4.0, return6m: 6.0 },
    ];

    for (const targetScore of [10, 30, 50, 80]) {
      const legacyResult = findSimilarDays(
        targetScore,
        history,
        LEGACY_MARKET_EVENTS,
        5,
      );
      const currentResult = findSimilarDays(
        targetScore,
        history,
        getMarketEvents(),
        5,
      );
      expect(currentResult).toEqual(legacyResult);
    }
  });
});
