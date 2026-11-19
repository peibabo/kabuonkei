// @vitest-environment node
import { describe, it, expect } from "vitest";
import { computeVixEpisodes } from "../_lib/vix-episodes";

const FWD = { "1m": 30, "3m": 90, "6m": 180 } as const;

/** 2000-01-01 から毎日 1 件の Map（土日も取引日扱いでよい） */
function series(values: number[]): Map<string, number> {
  const start = new Date("2000-01-01T00:00:00Z");
  return new Map(
    values.map((v, i) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + i);
      return [d.toISOString().slice(0, 10), v];
    })
  );
}

describe("computeVixEpisodes", () => {
  it("20 営業日以内の 30 以上は 1 回にまとめ、21 営業日あけば別の回にする", () => {
    const vix = Array(400).fill(15);
    vix[10] = 31;
    vix[30] = 35; // 20 日後 → 同じ回
    vix[51] = 32; // 21 日後 → 別の回
    const sp = Array(400).fill(100);
    const s = computeVixEpisodes(series(vix), series(sp), FWD);
    expect(s.totalDays).toBe(3);
    expect(s.episodes.map((e) => e.days)).toEqual([2, 1]);
    expect(s.episodes[0].peakVix).toBe(35);
    expect(s.episodes[0].start).toBe("2000-01-11");
    expect(s.episodes[0].end).toBe("2000-01-31");
  });

  it("30 ちょうどは該当、29.9 は該当しない", () => {
    const vix = Array(300).fill(15);
    vix[5] = 29.9;
    vix[100] = 30;
    const s = computeVixEpisodes(series(vix), series(Array(300).fill(100)), FWD);
    expect(s.episodes).toHaveLength(1);
    expect(s.episodes[0].start).toBe("2000-04-10");
  });

  it("回数ベースは最初の日だけで集計し、長い回の日数に引っぱられない", () => {
    // 1 回目: 30 日続く高騰。最初の日から下げ、後半の日から上がる
    // 2 回目: 1 日だけ。その後も横ばい
    const n = 700;
    const vix = Array(n).fill(15);
    for (let i = 10; i < 40; i++) vix[i] = 40;
    vix[300] = 31;
    const sp: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i <= 10) sp.push(100);
      else if (i <= 40) sp.push(100 - (i - 10)); // 70 まで下げる
      else if (i <= 300) sp.push(70 + Math.min(i - 40, 60)); // 130 まで戻す
      else sp.push(130);
    }
    const s = computeVixEpisodes(series(vix), series(sp), FWD);
    expect(s.episodes).toHaveLength(2);
    expect(s.firstDay["6m"].sampleSize).toBe(2);
    // 1 回目の最初の日（100）→ 180 日後（130）は +30%、2 回目は 0%
    expect(s.episodes[0].sp500["6m"]).toBe(30);
    expect(s.episodes[1].sp500["6m"]).toBe(0);
    expect(s.firstDay["6m"].winRate).toBe(50);
    // 1 回目は最初の日のあとに 70 まで下げた → 底ではない。2 回目は横ばい → その日が底
    expect(s.episodes[0].sp500Drawdown).toBe(-30);
    expect(s.episodes[1].sp500Drawdown).toBe(0);
    expect(s.bottom).toEqual({ count: 1, of: 2 });
  });

  it("ごくわずかでも下げていれば底とは数えない（丸めで -0 にしない）", () => {
    const vix = Array(400).fill(15);
    vix[10] = 31;
    const sp = Array(400).fill(4000);
    sp[50] = 3998.5; // -0.0375%
    const s = computeVixEpisodes(series(vix), series(sp), FWD);
    expect(s.bottom).toEqual({ count: 0, of: 1 });
    expect(s.episodes[0].sp500Drawdown).toBe(-0.1);
  });

  it("平均・勝率は丸める前のリターンで集計する", () => {
    const vix = Array(400).fill(15);
    vix[10] = 31;
    const sp = Array(400).fill(4000);
    for (let i = 11; i < 400; i++) sp[i] = 4001.6; // +0.04% → 表示は 0
    const s = computeVixEpisodes(series(vix), series(sp), FWD);
    expect(s.episodes[0].sp500["6m"]).toBe(0);
    expect(s.firstDay["6m"].winRate).toBe(100);
  });

  it("期間が経過していない回はリターンと底の判定を null にする", () => {
    const vix = Array(100).fill(15);
    vix[90] = 33;
    const s = computeVixEpisodes(series(vix), series(Array(100).fill(100)), FWD);
    expect(s.episodes[0].sp500).toEqual({ "1m": null, "3m": null, "6m": null });
    expect(s.episodes[0].sp500Drawdown).toBeNull();
    expect(s.bottom).toEqual({ count: 0, of: 0 });
    expect(s.firstDay["6m"].sampleSize).toBe(0);
  });
});
