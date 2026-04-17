import { describe, it, expect } from "vitest";
import {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginRatio,
  normalizeArbitrageBalance,
  normalizeUsdJpyMomentum,
  calcMa125,
  calcForeignFlow4w,
  computeJapanFearGreed,
  JAPAN_FG_THRESHOLDS,
} from "@/lib/japan-fear-greed";
import type {
  ChartPoint,
  InvestorTradingData,
  MarginTradingData,
  ArbitrageBalanceData,
} from "@/lib/types";

describe("normalizeNikkeiMaDeviation", () => {
  it("MAと同値で50を返す", () => {
    expect(normalizeNikkeiMaDeviation(30000, 30000)).toBe(50);
  });

  it("+15%で100を返す", () => {
    expect(normalizeNikkeiMaDeviation(30000 * 1.15, 30000)).toBe(100);
  });

  it("-15%で0を返す", () => {
    expect(normalizeNikkeiMaDeviation(30000 * 0.85, 30000)).toBe(0);
  });

  it("+20%でも100にクランプされる", () => {
    expect(normalizeNikkeiMaDeviation(30000 * 1.2, 30000)).toBe(100);
  });

  it("ma125が0のとき50を返す", () => {
    expect(normalizeNikkeiMaDeviation(30000, 0)).toBe(50);
  });
});

describe("normalizeForeignFlow", () => {
  it("0で50を返す", () => {
    expect(normalizeForeignFlow(0)).toBe(50);
  });

  it("+20000で100を返す", () => {
    expect(normalizeForeignFlow(20000)).toBe(100);
  });

  it("-20000で0を返す", () => {
    expect(normalizeForeignFlow(-20000)).toBe(0);
  });

  it("+10000で75を返す", () => {
    expect(normalizeForeignFlow(10000)).toBe(75);
  });
});

describe("normalizeMarginRatio", () => {
  it("fear閾値で0を返す", () => {
    expect(normalizeMarginRatio(JAPAN_FG_THRESHOLDS.marginRatio.fear)).toBe(0);
  });

  it("greed閾値で100を返す", () => {
    expect(normalizeMarginRatio(JAPAN_FG_THRESHOLDS.marginRatio.greed)).toBe(
      100
    );
  });

  it("中央値で50付近を返す", () => {
    const mid =
      (JAPAN_FG_THRESHOLDS.marginRatio.fear +
        JAPAN_FG_THRESHOLDS.marginRatio.greed) /
      2;
    expect(normalizeMarginRatio(mid)).toBe(50);
  });

  it("負の値は50を返す", () => {
    expect(normalizeMarginRatio(-1)).toBe(50);
  });
});

describe("normalizeArbitrageBalance", () => {
  it("買い残のみで100を返す", () => {
    expect(normalizeArbitrageBalance(1000, 0)).toBe(100);
  });

  it("売り残のみで0を返す", () => {
    expect(normalizeArbitrageBalance(0, 1000)).toBe(0);
  });

  it("両方0のとき50を返す", () => {
    expect(normalizeArbitrageBalance(0, 0)).toBe(50);
  });
});

describe("normalizeUsdJpyMomentum", () => {
  it("変動なしで50を返す", () => {
    expect(normalizeUsdJpyMomentum(150, 150)).toBe(50);
  });

  it("+5%で100を返す", () => {
    expect(normalizeUsdJpyMomentum(150 * 1.05, 150)).toBe(100);
  });

  it("-5%で0を返す", () => {
    expect(normalizeUsdJpyMomentum(150 * 0.95, 150)).toBe(0);
  });

  it("past rate が0のとき50を返す", () => {
    expect(normalizeUsdJpyMomentum(150, 0)).toBe(50);
  });
});

describe("calcMa125", () => {
  it("125件未満はnullを返す", () => {
    const chart: ChartPoint[] = Array.from({ length: 124 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, "0")}`,
      value: 30000,
    }));
    expect(calcMa125(chart)).toBeNull();
  });

  it("直近125件の平均を返す", () => {
    const chart: ChartPoint[] = Array.from({ length: 130 }, (_, i) => ({
      date: `2026-01-${i + 1}`,
      value: i < 5 ? 0 : 30000,
    }));
    expect(calcMa125(chart)).toBe(30000);
  });
});

describe("calcForeignFlow4w", () => {
  function buildInvestorData(netAmounts: number[]): InvestorTradingData {
    return {
      generatedAt: "2026-04-17",
      weeks: netAmounts.map((n, i) => ({
        weekLabel: `2026年4月第${i + 1}週`,
        startDate: `2026-04-0${i + 1}`,
        endDate: `2026-04-0${i + 1}`,
        entities: [
          { name: "海外投資家", netAmount: n },
          { name: "個人", netAmount: 0 },
          { name: "信託銀行", netAmount: 0 },
          { name: "投資信託", netAmount: 0 },
          { name: "事業法人", netAmount: 0 },
        ],
      })),
    };
  }

  it("直近4週の合計を返す", () => {
    const data = buildInvestorData([100, 200, 300, 400, 500]);
    expect(calcForeignFlow4w(data)).toBe(200 + 300 + 400 + 500);
  });

  it("週数が4未満でも全ての週の合計を返す", () => {
    const data = buildInvestorData([100, 200]);
    expect(calcForeignFlow4w(data)).toBe(300);
  });

  it("データが空ならnullを返す", () => {
    expect(calcForeignFlow4w(null)).toBeNull();
  });
});

describe("computeJapanFearGreed", () => {
  const nikkei225Chart: ChartPoint[] = Array.from({ length: 130 }, (_, i) => ({
    date: `2026-01-${i + 1}`,
    value: 30000,
  }));
  const usdJpyChart: ChartPoint[] = Array.from({ length: 60 }, (_, i) => ({
    date: `2026-01-${i + 1}`,
    value: 150,
  }));
  const investorTrading: InvestorTradingData = {
    generatedAt: "2026-04-17",
    weeks: [
      {
        weekLabel: "2026年4月第1週",
        startDate: "2026-04-01",
        endDate: "2026-04-07",
        entities: [
          { name: "海外投資家", netAmount: 10000 },
          { name: "個人", netAmount: 0 },
          { name: "信託銀行", netAmount: 0 },
          { name: "投資信託", netAmount: 0 },
          { name: "事業法人", netAmount: 0 },
        ],
      },
    ],
  };
  const marginTrading: MarginTradingData = {
    generatedAt: "2026-04-17",
    weekly: [
      {
        date: "2026-04-10",
        buyBalance: 50000,
        sellBalance: 10000,
        ratio: 3.5,
      },
    ],
  };
  const arbitrageBalance: ArbitrageBalanceData = {
    generatedAt: "2026-04-17",
    daily: [{ date: "2026-04-14", buyBalance: 1000, sellBalance: 100 }],
  };

  it("5要素すべて揃うケースで合成される", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart,
      nikkei225Price: 30000,
      usdJpyRate: 150,
      usdJpyChart,
      investorTrading,
      marginTrading,
      arbitrageBalance,
    });
    expect(result).not.toBeNull();
    expect(result!.availableCount).toBe(5);
    expect(result!.score).toBeGreaterThanOrEqual(0);
    expect(result!.score).toBeLessThanOrEqual(100);
    expect(result!.components).toHaveLength(5);
  });

  it("欠損があっても2要素以上ならスコアを返す", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart,
      nikkei225Price: 30000,
      usdJpyRate: 150,
      usdJpyChart,
      investorTrading: null,
      marginTrading: null,
      arbitrageBalance: null,
    });
    expect(result).not.toBeNull();
    expect(result!.availableCount).toBe(2);
  });

  it("利用可能な要素が2未満ならnullを返す", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart: null,
      nikkei225Price: null,
      usdJpyRate: null,
      usdJpyChart: null,
      investorTrading: null,
      marginTrading: null,
      arbitrageBalance: null,
    });
    expect(result).toBeNull();
  });

  it("1要素のみで availableCount=1 ならnullを返す", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart,
      nikkei225Price: 30000,
      usdJpyRate: null,
      usdJpyChart: null,
      investorTrading: null,
      marginTrading: null,
      arbitrageBalance: null,
    });
    expect(result).toBeNull();
  });

  it("スコアはavailable=trueの要素のみで合成される", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart,
      nikkei225Price: 30000, // score=50
      usdJpyRate: 150, // score=50
      usdJpyChart,
      investorTrading: null,
      marginTrading: null,
      arbitrageBalance: null,
    });
    expect(result!.score).toBe(50);
    expect(result!.availableCount).toBe(2);
  });

  it("weightsを指定すると加重平均になる", () => {
    const result = computeJapanFearGreed(
      {
        nikkei225Chart,
        nikkei225Price: 30000 * 1.15, // score=100
        usdJpyRate: 150, // score=50
        usdJpyChart,
        investorTrading: null,
        marginTrading: null,
        arbitrageBalance: null,
      },
      { nikkeiMa: 3, usdJpyMomentum: 1 }
    );
    // (100*3 + 50*1) / 4 = 87.5 → 88
    expect(result!.score).toBe(88);
  });
});
