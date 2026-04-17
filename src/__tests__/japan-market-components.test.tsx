import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import InvestorTradingCard from "@/components/InvestorTradingCard";
import ArbitrageBalanceCard from "@/components/ArbitrageBalanceCard";
import type {
  InvestorTradingWeek,
  ArbitrageBalanceDay,
  ChartPoint,
} from "@/lib/types";

afterEach(() => {
  cleanup();
});

const mockInvestorWeek: InvestorTradingWeek = {
  weekLabel: "2026年4月第2週",
  startDate: "2026-04-06",
  endDate: "2026-04-10",
  entities: [
    { name: "海外投資家", netAmount: 16351.7 },
    { name: "個人", netAmount: -7857.1 },
    { name: "信託銀行", netAmount: -540.2 },
    { name: "投資信託", netAmount: -1491.5 },
    { name: "事業法人", netAmount: 178.7 },
  ],
};

const mockForeignHistory: ChartPoint[] = [
  { date: "2026-03-13", value: -4729 },
  { date: "2026-03-19", value: -4919 },
  { date: "2026-03-27", value: 8200 },
  { date: "2026-04-03", value: 5000 },
  { date: "2026-04-10", value: 16351.7 },
];

const mockArbitrageDay: ArbitrageBalanceDay = {
  date: "2026-04-14",
  buyBalance: 1355.9,
  sellBalance: 34.6,
};

const mockBuyHistory: ChartPoint[] = [
  { date: "2026-04-07", value: 1400.2 },
  { date: "2026-04-08", value: 1380.5 },
  { date: "2026-04-09", value: 1370.1 },
  { date: "2026-04-10", value: 1360.0 },
  { date: "2026-04-14", value: 1355.9 },
];

describe("InvestorTradingCard", () => {
  it("タイトルと週ラベルを表示する", () => {
    render(
      <InvestorTradingCard
        latest={mockInvestorWeek}
        foreignHistory={mockForeignHistory}
      />
    );
    expect(screen.getByText("投資主体別売買動向")).toBeInTheDocument();
    expect(
      screen.getByText("誰が買って、誰が売っている？")
    ).toBeInTheDocument();
    expect(
      screen.getByText("2026年4月第2週（2026-04-06 〜 2026-04-10）")
    ).toBeInTheDocument();
  });

  it("海外投資家の推移ラベルを表示する", () => {
    render(
      <InvestorTradingCard
        latest={mockInvestorWeek}
        foreignHistory={mockForeignHistory}
      />
    );
    expect(
      screen.getByText("海外投資家 週次推移（億円）")
    ).toBeInTheDocument();
  });
});

describe("ArbitrageBalanceCard", () => {
  it("タイトルと日付を表示する", () => {
    render(
      <ArbitrageBalanceCard
        latest={mockArbitrageDay}
        buyHistory={mockBuyHistory}
      />
    );
    expect(screen.getByText("裁定残")).toBeInTheDocument();
    expect(
      screen.getByText("先物市場に溜まった将来の売り圧力")
    ).toBeInTheDocument();
    expect(screen.getByText("2026-04-14 現在")).toBeInTheDocument();
  });

  it("買い残と売り残を表示する", () => {
    render(
      <ArbitrageBalanceCard
        latest={mockArbitrageDay}
        buyHistory={mockBuyHistory}
      />
    );
    expect(screen.getByText("裁定買い残")).toBeInTheDocument();
    expect(screen.getByText("1,355.9")).toBeInTheDocument();
    expect(screen.getByText("裁定売り残")).toBeInTheDocument();
    expect(screen.getByText("34.6")).toBeInTheDocument();
  });

  it("前日比の変化を表示する", () => {
    render(
      <ArbitrageBalanceCard
        latest={mockArbitrageDay}
        buyHistory={mockBuyHistory}
      />
    );
    // 1355.9 - 1360.0 = -4.1
    expect(screen.getByText("-4.1")).toBeInTheDocument();
  });

  it("推移チャートのラベルを表示する", () => {
    render(
      <ArbitrageBalanceCard
        latest={mockArbitrageDay}
        buyHistory={mockBuyHistory}
      />
    );
    expect(
      screen.getByText("裁定買い残 推移（百万株）")
    ).toBeInTheDocument();
  });
});
