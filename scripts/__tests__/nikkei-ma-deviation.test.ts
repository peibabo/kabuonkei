// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeNikkeiMaDeviationAnalysis } from "../_lib/nikkei-ma-deviation";
import { computeJapanTemperatureSeries, computeTrailingMa125 } from "../_lib/japan-temperature";
import analysisJson from "../../src/data/nikkei-ma-deviation-analysis.json";
import {
  classifyDeviation,
  DEVIATION_BANDS,
  deviationToTemperature,
  type NikkeiMaDeviationAnalysis,
} from "../../src/lib/nikkei-ma-deviation-analysis";

/** 2000-01-01 から n 日分の終値 Map */
function closes(values: number[]): Map<string, number> {
  const start = new Date("2000-01-01T00:00:00Z");
  return new Map(
    values.map((v, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return [d.toISOString().slice(0, 10), v];
    })
  );
}

const OPTS = { generatedAt: "2026-11-20" };

describe("classifyDeviation", () => {
  it("下側は境界を含めて低い側、上側は境界を含めて高い側に入れる", () => {
    expect(classifyDeviation(-15)).toBe("le-15");
    expect(classifyDeviation(-14.9)).toBe("-15to-10");
    expect(classifyDeviation(-10)).toBe("-15to-10");
    expect(classifyDeviation(-5)).toBe("-10to-5");
    expect(classifyDeviation(-4.9)).toBe("-5to5");
    expect(classifyDeviation(4.9)).toBe("-5to5");
    expect(classifyDeviation(5)).toBe("5to10");
    expect(classifyDeviation(10)).toBe("10to15");
    expect(classifyDeviation(15)).toBe("ge15");
  });
});

describe("deviationToTemperature", () => {
  it("−15% が 0、0% が 50、+15% が 100（市場温度と同じ式）", () => {
    expect(deviationToTemperature(-15)).toBe(0);
    expect(deviationToTemperature(-20)).toBe(0);
    expect(deviationToTemperature(0)).toBe(50);
    expect(deviationToTemperature(15)).toBe(100);
    expect(deviationToTemperature(-9.5)).toBe(18);
  });
});

describe("computeNikkeiMaDeviationAnalysis", () => {
  it("当日を含まない直前 125 日の平均と比べ、乖離率が取れる日だけを数える", () => {
    const values = [...Array(125).fill(100), 80, ...Array(10).fill(100)];
    const a = computeNikkeiMaDeviationAnalysis(closes(values), OPTS);
    expect(a.dayCount).toBe(11);
    expect(a.dataRange.from).toBe([...closes(values).keys()][125]);
    // 126 日目（80）は 100 の平均と比べて −20%
    expect(a.lowEpisodes).toHaveLength(1);
    expect(a.lowEpisodes[0].deviation).toBe(-20);
  });

  it("±閾値を超えた日は 20 営業日以内なら 1 回にまとめ、21 営業日あけば別の回にする", () => {
    const values = [...Array(125).fill(100), 80];
    for (let i = 0; i < 19; i++) values.push(100);
    values.push(82); // 前の該当日から 20 営業日後 → 同じ回
    for (let i = 0; i < 20; i++) values.push(100);
    values.push(83); // 21 営業日後 → 別の回
    for (let i = 0; i < 300; i++) values.push(100);
    const a = computeNikkeiMaDeviationAnalysis(closes(values), OPTS);
    expect(a.lowEpisodes).toHaveLength(2);
    expect(a.lowEpisodes[0].deviation).toBe(-20);
    expect(a.lowEpisodes[1].deviation).toBeLessThanOrEqual(-15);
  });

  it("前方リターン・その後の最安値を計算し、未経過の期間は null にする", () => {
    const values = [...Array(125).fill(100), 80, ...Array(5).fill(70), ...Array(30).fill(96)];
    const a = computeNikkeiMaDeviationAnalysis(closes(values), OPTS);
    const e = a.lowEpisodes[0];
    expect(e.returns["1m"]).toBe(20);
    expect(e.returns["3m"]).toBeNull();
    expect(e.maxFurtherDrawdown).toBe(-12.5);
    expect(e.daysToLow).toBe(1);
    expect(e.isComplete).toBe(false);
  });

  it("日数をちょうど半分に分け、前半と後半の件数の合計が全体と一致する", () => {
    const values: number[] = [];
    for (let i = 0; i < 800; i++) values.push(100 + 10 * Math.sin(i / 20));
    const a = computeNikkeiMaDeviationAnalysis(closes(values), OPTS);
    for (const b of a.bands) {
      expect(b.firstHalf["1m"].sampleSize + b.secondHalf["1m"].sampleSize).toBe(
        b.all["1m"].sampleSize
      );
    }
    const total = a.bands.reduce((s, b) => s + b.all["1m"].sampleSize, 0);
    expect(total).toBe(a.baseline.all["1m"].sampleSize);
  });
});

describe("computeTrailingMa125", () => {
  it("先頭 125 日は null、その後は当日を含まない直前 125 日の平均", () => {
    const values = [...Array(125).fill(100), 200, 50];
    const ma = computeTrailingMa125(values);
    expect(ma.slice(0, 125).every((m) => m === null)).toBe(true);
    expect(ma[125]).toBe(100);
    // 126 日目の平均は 2〜126 日目（100 × 124 + 200）/ 125
    expect(ma[126]).toBeCloseTo((100 * 124 + 200) / 125);
  });

  it("市場温度の系列と乖離率の分析が同じ平均を使う", () => {
    const values: number[] = [];
    for (let i = 0; i < 300; i++) values.push(100 + 8 * Math.sin(i / 15));
    const m = closes(values);
    const temps = computeJapanTemperatureSeries(m);
    const a = computeNikkeiMaDeviationAnalysis(m, OPTS);
    expect(a.latest.temperature).toBe(temps.at(-1)!.score);
  });
});

describe("latest（いまの乖離率）", () => {
  it("区切りは丸める前の値で決める（+4.96% は 5.0 と表示しても −5%〜+5% に入れる）", () => {
    const values = [...Array(126).fill(100), 104.96];
    const a = computeNikkeiMaDeviationAnalysis(closes(values), OPTS);
    expect(a.latest.deviation).toBe(5);
    expect(a.latest.bandKey).toBe("-5to5");
  });
});

describe("nikkei-ma-deviation-analysis.json（生成済みデータ）", () => {
  const a = analysisJson as NikkeiMaDeviationAnalysis;

  it("必須フィールドがそろい、区切りは定義どおりの順番", () => {
    expect(a.maWindow).toBe(125);
    expect(a.dayCount).toBeGreaterThan(9000);
    expect(a.bands.map((b) => b.key)).toEqual(DEVIATION_BANDS.map((b) => b.key));
    expect(a.halfSplitDate > a.dataRange.from).toBe(true);
    expect(a.halfSplitDate < a.dataRange.to).toBe(true);
  });

  it("各回の乖離率は閾値を超えていて、日付は昇順", () => {
    for (const e of a.lowEpisodes) {
      expect(e.deviation).toBeLessThanOrEqual(-a.extremeThreshold);
      expect(e.peakDeviation).toBeLessThanOrEqual(e.deviation);
      expect(e.maxFurtherDrawdown).toBeLessThanOrEqual(0);
    }
    for (const e of a.highEpisodes) {
      expect(e.deviation).toBeGreaterThanOrEqual(a.extremeThreshold);
      expect(e.peakDeviation).toBeGreaterThanOrEqual(e.deviation);
    }
    for (const eps of [a.lowEpisodes, a.highEpisodes]) {
      const dates = eps.map((e) => e.date);
      expect([...dates].sort()).toEqual(dates);
    }
    expect(a.episodeSummary.low["1m"].sampleSize).toBeLessThanOrEqual(a.lowEpisodes.length);
  });
});
