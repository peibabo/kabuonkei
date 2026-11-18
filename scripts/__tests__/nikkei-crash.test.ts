// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  computeNikkeiCrashAnalysis,
  DRAWDOWN_WINDOW,
} from "../_lib/nikkei-crash";
import analysisJson from "../../src/data/nikkei-crash-analysis.json";
import {
  getFailedCrashEpisodes,
  type NikkeiCrashAnalysis,
} from "../../src/lib/nikkei-crash-analysis";

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

const OPTS = { generatedAt: "2026-11-18" };

describe("computeNikkeiCrashAnalysis", () => {
  it("-5% 以下の日だけを急落として拾い、-4.9% は拾わない", () => {
    const values = [100, 95, ...Array(10).fill(95), 90.4, ...Array(400).fill(90.4)];
    // 100 → 95 は -5.0%、95 → 90.4 は約 -4.8%
    const a = computeNikkeiCrashAnalysis(closes(values), OPTS);
    expect(a.crashDayCount).toBe(1);
    expect(a.episodes).toHaveLength(1);
    expect(a.episodes[0].change).toBe(-5);
  });

  it("20 営業日以内の急落は 1 回にまとめ、21 営業日あけば別の回にする", () => {
    const values = [100, 90];
    // 20 営業日後に 2 回目（同じ回）
    for (let i = 0; i < 19; i++) values.push(90);
    values.push(80);
    // そこから 21 営業日後に 3 回目（別の回）
    for (let i = 0; i < 20; i++) values.push(80);
    values.push(70);
    for (let i = 0; i < 300; i++) values.push(70);
    const a = computeNikkeiCrashAnalysis(closes(values), OPTS);
    expect(a.crashDayCount).toBe(3);
    expect(a.episodes).toHaveLength(2);
    expect(a.episodes[0].crashDays).toBe(2);
    expect(a.episodes[0].worstChange).toBe(-11.1);
    expect(a.episodes[1].crashDays).toBe(1);
  });

  it("前方リターン・その後の最安値・底までの日数を計算する", () => {
    // 急落後 10 日目に 80 の安値、その後 120 まで戻す
    const values = [100, 90];
    for (let i = 1; i <= 300; i++) {
      values.push(i === 10 ? 80 : i < 10 ? 88 : 120);
    }
    const a = computeNikkeiCrashAnalysis(closes(values), OPTS);
    const e = a.episodes[0];
    expect(e.daysToLow).toBe(10);
    expect(e.maxFurtherDrawdown).toBe(-11.1);
    expect(e.returns["1m"]).toBe(33.3);
    expect(e.isComplete).toBe(true);
    expect(a.summary.drawdown.bottomOnCrashDay).toBe(0);
  });

  it("期間が経過していないリターンは null、6ヶ月未経過の回は底の集計から除く", () => {
    const values = [...Array(200).fill(100), 90, ...Array(30).fill(95)];
    const a = computeNikkeiCrashAnalysis(closes(values), OPTS);
    const e = a.episodes[0];
    expect(e.returns["1m"]).not.toBeNull();
    expect(e.returns["3m"]).toBeNull();
    expect(e.isComplete).toBe(false);
    expect(a.summary.drawdown.count).toBe(0);
    expect(a.summary.episodes["3m"].sampleSize).toBe(0);
  });

  it("125 日分の履歴がある急落には温度が付き、寒い／それ以外に振り分けられる", () => {
    // 横ばいの後に -10%：MA 乖離 -10% → 温度は 20 以下
    const values = [...Array(130).fill(100), 90, ...Array(300).fill(95)];
    const a = computeNikkeiCrashAnalysis(closes(values), OPTS);
    expect(a.episodes[0].temperature).not.toBeNull();
    expect(a.episodes[0].temperature!).toBeLessThanOrEqual(20);
    expect(a.summary.cold["1m"].sampleSize).toBe(1);
    expect(a.summary.warm["1m"].sampleSize).toBe(0);
  });

  it("6ヶ月の窓は DRAWDOWN_WINDOW 営業日", () => {
    expect(DRAWDOWN_WINDOW).toBe(126);
  });
});

describe("nikkei-crash-analysis.json（生成済みデータ）", () => {
  const a = analysisJson as NikkeiCrashAnalysis;

  it("必須フィールドがそろっている", () => {
    expect(a.threshold).toBe(-5);
    expect(a.episodes.length).toBeGreaterThan(10);
    expect(a.crashDayCount).toBeGreaterThanOrEqual(a.episodes.length);
    expect(a.summary.baseline["3m"].sampleSize).toBeGreaterThan(1000);
  });

  it("各回の下落率は閾値以下、さらに下げた幅は 0 以下で日付は昇順", () => {
    for (const e of a.episodes) {
      expect(e.change).toBeLessThanOrEqual(a.threshold);
      expect(e.maxFurtherDrawdown).toBeLessThanOrEqual(0);
    }
    const dates = a.episodes.map((e) => e.date);
    expect([...dates].sort()).toEqual(dates);
  });

  it("外れた例は 6ヶ月後がマイナスの回だけ", () => {
    for (const e of getFailedCrashEpisodes(a)) {
      expect(e.returns["6m"]!).toBeLessThan(0);
    }
  });
});
