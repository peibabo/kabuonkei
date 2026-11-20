import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import FearGreedGauge, { describeSupply, formatOkuYen } from "@/components/FearGreedGauge";
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

  it("需給は温度にせず、実数を文で別枠に表示する", () => {
    render(<FearGreedGauge market="jp" data={buildData()} />);
    const box = screen.getByTestId("supply-facts");
    expect(within(box).getByText("需給（週次・JPX）")).toBeInTheDocument();
    expect(within(box).getByText("海外投資家フロー")).toBeInTheDocument();
    expect(within(box).getByText("4週で 4,000億円の買い越し")).toBeInTheDocument();
    expect(within(box).getByText("信用買い残の増減")).toBeInTheDocument();
    expect(within(box).getByText("4週で 6.0% 減少")).toBeInTheDocument();
    // 0〜100 のスコア（60 / 30）や「°」は出さない
    expect(within(box).queryByText("60")).toBeNull();
    expect(within(box).queryByText("30")).toBeNull();
    expect(box.textContent).not.toContain("°");
  });

  it("欠損した需給要素はダッシュで表示する", () => {
    const data = buildData();
    data.components[2] = {
      id: "marginBuyChange",
      label: "信用買い残の増減",
      group: "supply",
      score: 50,
      rawValue: null,
      available: false,
    };
    render(<FearGreedGauge market="jp" data={data} />);
    expect(within(screen.getByTestId("supply-facts")).getAllByText("—")).toHaveLength(1);
  });

  it("需給データがまったく無ければ両方ダッシュ", () => {
    const data = buildData();
    data.components = data.components.map((c) =>
      c.group === "supply" ? { ...c, available: false, rawValue: null } : c,
    );
    render(<FearGreedGauge market="jp" data={data} />);
    expect(within(screen.getByTestId("supply-facts")).getAllByText("—")).toHaveLength(2);
  });
});

describe("describeSupply", () => {
  const comp = (id: "foreignFlow" | "marginBuyChange", rawValue: number | null) => ({
    id,
    label: "",
    group: "supply" as const,
    score: 50,
    rawValue,
    available: rawValue != null,
  });

  it("海外投資家フローは売り越し・買い越しで書き分け、兆円にも対応", () => {
    expect(describeSupply(comp("foreignFlow", -5771))).toBe("4週で 5,771億円の売り越し");
    expect(describeSupply(comp("foreignFlow", 20467))).toBe("4週で 2.0兆円の買い越し");
    expect(describeSupply(comp("foreignFlow", 0))).toBe("4週で売り買いが均衡");
  });

  it("信用買い残は増加・減少で書き分ける", () => {
    expect(describeSupply(comp("marginBuyChange", -12.3))).toBe("4週で 12.3% 減少");
    expect(describeSupply(comp("marginBuyChange", 4))).toBe("4週で 4.0% 増加");
    expect(describeSupply(comp("marginBuyChange", 0))).toBe("4週で横ばい");
  });

  it("取れなければ null", () => {
    expect(describeSupply(comp("foreignFlow", null))).toBeNull();
  });
});

describe("formatOkuYen", () => {
  it("1 兆円以上は兆円、それ未満は億円で符号付き", () => {
    expect(formatOkuYen(12345)).toBe("+1.2兆円");
    expect(formatOkuYen(-3450)).toBe("-3,450億円");
    expect(formatOkuYen(0)).toBe("0億円");
  });
});
