import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import JapanFearGreedGauge from "@/components/JapanFearGreedGauge";
import type { JapanFearGreedData } from "@/lib/types";

afterEach(() => {
  cleanup();
});

function buildData(
  overrides: Partial<JapanFearGreedData> = {}
): JapanFearGreedData {
  return {
    score: 50,
    level: "平温",
    availableCount: 5,
    generatedAt: "2026-04-17T00:00:00.000Z",
    components: [
      {
        id: "nikkeiMa",
        label: "日経225モメンタム",
        score: 50,
        rawValue: 0,
        available: true,
      },
      {
        id: "foreignFlow",
        label: "海外投資家フロー",
        score: 60,
        rawValue: 8000,
        available: true,
      },
      {
        id: "marginRatio",
        label: "信用倍率",
        score: 70,
        rawValue: 4.5,
        available: true,
      },
      {
        id: "arbitrage",
        label: "裁定残バランス",
        score: 80,
        rawValue: 0.95,
        available: true,
      },
      {
        id: "usdJpyMomentum",
        label: "ドル円モメンタム",
        score: 55,
        rawValue: 0.5,
        available: true,
      },
    ],
    ...overrides,
  };
}

describe("JapanFearGreedGauge", () => {
  it("タイトルを表示する", () => {
    render(<JapanFearGreedGauge data={buildData()} />);
    expect(screen.getByText("市場温度（日本）")).toBeInTheDocument();
  });

  it("カスタムタイトルを渡せる", () => {
    render(<JapanFearGreedGauge data={buildData()} title="日本センチメント" />);
    expect(screen.getByText("日本センチメント")).toBeInTheDocument();
  });

  it("スコア・温度レベル・説明を表示する", () => {
    render(<JapanFearGreedGauge data={buildData({ score: 75, level: "過熱" })} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("過熱")).toBeInTheDocument();
    expect(screen.getByText("（強気）")).toBeInTheDocument();
  });

  it("5つの構成要素ラベルを表示する", () => {
    render(<JapanFearGreedGauge data={buildData()} />);
    expect(screen.getByText("日経225モメンタム")).toBeInTheDocument();
    expect(screen.getByText("海外投資家フロー")).toBeInTheDocument();
    expect(screen.getByText("信用倍率")).toBeInTheDocument();
    expect(screen.getByText("裁定残バランス")).toBeInTheDocument();
    expect(screen.getByText("ドル円モメンタム")).toBeInTheDocument();
  });

  it("利用可能数を表示する", () => {
    render(
      <JapanFearGreedGauge data={buildData({ availableCount: 3 })} />
    );
    expect(screen.getByText("構成要素（3/5 利用可能）")).toBeInTheDocument();
  });

  it("欠損要素はダッシで表示する", () => {
    const data = buildData();
    data.components[1] = {
      id: "foreignFlow",
      label: "海外投資家フロー",
      score: 50,
      rawValue: null,
      available: false,
    };
    data.availableCount = 4;
    render(<JapanFearGreedGauge data={data} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
