// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeSupplyDemandAnalysis } from "../_lib/supply-demand-signals";
import type { FlowHistoryWeek, MarginHistoryWeek } from "../_lib/supply-temperature-analysis";
import {
  classifySupply,
  FLOW_BANDS,
  formatFlowOku,
  formatMarginChange,
  getSupplyDemandAnalysis,
  MARGIN_BANDS,
  SUPPLY_PERIOD_KEYS,
} from "../../src/lib/supply-demand-analysis";

/** 2024-01-01（月）から平日だけ n 日。終値は close(i) */
function buildNikkei(n: number, close: (i: number) => number): Map<string, number> {
  const map = new Map<string, number>();
  const d = new Date("2024-01-01T00:00:00Z");
  let i = 0;
  while (map.size < n) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) {
      map.set(d.toISOString().slice(0, 10), close(i));
      i++;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return map;
}

/** 2024-01-05（金）から n 週分の金曜日 */
function fridays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date("2024-01-05T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d.toISOString().slice(0, 10);
  });
}

describe("classifySupply", () => {
  it("海外勢: 下側は境界を含めて低い側、上側は境界を含めて高い側", () => {
    expect(classifySupply(-10000, FLOW_BANDS)).toBe("very-low");
    expect(classifySupply(-9999, FLOW_BANDS)).toBe("low");
    expect(classifySupply(-3000, FLOW_BANDS)).toBe("low");
    expect(classifySupply(-2999, FLOW_BANDS)).toBe("mid");
    expect(classifySupply(2999, FLOW_BANDS)).toBe("mid");
    expect(classifySupply(3000, FLOW_BANDS)).toBe("high");
    expect(classifySupply(10000, FLOW_BANDS)).toBe("very-high");
  });

  it("信用買い残", () => {
    expect(classifySupply(-12.3, MARGIN_BANDS)).toBe("very-low");
    expect(classifySupply(-10, MARGIN_BANDS)).toBe("very-low");
    expect(classifySupply(-3, MARGIN_BANDS)).toBe("low");
    expect(classifySupply(0, MARGIN_BANDS)).toBe("mid");
    expect(classifySupply(3, MARGIN_BANDS)).toBe("high");
    expect(classifySupply(15, MARGIN_BANDS)).toBe("very-high");
  });
});

describe("表示用の文", () => {
  it("formatFlowOku", () => {
    expect(formatFlowOku(-6300)).toBe("6,300億円の売り越し");
    expect(formatFlowOku(-12354)).toBe("1兆2,354億円の売り越し");
    expect(formatFlowOku(20000)).toBe("2兆円の買い越し");
    expect(formatFlowOku(0)).toBe("0円");
  });

  it("formatMarginChange", () => {
    expect(formatMarginChange(-12.3)).toBe("12.3%の減少");
    expect(formatMarginChange(4)).toBe("4.0%の増加");
    expect(formatMarginChange(0)).toBe("変化なし");
  });
});

describe("computeSupplyDemandAnalysis", () => {
  const nikkei = buildNikkei(500, (i) => 30000 + i * 10);
  const margin: MarginHistoryWeek[] = fridays(95).map((date, i) => ({
    date,
    buyBalance: i < 50 ? 40000 : 34000, // 50 週目から 15% 減
  }));
  const flow: FlowHistoryWeek[] = fridays(95).map((endDate, i) => ({
    startDate: endDate,
    endDate,
    foreign: i < 60 ? -3000 : 3000, // 4 週で −1.2 兆円 → +1.2 兆円
  }));
  const a = computeSupplyDemandAnalysis(nikkei, margin, flow, { generatedAt: "2026-11-21" });

  it("区切りの日数を足すと全日数になる", () => {
    for (const ind of [a.flow, a.margin]) {
      const sum = ind.bands.reduce((s, b) => s + b.all["1m"].sampleSize, 0);
      expect(sum).toBe(ind.baseline.all["1m"].sampleSize);
    }
  });

  it("前半と後半の日数を足すと全体になる", () => {
    for (const ind of [a.flow, a.margin]) {
      for (const k of SUPPLY_PERIOD_KEYS) {
        const b = ind.baseline;
        expect(b.firstHalf[k].sampleSize + b.secondHalf[k].sampleSize).toBe(b.all[k].sampleSize);
      }
    }
  });

  it("極端な値の回は 20 営業日以内をまとめる", () => {
    // 海外勢は最初から −1.2 兆円が続くので 1 回、信用買い残は急減した 1 回
    expect(a.flow.extremeEpisodes).toHaveLength(1);
    expect(a.margin.extremeEpisodes).toHaveLength(1);
    expect(a.margin.extremeEpisodes[0].value).toBeLessThanOrEqual(-10);
  });

  it("上がり続ける相場では前方リターンはすべてプラス", () => {
    expect(a.flow.baseline.all["6m"].winRate).toBe(100);
    expect(a.margin.extremeSummary["1m"].winRate).toBe(100);
  });

  it("市場温度が低い日の分け方は合計と一致する", () => {
    for (const ind of [a.flow, a.margin]) {
      expect(ind.cold.weak.all["1m"].sampleSize + ind.cold.other.all["1m"].sampleSize).toBe(
        ind.cold.all.all["1m"].sampleSize
      );
    }
  });

  it("最新日の値と区切り", () => {
    expect(a.latest.flow4w).toBe(12000);
    expect(a.latest.flowBandKey).toBe("very-high");
    expect(a.latest.marginChange4w).toBe(0);
    expect(a.latest.marginBandKey).toBe("mid");
  });
});

describe("生成済み JSON", () => {
  const a = getSupplyDemandAnalysis();

  it("区切りがそろっている", () => {
    expect(a.flow.bands.map((b) => b.key)).toEqual(FLOW_BANDS.map((b) => b.key));
    expect(a.margin.bands.map((b) => b.key)).toEqual(MARGIN_BANDS.map((b) => b.key));
  });

  it("区切りの日数を足すと全日数になる", () => {
    for (const ind of [a.flow, a.margin]) {
      const sum = ind.bands.reduce((s, b) => s + b.all["1m"].sampleSize, 0);
      expect(sum).toBe(ind.baseline.all["1m"].sampleSize);
    }
  });

  it("極端な値の回はすべて閾値以下で、日付順", () => {
    for (const ind of [a.flow, a.margin]) {
      expect(ind.extremeEpisodes.length).toBeGreaterThan(0);
      for (const e of ind.extremeEpisodes) expect(e.value).toBeLessThanOrEqual(ind.extremeThreshold);
      const dates = ind.extremeEpisodes.map((e) => e.date);
      expect([...dates].sort()).toEqual(dates);
    }
  });

  it("信用買い残は海外投資家より長い期間がある", () => {
    expect(a.margin.dataRange.from < a.flow.dataRange.from).toBe(true);
  });
});
