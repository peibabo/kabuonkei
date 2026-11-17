// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  MA_WINDOW,
  computeJapanTemperatureSeries,
} from "../_lib/japan-temperature";
import { computeJapanFearGreed } from "../../src/lib/japan-fear-greed";

/** 2024-01-01 から n 日分の終値 Map */
function closes(values: number[]): Map<string, number> {
  const start = new Date("2024-01-01T00:00:00Z");
  return new Map(
    values.map((v, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return [d.toISOString().slice(0, 10), v];
    }),
  );
}

describe("computeJapanTemperatureSeries", () => {
  it("先頭 125 日は MA が取れないので出さない", () => {
    const series = computeJapanTemperatureSeries(closes(Array(130).fill(30000)));
    expect(series).toHaveLength(130 - MA_WINDOW);
    expect(series[0].score).toBe(50);
  });

  it("当日を含まない直前 125 日の平均と比べる（-15% で 0、+15% で 100）", () => {
    const down = computeJapanTemperatureSeries(closes([...Array(125).fill(30000), 25500]));
    expect(down.at(-1)).toEqual({ date: "2024-05-05", score: 0, nikkei: 25500 });
    const up = computeJapanTemperatureSeries(closes([...Array(125).fill(30000), 34500]));
    expect(up.at(-1)?.score).toBe(100);
  });

  it("移動平均は 1 日ずつずれる（古い日が窓から抜ける）", () => {
    // 先頭 1 日だけ 0 円。126 日目の MA には含まれるが 127 日目には含まれない
    const values = [0, ...Array(124).fill(30000), 30000, 30000];
    const series = computeJapanTemperatureSeries(closes(values));
    expect(series[0].score).toBeGreaterThan(50);
    expect(series[1].score).toBe(50);
  });

  it("ライブ計算（computeJapanFearGreed）と同じ終値列なら毎日同じスコアになる", () => {
    // 上下にゆらぐ 300 日分の終値
    const values = Array.from({ length: 300 }, (_, i) =>
      Math.round(30000 * (1 + 0.12 * Math.sin(i / 17) + 0.03 * Math.cos(i / 3))),
    );
    const map = closes(values);
    const dates = [...map.keys()];
    const series = computeJapanTemperatureSeries(map);
    for (const p of series) {
      const i = dates.indexOf(p.date);
      // ライブはその日までのチャート（末尾 = 当日）と当日の現在値を受け取る
      const chart = dates.slice(0, i + 1).map((d) => ({ date: d, value: map.get(d)! }));
      const live = computeJapanFearGreed({
        nikkei225Chart: chart,
        nikkei225Price: map.get(p.date)!,
        investorTrading: null,
        marginTrading: null,
      });
      expect(live?.score).toBe(p.score);
    }
  });
});
