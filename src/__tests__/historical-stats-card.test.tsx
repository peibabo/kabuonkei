import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import HistoricalStatsCard from "@/components/HistoricalStatsCard";

afterEach(() => {
  cleanup();
});

describe("HistoricalStatsCard", () => {
  it("ヘッダーを表示する", () => {
    render(<HistoricalStatsCard currentScore={50} />);
    expect(screen.getByText("🇺🇸 過去の統計（米国版温度）")).toBeInTheDocument();
    expect(
      screen.getByText("米国版温度が同じだったとき、S&P500 はどう動いた？")
    ).toBeInTheDocument();
  });

  it("5つの温度帯を全て表示する", () => {
    render(<HistoricalStatsCard currentScore={50} />);
    expect(screen.getAllByText("極寒").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("冷え込み").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("平温").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("過熱").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("沸騰").length).toBeGreaterThanOrEqual(1);
  });

  it("現在のレベルに◀ 現在マーカーを表示する", () => {
    render(<HistoricalStatsCard currentScore={10} />);
    // スコア10 → 極寒
    expect(screen.getAllByText("◀ 現在").length).toBeGreaterThanOrEqual(1);
  });

  it("ハイライトメッセージにリターン情報を含む", () => {
    const { container } = render(<HistoricalStatsCard currentScore={10} />);
    expect(container.textContent).toContain("極寒");
    expect(container.textContent).toContain("3ヶ月後にS&P500が上昇した");
  });

  it("注意書きを表示する", () => {
    const { container } = render(<HistoricalStatsCard currentScore={50} />);
    expect(container.textContent).toContain(
      "将来のリターンを保証するものではありません"
    );
  });

  it("データ期間を表示する", () => {
    const { container } = render(<HistoricalStatsCard currentScore={50} />);
    expect(container.textContent).toContain("データ期間");
  });
});
