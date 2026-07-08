import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectorRotationBody from "@/components/analysis/SectorRotationBody";

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("SectorRotationBody", () => {
  it("温度帯別の全業種平均テーブルに 5 温度帯を描画する", () => {
    const { container } = render(<SectorRotationBody />);
    const levels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
    for (const l of levels) {
      expect(container.textContent).toContain(l);
    }
    expect(container.textContent).toContain("全業種平均");
  });

  it("極寒と沸騰の対比カードに TOP5 / WORST3 を描画する", () => {
    render(<SectorRotationBody />);
    expect(screen.getAllByText("強かった TOP5")).toHaveLength(2);
    expect(screen.getAllByText("弱かった WORST3")).toHaveLength(2);
  });

  it("ディフェンシブ vs 景気敏感の比較テーブルを描画する", () => {
    const { container } = render(<SectorRotationBody />);
    expect(container.textContent).toContain("ディフェンシブ");
    expect(container.textContent).toContain("景気敏感");
    expect(container.textContent).toContain("食品・医薬品・電力ガス");
  });

  it("期間切替ボタンを 3 つ表示する", () => {
    render(<SectorRotationBody />);
    expect(screen.getByText("1ヶ月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("6ヶ月")).toBeInTheDocument();
  });

  it("マウント時に analysis_view イベントを送信する", async () => {
    const { trackEvent } = await import("@/lib/analytics");
    render(<SectorRotationBody />);
    expect(trackEvent).toHaveBeenCalledWith("analysis_view", {
      slug: "sector-rotation-temperature",
    });
  });
});
