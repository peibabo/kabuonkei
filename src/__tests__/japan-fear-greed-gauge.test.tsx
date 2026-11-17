import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import FearGreedGauge, { formatOkuYen } from "@/components/FearGreedGauge";
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
    generatedAt: "2026-04-17T00:00:00.000Z",
    components: [
      {
        id: "nikkeiMa",
        label: "日経225モメンタム",
        group: "price",
        score: 50,
        rawValue: 0,
        available: true,
      },
      {
        id: "foreignFlow",
        label: "海外投資家フロー",
        group: "supply",
        score: 60,
        rawValue: 4000,
        available: true,
      },
      {
        id: "marginBuyChange",
        label: "信用買い残の増減",
        group: "supply",
        score: 30,
        rawValue: -6,
        available: true,
      },
    ],
    supply: { score: 45, level: "平温", availableCount: 2 },
    ...overrides,
  };
}

describe("JapanFearGreedGauge", () => {
  it("タイトルを表示する", () => {
    render(<FearGreedGauge market="jp" data={buildData()} />);
    expect(screen.getByText("🇯🇵 市場温度（日本）")).toBeInTheDocument();
  });

  it("サブタイトルに計算方法を表示する", () => {
    render(<FearGreedGauge market="jp" data={buildData()} />);
    expect(screen.getByText("日経225 × 125日移動平均乖離")).toBeInTheDocument();
  });

  it("カスタムタイトルを渡せる", () => {
    render(<FearGreedGauge market="jp" data={buildData()} title="日本センチメント" />);
    expect(screen.getByText("日本センチメント")).toBeInTheDocument();
  });

  it("スコア・温度レベル・説明を表示する", () => {
    render(<FearGreedGauge market="jp" data={buildData({ score: 75, level: "過熱" })} />);
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText("過熱")).toBeInTheDocument();
    expect(screen.getByText("（強気）")).toBeInTheDocument();
  });

  it("日経225 の移動平均乖離率を表示する", () => {
    const data = buildData({ score: 7, level: "極寒" });
    data.components[0].rawValue = -13.0;
    render(<FearGreedGauge market="jp" data={data} />);
    expect(screen.getByText("-13.0%")).toBeInTheDocument();
  });

  it("需給の温度と内訳を、市場温度とは別枠で表示する", () => {
    render(<FearGreedGauge market="jp" data={buildData()} />);
    const box = screen.getByTestId("supply-temperature");
    expect(within(box).getByText("需給の温度（週次）")).toBeInTheDocument();
    expect(within(box).getByText("45°", { exact: false })).toBeInTheDocument();
    expect(within(box).getByText("海外投資家フロー")).toBeInTheDocument();
    expect(within(box).getByText("4週 +4,000億円")).toBeInTheDocument();
    expect(within(box).getByText("信用買い残の増減")).toBeInTheDocument();
    expect(within(box).getByText("4週 -6.0%")).toBeInTheDocument();
  });

  it("欠損した需給要素はダッシュで表示する", () => {
    const data = buildData({ supply: { score: 60, level: "平温", availableCount: 1 } });
    data.components[2] = {
      id: "marginBuyChange",
      label: "信用買い残の増減",
      group: "supply",
      score: 50,
      rawValue: null,
      available: false,
    };
    render(<FearGreedGauge market="jp" data={data} />);
    expect(within(screen.getByTestId("supply-temperature")).getByText("—")).toBeInTheDocument();
  });

  it("需給データがまったく無ければ需給の温度はダッシュ", () => {
    const data = buildData({ supply: null });
    data.components = data.components.map((c) =>
      c.group === "supply" ? { ...c, available: false, rawValue: null } : c,
    );
    render(<FearGreedGauge market="jp" data={data} />);
    const box = screen.getByTestId("supply-temperature");
    expect(within(box).getAllByText("—")).toHaveLength(3);
  });
});

describe("formatOkuYen", () => {
  it("1 兆円以上は兆円、それ未満は億円で符号付き", () => {
    expect(formatOkuYen(12345)).toBe("+1.2兆円");
    expect(formatOkuYen(-3450)).toBe("-3,450億円");
    expect(formatOkuYen(0)).toBe("0億円");
  });
});
