import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import InvestorTradingCard from "@/components/InvestorTradingCard";
import ArbitrageBalanceCard from "@/components/ArbitrageBalanceCard";
import MarginTradingCard from "@/components/MarginTradingCard";
import type {
  InvestorTradingWeek,
  ArbitrageBalanceDay,
  MarginTradingWeek,
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
      screen.getByText("買い残が多いほど将来の売り圧力に")
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

const mockMarginWeek: MarginTradingWeek = {
  date: "2026-04-10",
  buyBalance: 51565.1,
  sellBalance: 9733.1,
  ratio: 5.3,
};

const mockRatioHistory: ChartPoint[] = [
  { date: "2026-03-13", value: 5.71 },
  { date: "2026-03-19", value: 5.68 },
  { date: "2026-03-27", value: 3.53 },
  { date: "2026-04-03", value: 6.07 },
  { date: "2026-04-10", value: 5.3 },
];

describe("MarginTradingCard", () => {
  it("タイトルと日付を表示する", () => {
    render(
      <MarginTradingCard
        latest={mockMarginWeek}
        ratioHistory={mockRatioHistory}
      />
    );
    expect(screen.getByRole("heading", { name: "信用倍率" })).toBeInTheDocument();
    expect(
      screen.getByText("買い残が多いほど上値が重くなる傾向")
    ).toBeInTheDocument();
    expect(screen.getByText("2026-04-10 現在")).toBeInTheDocument();
  });

  it("信用倍率を表示する", () => {
    render(
      <MarginTradingCard
        latest={mockMarginWeek}
        ratioHistory={mockRatioHistory}
      />
    );
    expect(screen.getByText("5.30")).toBeInTheDocument();
    expect(screen.getByText("倍")).toBeInTheDocument();
  });

  it("買い残と売り残を表示する", () => {
    render(
      <MarginTradingCard
        latest={mockMarginWeek}
        ratioHistory={mockRatioHistory}
      />
    );
    expect(screen.getByText("信用買い残")).toBeInTheDocument();
    expect(screen.getByText("51,565.1")).toBeInTheDocument();
    expect(screen.getByText("信用売り残")).toBeInTheDocument();
    expect(screen.getByText("9,733.1")).toBeInTheDocument();
  });

  it("前週比の変化を表示する", () => {
    render(
      <MarginTradingCard
        latest={mockMarginWeek}
        ratioHistory={mockRatioHistory}
      />
    );
    // 5.3 - 6.07 = -0.77
    expect(screen.getByText("-0.77")).toBeInTheDocument();
  });

  it("推移チャートのラベルを表示する", () => {
    render(
      <MarginTradingCard
        latest={mockMarginWeek}
        ratioHistory={mockRatioHistory}
      />
    );
    expect(
      screen.getByText("信用倍率 推移（倍）")
    ).toBeInTheDocument();
  });
});
