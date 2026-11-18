import { describe, it, expect } from "vitest";
import { findSimilarDays } from "../similar-days";
import type { SimilarDayEntry } from "../types";

const baseEntry: Omit<SimilarDayEntry, "date" | "score"> = {
  return1m: 1.0,
  return3m: 2.0,
  return6m: 3.0,
};

describe("findSimilarDays", () => {
  it("空配列を渡したら空配列を返す", () => {
    expect(findSimilarDays(50, [], {})).toEqual([]);
  });

  it("return3m が null のエントリは除外される", () => {
    const history: SimilarDayEntry[] = [
      {
        date: "2024-01-01",
        score: 50,
        return1m: 1,
        return3m: null,
        return6m: null,
      },
      { date: "2023-01-01", score: 48, ...baseEntry },
    ];
    const result = findSimilarDays(50, history, {});
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2023-01-01");
  });

  it("スコア差が小さい順に並ぶ", () => {
    const history: SimilarDayEntry[] = [
      { date: "2020-01-01", score: 80, ...baseEntry },
      { date: "2021-01-01", score: 40, ...baseEntry },
      { date: "2022-01-01", score: 55, ...baseEntry },
      { date: "2023-01-01", score: 50, ...baseEntry },
    ];
    const result = findSimilarDays(50, history, {});
    expect(result.map((r) => r.date)).toEqual([
      "2023-01-01",
      "2022-01-01",
      "2021-01-01",
      "2020-01-01",
    ]);
    expect(result[0].scoreDiff).toBe(0);
  });

  it("スコア差が同率の場合はイベントラベル付きが優先される", () => {
    const history: SimilarDayEntry[] = [
      { date: "2019-03-10", score: 45, ...baseEntry },
      { date: "2020-03-19", score: 45, ...baseEntry },
    ];
    const events = { "2020-03-19": "コロナショック日経底" };
    const result = findSimilarDays(50, history, events);
    expect(result[0].date).toBe("2020-03-19");
    expect(result[0].eventLabel).toBe("コロナショック日経底");
    expect(result[1].date).toBe("2019-03-10");
    expect(result[1].eventLabel).toBeUndefined();
  });

  it("スコア差もラベルも同じなら新しい日付が優先される", () => {
    const history: SimilarDayEntry[] = [
      { date: "2019-03-10", score: 45, ...baseEntry },
      { date: "2023-03-10", score: 45, ...baseEntry },
    ];
    const result = findSimilarDays(50, history, {});
    expect(result[0].date).toBe("2023-03-10");
    expect(result[1].date).toBe("2019-03-10");
  });

  it("TOP N で件数が制限される", () => {
    const history: SimilarDayEntry[] = Array.from({ length: 20 }, (_, i) => ({
      // 同じ局面の除外（30 日以内）にかからないよう 2 ヶ月おきの日付にする
      date: new Date(Date.UTC(2020, i * 2, 1)).toISOString().slice(0, 10),
      score: 50 + i,
      ...baseEntry,
    }));
    const result = findSimilarDays(50, history, {}, 3);
    expect(result).toHaveLength(3);
  });

  it("選んだ日から 30 日以内の日は同じ局面として除外する", () => {
    const history: SimilarDayEntry[] = [
      { date: "2025-04-22", score: 16, ...baseEntry },
      { date: "2025-04-21", score: 16, ...baseEntry },
      { date: "2025-04-03", score: 16, ...baseEntry },
      { date: "2025-05-20", score: 15, ...baseEntry },
      { date: "2020-05-07", score: 16, ...baseEntry },
      { date: "2020-03-01", score: 14, ...baseEntry },
    ];
    const result = findSimilarDays(16, history, {}, 5);
    expect(result.map((r) => r.date)).toEqual([
      "2025-04-22",
      "2020-05-07",
      "2020-03-01",
    ]);
  });

  it("同じ局面にラベルつきの日があれば、温度差 +2 以内ならそちらを代表にする", () => {
    const history: SimilarDayEntry[] = [
      { date: "2020-03-09", score: 5, ...baseEntry },
      { date: "2020-03-19", score: 7, ...baseEntry },
      { date: "2020-03-23", score: 9, ...baseEntry },
    ];
    const events = { "2020-03-19": "コロナショック", "2020-03-23": "別ラベル" };
    const result = findSimilarDays(5, history, events, 5);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2020-03-19");
    expect(result[0].eventLabel).toBe("コロナショック");
  });

  it("ラベルつきの日でも温度差が離れすぎていれば差し替えない", () => {
    const history: SimilarDayEntry[] = [
      { date: "2020-03-09", score: 5, ...baseEntry },
      { date: "2020-03-19", score: 9, ...baseEntry },
    ];
    const result = findSimilarDays(5, history, { "2020-03-19": "コロナショック" }, 5);
    expect(result.map((r) => r.date)).toEqual(["2020-03-09"]);
  });

  it("31 日離れていれば別の局面として残す", () => {
    const history: SimilarDayEntry[] = [
      { date: "2025-01-01", score: 50, ...baseEntry },
      { date: "2025-02-01", score: 50, ...baseEntry },
    ];
    const result = findSimilarDays(50, history, {}, 5);
    expect(result).toHaveLength(2);
  });

  it("scoreDiff フィールドが正しく計算される", () => {
    const history: SimilarDayEntry[] = [
      { date: "2023-01-01", score: 30, ...baseEntry },
      { date: "2023-02-01", score: 70, ...baseEntry },
    ];
    const result = findSimilarDays(50, history, {});
    expect(result[0].scoreDiff).toBe(20);
    expect(result[1].scoreDiff).toBe(20);
  });
});
