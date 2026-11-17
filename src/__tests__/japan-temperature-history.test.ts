import { describe, it, expect } from "vitest";
import {
  getJapanHistory,
  previousScoreBefore,
  sliceByDays,
  type JapanTempPoint,
} from "@/lib/japan-temperature-history";

describe("getJapanHistory", () => {
  it("日付昇順で、0〜100 のスコアを持つ", () => {
    const history = getJapanHistory();
    expect(history.length).toBeGreaterThan(1000);
    for (let i = 1; i < history.length; i++) {
      expect(history[i].date > history[i - 1].date).toBe(true);
    }
    expect(history.every((p) => p.score >= 0 && p.score <= 100)).toBe(true);
  });
});

describe("previousScoreBefore", () => {
  const history: JapanTempPoint[] = [
    { date: "2026-11-12", score: 25 },
    { date: "2026-11-13", score: 27 },
    { date: "2026-11-16", score: 19 },
  ];

  it("立会日より前の最後の記録を返す（17 時以降で当日分が記録済みでも前営業日と比べる）", () => {
    expect(previousScoreBefore(history, "2026-11-16")).toBe(27);
  });

  it("当日分がまだ記録されていなければ直近の記録", () => {
    expect(previousScoreBefore(history, "2026-11-17")).toBe(19);
  });

  it("それより前の記録がなければ null", () => {
    expect(previousScoreBefore(history, "2026-11-12")).toBeNull();
    expect(previousScoreBefore([], "2026-11-12")).toBeNull();
  });
});

describe("sliceByDays", () => {
  const points: JapanTempPoint[] = [
    { date: "2026-01-01", score: 40 },
    { date: "2026-02-01", score: 45 },
    { date: "2026-03-01", score: 50 },
    { date: "2026-04-01", score: 55 },
  ];

  it("末尾から指定日数分を切り出す", () => {
    // 末尾は2026-04-01、60日前は2026-01-31 → 2/1以降の3件
    const result = sliceByDays(points, 60);
    expect(result).toHaveLength(3);
    expect(result[0].date).toBe("2026-02-01");
  });

  it("全期間より長い日数を指定すれば全件返る", () => {
    expect(sliceByDays(points, 10000)).toHaveLength(4);
  });

  it("空配列を渡せば空配列を返す", () => {
    expect(sliceByDays([], 30)).toEqual([]);
  });
});
