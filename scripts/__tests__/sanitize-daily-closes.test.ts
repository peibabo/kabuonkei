import { describe, it, expect } from "vitest";
import { sanitizeDailyCloses, type DailyClose } from "../_lib/shared";

/** value の定常系列に日付を振る */
function series(values: number[], startDay = 1): DailyClose[] {
  return values.map((close, i) => ({
    date: `2026-03-${String(startDay + i).padStart(2, "0")}`,
    close,
  }));
}

describe("sanitizeDailyCloses", () => {
  it("実例: 1629.T 型の 1/500 グリッチ（2日連続）を除去する", () => {
    // 2026-03-30/31 に 288円 → 0.57/0.55円 で返った実例の再現
    const entries = series([
      288.1, 287.5, 289.0, 288.6, 0.5676, 0.5498, 288.7, 289.2, 288.0, 287.9,
    ]);
    const { kept, dropped } = sanitizeDailyCloses(entries);
    expect(dropped.map((d) => d.close)).toEqual([0.5676, 0.5498]);
    expect(kept).toHaveLength(8);
  });

  it("実例: 1306.T 型の 1/10 グリッチを除去する", () => {
    const entries = series([
      382.7, 383.0, 384.1, 37.64, 37.14, 383.5, 382.9, 384.0, 383.2, 382.5,
    ]);
    const { dropped } = sanitizeDailyCloses(entries);
    expect(dropped.map((d) => d.close)).toEqual([37.64, 37.14]);
  });

  it("正常な暴落（令和のブラックマンデー級 1日 -12%）は除去しない", () => {
    const entries = series([
      38100, 35900, 31458, 34675, 35089, 34831, 35000, 35200,
    ]);
    const { dropped } = sanitizeDailyCloses(entries);
    expect(dropped).toHaveLength(0);
  });

  it("コロナショック級の連続下落（1ヶ月で -30%）も除去しない", () => {
    // 緩やかに 3 割下がる系列
    const values = Array.from({ length: 25 }, (_, i) => 24000 * (1 - 0.013 * i));
    const { dropped } = sanitizeDailyCloses(series(values));
    expect(dropped).toHaveLength(0);
  });

  it("系列端（先頭・末尾）のグリッチも窓が縮んだ状態で検出できる", () => {
    const head = series([0.55, 288.0, 288.5, 289.0, 288.2, 287.8]);
    expect(sanitizeDailyCloses(head).dropped.map((d) => d.close)).toEqual([
      0.55,
    ]);
    const tail = series([288.0, 288.5, 289.0, 288.2, 287.8, 0.55]);
    expect(sanitizeDailyCloses(tail).dropped.map((d) => d.close)).toEqual([
      0.55,
    ]);
  });

  it("0 以下の終値は破棄する", () => {
    const entries = series([288.0, 0, 288.5, -1, 289.0, 288.2]);
    const { dropped } = sanitizeDailyCloses(entries);
    expect(dropped.map((d) => d.close)).toEqual([0, -1]);
  });

  it("空配列は空のまま返す", () => {
    const { kept, dropped } = sanitizeDailyCloses([]);
    expect(kept).toEqual([]);
    expect(dropped).toEqual([]);
  });
});
