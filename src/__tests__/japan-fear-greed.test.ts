import { describe, it, expect } from "vitest";
import {
  normalizeNikkeiMaDeviation,
  normalizeForeignFlow,
  normalizeMarginBuyChange,
  normalizeMarginRatio,
  normalizeArbitrageBalance,
  normalizeUsdJpyMomentum,
  calcMa125,
  calcForeignFlow4w,
  calcMarginBuyChange4w,
  mergeMarginWeeks,
  computeJapanFearGreed,
  JAPAN_FG_THRESHOLDS,
} from "@/lib/japan-fear-greed";
import type {
  ChartPoint,
  InvestorTradingData,
  MarginTradingData,
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

describe("normalizeMarginBuyChange", () => {
  it("買残が 4 週で -15% なら 0、+15% なら 100、横ばいなら 50", () => {
    expect(normalizeMarginBuyChange(-15)).toBe(0);
    expect(normalizeMarginBuyChange(15)).toBe(100);
    expect(normalizeMarginBuyChange(0)).toBe(50);
  });

  it("範囲外は clamp、非数値は 50", () => {
    expect(normalizeMarginBuyChange(-40)).toBe(0);
    expect(normalizeMarginBuyChange(NaN)).toBe(50);
  });
});

/** 申込日（金曜）ごとの信用残。buyBalances は古い順 */
function marginWeeks(buyBalances: number[]): MarginTradingData {
  return {
    generatedAt: "2026-11-12",
    weekly: buyBalances.map((buyBalance, i) => ({
      date: `2026-10-${String(2 + i * 7).padStart(2, "0")}`,
      buyBalance,
      sellBalance: 6000,
      ratio: Math.round((buyBalance / 6000) * 100) / 100,
    })),
  };
}

describe("calcMarginBuyChange4w", () => {
  it("最新週と 4 週前の買残を比べる（2026-11-06 週の実値 -12.3%）", () => {
    // 2026-10-09 → 11-06 の買残（億円）
    const data = marginWeeks([67080.6, 66640.1, 65340.7, 65058.9, 58809.9]);
    expect(calcMarginBuyChange4w(data)).toBeCloseTo(-12.33, 2);
  });

  it("5 週そろわなければ null", () => {
    expect(calcMarginBuyChange4w(marginWeeks([1, 2, 3, 4]))).toBeNull();
    expect(calcMarginBuyChange4w(null)).toBeNull();
  });
});

describe("mergeMarginWeeks", () => {
  const w = (date: string, buyBalance: number) => ({
    date,
    buyBalance,
    sellBalance: 1000,
    ratio: buyBalance / 1000,
  });

  it("長期履歴に直近データを足し、同じ週は直近側を優先して日付順に並べる", () => {
    const merged = mergeMarginWeeks(
      [w("2026-10-02", 100), w("2026-10-09", 110)],
      { generatedAt: "2026-11-12", weekly: [w("2026-10-16", 120), w("2026-10-09", 111)] },
    );
    expect(merged?.weekly.map((x) => [x.date, x.buyBalance])).toEqual([
      ["2026-10-02", 100],
      ["2026-10-09", 111],
      ["2026-10-16", 120],
    ]);
    expect(merged?.generatedAt).toBe("2026-11-12");
  });

  it("どちらも空なら null、履歴だけでも返す", () => {
    expect(mergeMarginWeeks([], null)).toBeNull();
    expect(mergeMarginWeeks([w("2026-10-02", 100)], null)?.weekly).toHaveLength(1);
  });
});

describe("computeJapanFearGreed", () => {
  /** 126 本のうち最後の 1 本だけ price に置き換えたチャート（MA は直前 125 本 = 30000） */
  const chartWithLast = (price: number): ChartPoint[] =>
    Array.from({ length: 126 }, (_, i) => ({
      date: `d${String(i).padStart(3, "0")}`,
      value: i === 125 ? price : 30000,
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
        ],
      },
    ],
  };

  it("市場温度は C1（日経225 の 125 日移動平均乖離）だけで決まる", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart: chartWithLast(30000 * 0.85),
      nikkei225Price: 30000 * 0.85, // -15% → 0
      investorTrading,
      marginTrading: marginWeeks([100, 100, 100, 100, 115]), // +15% → 100
    });
    expect(result?.score).toBe(0);
    expect(result?.level).toBe("極寒");
    // 需給は高くても市場温度には混ざらない（需給は components に実数だけ載る）
    expect(result?.components.find((c) => c.id === "marginBuyChange")?.rawValue).toBe(15);
  });

  it("移動平均はチャート末尾（= 現在値と同じ立会日）を除いて取る", () => {
    // 末尾が現在値と同じ 33000。末尾を含めると MA が上がって乖離が小さくなる
    const result = computeJapanFearGreed({
      nikkei225Chart: chartWithLast(33000),
      nikkei225Price: 33000, // MA 30000 に対して +10% → 83
      investorTrading: null,
      marginTrading: null,
    });
    expect(result?.score).toBe(83);
    expect(result?.components.find((c) => c.id === "nikkeiMa")?.rawValue).toBe(10);
  });

  it("需給の要素は取れたものだけ available になる", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart: chartWithLast(30000),
      nikkei225Price: 30000,
      investorTrading, // 1 週 +1 兆円 → 75
      marginTrading: null,
    });
    expect(result?.score).toBe(50);
    expect(result?.components.map((c) => [c.id, c.group, c.available])).toEqual([
      ["nikkeiMa", "price", true],
      ["foreignFlow", "supply", true],
      ["marginBuyChange", "supply", false],
    ]);
  });

  it("現在値が取れなければチャート末尾の終値で計算する", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart: chartWithLast(30000 * 0.85),
      nikkei225Price: null,
      investorTrading: null,
      marginTrading: null,
    });
    expect(result?.score).toBe(0);
  });

  it("需給データが無くても市場温度は出す", () => {
    const result = computeJapanFearGreed({
      nikkei225Chart: chartWithLast(30000),
      nikkei225Price: 30000,
      investorTrading: null,
      marginTrading: null,
    });
    expect(result?.score).toBe(50);
    expect(result?.components.filter((c) => c.group === "supply").every((c) => !c.available)).toBe(
      true,
    );
  });

  it("C1 が計算できなければ null（需給だけでは出さない）", () => {
    expect(
      computeJapanFearGreed({
        nikkei225Chart: chartWithLast(30000).slice(0, 100),
        nikkei225Price: 30000,
        investorTrading,
        marginTrading: marginWeeks([100, 100, 100, 100, 115]),
      }),
    ).toBeNull();
    expect(
      computeJapanFearGreed({
        nikkei225Chart: null,
        nikkei225Price: null,
        investorTrading,
        marginTrading: null,
      }),
    ).toBeNull();
  });
});
