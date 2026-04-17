import { describe, it, expect } from "vitest";
import {
  getInvestorTradingData,
  getLatestInvestorTrading,
  getForeignInvestorNetHistory,
  getArbitrageBalanceData,
  getLatestArbitrageBalance,
  getArbitrageBuyBalanceHistory,
  getMarginTradingData,
  getLatestMarginTrading,
  getMarginRatioHistory,
} from "@/lib/japan-market-data";

describe("japan-market-data", () => {
  describe("投資主体別売買動向", () => {
    it("週次データが存在する", () => {
      const data = getInvestorTradingData();
      expect(data.generatedAt).toBeTruthy();
      expect(data.weeks.length).toBeGreaterThan(0);
    });

    it("各週に必要なフィールドが存在する", () => {
      const data = getInvestorTradingData();
      for (const week of data.weeks) {
        expect(week.weekLabel).toBeTruthy();
        expect(week.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(week.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(week.entities.length).toBeGreaterThan(0);
        for (const entity of week.entities) {
          expect(entity.name).toBeTruthy();
          expect(typeof entity.netAmount).toBe("number");
        }
      }
    });

    it("getLatestInvestorTradingが最新週を返す", () => {
      const latest = getLatestInvestorTrading();
      expect(latest).toBeDefined();
      expect(latest!.entities.length).toBeGreaterThan(0);

      // 週が日付昇順なので最後の要素が最新
      const data = getInvestorTradingData();
      expect(latest!.startDate).toBe(
        data.weeks[data.weeks.length - 1].startDate
      );
    });

    it("海外投資家のエンティティが含まれる", () => {
      const latest = getLatestInvestorTrading();
      const foreign = latest!.entities.find((e) => e.name === "海外投資家");
      expect(foreign).toBeDefined();
    });

    it("getForeignInvestorNetHistoryがChartPoint形式を返す", () => {
      const history = getForeignInvestorNetHistory();
      expect(history.length).toBeGreaterThan(0);
      for (const point of history) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.value).toBe("number");
      }
    });
  });

  describe("裁定残", () => {
    it("日次データが存在する", () => {
      const data = getArbitrageBalanceData();
      expect(data.generatedAt).toBeTruthy();
      expect(data.daily.length).toBeGreaterThan(0);
    });

    it("各日に必要なフィールドが存在する", () => {
      const data = getArbitrageBalanceData();
      for (const day of data.daily) {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof day.buyBalance).toBe("number");
        expect(day.buyBalance).toBeGreaterThan(0);
        expect(typeof day.sellBalance).toBe("number");
      }
    });

    it("getLatestArbitrageBalanceが最新日を返す", () => {
      const latest = getLatestArbitrageBalance();
      expect(latest).toBeDefined();
      expect(latest!.buyBalance).toBeGreaterThan(0);
    });

    it("getArbitrageBuyBalanceHistoryがChartPoint形式を返す", () => {
      const history = getArbitrageBuyBalanceHistory();
      expect(history.length).toBeGreaterThan(0);
      for (const point of history) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.value).toBe("number");
        expect(point.value).toBeGreaterThan(0);
      }
    });
  });

  describe("信用倍率", () => {
    it("週次データが存在する", () => {
      const data = getMarginTradingData();
      expect(data.generatedAt).toBeTruthy();
      expect(data.weekly.length).toBeGreaterThan(0);
    });

    it("各週に必要なフィールドが存在する", () => {
      const data = getMarginTradingData();
      for (const week of data.weekly) {
        expect(week.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof week.buyBalance).toBe("number");
        expect(week.buyBalance).toBeGreaterThan(0);
        expect(typeof week.sellBalance).toBe("number");
        expect(week.sellBalance).toBeGreaterThan(0);
        expect(typeof week.ratio).toBe("number");
        expect(week.ratio).toBeGreaterThan(0);
      }
    });

    it("getLatestMarginTradingが最新週を返す", () => {
      const latest = getLatestMarginTrading();
      expect(latest).toBeDefined();
      expect(latest!.ratio).toBeGreaterThan(0);

      const data = getMarginTradingData();
      expect(latest!.date).toBe(
        data.weekly[data.weekly.length - 1].date
      );
    });

    it("getMarginRatioHistoryがChartPoint形式を返す", () => {
      const history = getMarginRatioHistory();
      expect(history.length).toBeGreaterThan(0);
      for (const point of history) {
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.value).toBe("number");
        expect(point.value).toBeGreaterThan(0);
      }
    });
  });
});
