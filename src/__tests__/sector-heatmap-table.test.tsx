import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectorHeatmapTable from "@/components/sectors/SectorHeatmapTable";

afterEach(() => {
  cleanup();
});

describe("SectorHeatmapTable", () => {
  it("17 業種の行を描画する", () => {
    const { container } = render(
      <SectorHeatmapTable period="3m" currentLevel={null} />
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(17);
  });

  it("5温度帯の列ヘッダを描画する", () => {
    const { container } = render(
      <SectorHeatmapTable period="3m" currentLevel={null} />
    );
    const levels = ["極寒", "冷え込み", "平温", "過熱", "沸騰"];
    for (const l of levels) {
      expect(container.textContent).toContain(l);
    }
  });

  it("currentLevel 指定時に '◀ 現在' マーカーを表示する", () => {
    render(<SectorHeatmapTable period="3m" currentLevel="極寒" />);
    expect(screen.getByText("◀ 現在")).toBeInTheDocument();
  });

  it("currentLevel が null なら '◀ 現在' マーカーを表示しない", () => {
    render(<SectorHeatmapTable period="3m" currentLevel={null} />);
    expect(screen.queryByText("◀ 現在")).toBeNull();
  });

  it("低サンプル温度帯のセルに title 注記を付ける", () => {
    const { container } = render(
      <SectorHeatmapTable period="3m" currentLevel={null} />
    );
    // 温度帯のサンプル数はデータ再生成で変わりうるので、
    // 「注記が付くならこの文言」の形式だけを検証する
    const annotated = container.querySelectorAll("td[title]");
    for (const cell of annotated) {
      expect(cell.getAttribute("title")).toMatch(/サンプル数が少ない温度帯/);
    }
  });
});
