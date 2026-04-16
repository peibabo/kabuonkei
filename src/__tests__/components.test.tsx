import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FearGreedGauge from "@/components/FearGreedGauge";
import IndicesCard from "@/components/IndicesCard";
import CommodityCard from "@/components/CommodityCard";
import type { FearGreedData, IndexData, CommodityData } from "@/lib/types";

afterEach(() => {
  cleanup();
});

const mockFearGreedData: FearGreedData = {
  score: 38,
  rating: "Fear",
  previousClose: 42,
  oneWeekAgo: 55,
  oneMonthAgo: 61,
  oneYearAgo: 70,
  timestamp: "2026-04-16T00:00:00Z",
};

// SVGの「0」「100」テキストと重複するため、getAllByTextで複数一致を許容する

describe("FearGreedGauge", () => {
  it("スコアとセンチメントレベルを表示する", () => {
    render(<FearGreedGauge data={mockFearGreedData} />);
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("冷え込み")).toBeInTheDocument();
    expect(screen.getByText("（弱気）")).toBeInTheDocument();
  });

  it("過去データを表示する", () => {
    render(<FearGreedGauge data={mockFearGreedData} />);
    expect(screen.getByText("前日")).toBeInTheDocument();
    expect(screen.getByText("1週間前")).toBeInTheDocument();
    expect(screen.getByText("1ヶ月前")).toBeInTheDocument();
  });

  it("CNN Businessの出典を表示する", () => {
    const { container } = render(<FearGreedGauge data={mockFearGreedData} />);
    expect(container.textContent).toContain("出典: CNN Business");
  });

  it("推定値の場合はVIXベース推定表示になる", () => {
    const estimatedData: FearGreedData = {
      ...mockFearGreedData,
      rating: "estimated",
    };
    const { container } = render(<FearGreedGauge data={estimatedData} />);
    expect(screen.getByText("VIXベース推定値")).toBeInTheDocument();
    expect(container.textContent).toContain("VIXから推定");
    expect(container.textContent).not.toContain("出典: CNN Business");
    // 過去データは非表示
    expect(screen.queryByText("前日")).not.toBeInTheDocument();
  });
});

const mockIndicesData: IndexData[] = [
  {
    symbol: "^GSPC",
    name: "S&P 500",
    price: 5234.18,
    change: 15.64,
    changePercent: 0.3,
  },
  {
    symbol: "^N225",
    name: "日経平均",
    price: 38500.0,
    change: 192.5,
    changePercent: 0.5,
  },
];

describe("IndicesCard", () => {
  it("指数名と値を表示する", () => {
    render(<IndicesCard data={mockIndicesData} />);
    expect(screen.getByText("S&P 500")).toBeInTheDocument();
    expect(screen.getByText("日経平均")).toBeInTheDocument();
    expect(screen.getByText("+0.30%")).toBeInTheDocument();
    expect(screen.getByText("+0.50%")).toBeInTheDocument();
  });
});

const mockCommodityData: CommodityData[] = [
  {
    symbol: "GC=F",
    name: "金（ゴールド）",
    price: 2350.5,
    change: 12.3,
    changePercent: 0.53,
    chart: [],
  },
  {
    symbol: "CL=F",
    name: "原油（WTI）",
    price: 78.42,
    change: -1.15,
    changePercent: -1.45,
    chart: [],
  },
  {
    symbol: "BTC-USD",
    name: "ビットコイン",
    price: 67890,
    change: 1234.56,
    changePercent: 1.85,
    chart: [],
  },
];

describe("CommodityCard", () => {
  it("コモディティ名と変動率を表示する", () => {
    render(<CommodityCard data={mockCommodityData} />);
    expect(screen.getByText("金（ゴールド）")).toBeInTheDocument();
    expect(screen.getByText("原油（WTI）")).toBeInTheDocument();
    expect(screen.getByText("ビットコイン")).toBeInTheDocument();
    expect(screen.getByText("+0.53%")).toBeInTheDocument();
    expect(screen.getByText("-1.45%")).toBeInTheDocument();
    expect(screen.getByText("+1.85%")).toBeInTheDocument();
  });

  it("単位を表示する", () => {
    render(<CommodityCard data={mockCommodityData} />);
    expect(screen.getByText("USD/oz")).toBeInTheDocument();
    expect(screen.getByText("USD/bbl")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("セクションタイトルを表示する", () => {
    render(<CommodityCard data={mockCommodityData} />);
    expect(screen.getByText("コモディティ・暗号資産")).toBeInTheDocument();
  });

  it("データが空の場合は何も表示しない", () => {
    const { container } = render(<CommodityCard data={[]} />);
    expect(container.innerHTML).toBe("");
  });
});
