import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectorHeatmapCard from "@/components/SectorHeatmapCard";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("SectorHeatmapCard（コンパクト版）", () => {
  it("japanScore が null なら何も描画しない", () => {
    const { container } = render(<SectorHeatmapCard japanScore={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("ヘッダーとサブタイトルを表示する", () => {
    render(<SectorHeatmapCard japanScore={50} />);
    expect(
      screen.getByText("🇯🇵 温度帯別の業種パフォーマンス")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/TOPIX-17 連動 ETF ベース/)
    ).toBeInTheDocument();
  });

  it("現在温度帯の TOP5 ピルを描画する", () => {
    render(<SectorHeatmapCard japanScore={10} />);
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
    expect(screen.getByText("④")).toBeInTheDocument();
    expect(screen.getByText("⑤")).toBeInTheDocument();
  });

  it("現在の温度帯ラベルを表示する", () => {
    render(<SectorHeatmapCard japanScore={10} />);
    expect(screen.getByText("極寒")).toBeInTheDocument();
  });

  it("/sectors への導線リンクを表示する", () => {
    render(<SectorHeatmapCard japanScore={50} />);
    const teaser = screen.getByText("フルヒートマップを見る →");
    expect(teaser.closest("a")).toHaveAttribute(
      "href",
      "/sectors?ref=dashboard_teaser"
    );
  });

  it("フルテーブルは描画しない（専用ページに移設済み）", () => {
    const { container } = render(<SectorHeatmapCard japanScore={50} />);
    expect(container.querySelector("table")).toBeNull();
  });

  it("注意書きを表示する", () => {
    const { container } = render(<SectorHeatmapCard japanScore={50} />);
    expect(container.textContent).toContain(
      "将来のリターンを保証するものではありません"
    );
  });
});
