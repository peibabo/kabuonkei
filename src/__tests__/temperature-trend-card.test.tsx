import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import TemperatureTrendCard from "@/components/TemperatureTrendCard";
import type { ChartPoint } from "@/lib/types";

// Rechartsをモック
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ReferenceArea: () => <div data-testid="reference-area" />,
}));

afterEach(() => {
  cleanup();
});

const mockVixChart: ChartPoint[] = [
  { date: "2026-04-01", value: 20 },
  { date: "2026-04-02", value: 22 },
  { date: "2026-04-03", value: 18 },
];

describe("TemperatureTrendCard", () => {
  it("タイトルを表示する", () => {
    render(<TemperatureTrendCard vixChart={mockVixChart} currentScore={50} />);
    expect(screen.getByText("🇺🇸 温度の推移（米国）")).toBeInTheDocument();
  });

  it("期間切り替えボタンを表示する", () => {
    render(<TemperatureTrendCard vixChart={mockVixChart} currentScore={50} />);
    expect(screen.getByText("1ヶ月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("6ヶ月")).toBeInTheDocument();
    expect(screen.getByText("1年")).toBeInTheDocument();
  });

  it("温度帯の凡例を表示する", () => {
    render(<TemperatureTrendCard vixChart={mockVixChart} currentScore={50} />);
    expect(screen.getByText("極寒")).toBeInTheDocument();
    expect(screen.getByText("冷え込み")).toBeInTheDocument();
    expect(screen.getByText("平温")).toBeInTheDocument();
    expect(screen.getByText("過熱")).toBeInTheDocument();
    expect(screen.getByText("沸騰")).toBeInTheDocument();
  });

  it("チャートコンテナが描画される", () => {
    render(<TemperatureTrendCard vixChart={mockVixChart} currentScore={50} />);
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("5つの温度帯ReferenceAreaが描画される", () => {
    render(<TemperatureTrendCard vixChart={mockVixChart} currentScore={50} />);
    const refAreas = screen.getAllByTestId("reference-area");
    expect(refAreas).toHaveLength(5);
  });
});
