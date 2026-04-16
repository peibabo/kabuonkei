import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FearGreedGauge from "@/components/FearGreedGauge";
import IndicesCard from "@/components/IndicesCard";
import type { FearGreedData, IndexData } from "@/lib/types";

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
    expect(screen.getByText("恐怖")).toBeInTheDocument();
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
