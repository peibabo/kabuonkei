import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectorHeatmapCard from "@/components/SectorHeatmapCard";

afterEach(() => {
  cleanup();
});

describe("SectorHeatmapCard", () => {
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

  it("17 業種の行を描画する", () => {
    const { container } = render(<SectorHeatmapCard japanScore={50} />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(17);
  });

  it("5温度帯の列ヘッダを描画する", () => {
    const { container } = render(<SectorHeatmapCard japanScore={50} />);
    const levels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
    for (const l of levels) {
      expect(container.textContent).toContain(l);
    }
  });

  it("現在温度帯に '◀ 現在' マーカーを表示する", () => {
    render(<SectorHeatmapCard japanScore={10} />);
    expect(screen.getByText("◀ 現在")).toBeInTheDocument();
  });

  it("TOP3 ランキングバーに3件のピルを描画する", () => {
    render(<SectorHeatmapCard japanScore={10} />);
    expect(screen.getByText("🥇")).toBeInTheDocument();
    expect(screen.getByText("🥈")).toBeInTheDocument();
    expect(screen.getByText("🥉")).toBeInTheDocument();
  });

  it("期間切替ボタンを表示する", () => {
    render(<SectorHeatmapCard japanScore={50} />);
    expect(screen.getByText("1ヶ月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("6ヶ月")).toBeInTheDocument();
  });

  it("注意書きを表示する", () => {
    const { container } = render(<SectorHeatmapCard japanScore={50} />);
    expect(container.textContent).toContain(
      "将来のリターンを保証するものではありません"
    );
    expect(container.textContent).toContain("TOPIX-17");
  });
});
