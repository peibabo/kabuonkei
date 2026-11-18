import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import TemperatureTiles, {
  buildWeekSeries,
  weekChangeLabel,
} from "@/components/hero/TemperatureTiles";
import HistoricalPercentileBadge from "@/components/HistoricalPercentileBadge";

vi.mock("@/lib/score-distribution", () => ({
  // スコアに関係なく下位 14% / 上位 14% を返すモック（温度帯との矛盾チェック用）
  getScorePercentile: (score: number) => ({
    percentile: score < 50 ? 14 : score > 50 ? 86 : 14,
    rank: 347,
    total: 2514,
    dataRange: { from: "2016-01-01", to: "2026-01-01" },
  }),
}));

describe("buildWeekSeries", () => {
  it("過去の点の末尾に今の値を足す", () => {
    expect(buildWeekSeries([23, 22, 19, 15, 15], 16)).toEqual([23, 22, 19, 15, 15, 16]);
  });
  it("データがなければ空", () => {
    expect(buildWeekSeries([], 16)).toEqual([]);
    expect(buildWeekSeries([1, 2], null)).toEqual([]);
  });
});

describe("weekChangeLabel", () => {
  it("幅に応じた言葉を返す", () => {
    expect(weekChangeLabel(-10)).toBe("↓ 大きく下降");
    expect(weekChangeLabel(-4)).toBe("↘ 下降");
    expect(weekChangeLabel(2)).toBe("→ ほぼ横ばい");
    expect(weekChangeLabel(5)).toBe("↗ 上昇");
    expect(weekChangeLabel(12)).toBe("↑ 大きく上昇");
  });
});

describe("TemperatureTiles", () => {
  it("日米別の 1 週間の変化を表示し、日米平均は出さない", () => {
    const { container } = render(
      <TemperatureTiles
        jp={16}
        us={48}
        jpSparkline={[26, 25, 24, 22, 19]}
        usSparkline={[50, 49, 48]}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("日本 この1週間");
    expect(text).toContain("26° → 16°");
    expect(text).toContain("-10");
    expect(text).toContain("50° → 48°");
    expect(text).not.toContain("日米平均");
  });
});

describe("HistoricalPercentileBadge", () => {
  it("平温（48）では下位 14% でも「冷たい」と出さない", () => {
    const { container } = render(<HistoricalPercentileBadge score={48} market="us" />);
    expect(container.textContent).not.toContain("冷たい");
    expect(container.textContent).toContain("このスコア以下だった日は");
  });
  it("極寒（16）なら「冷たい」を出す", () => {
    const { container } = render(<HistoricalPercentileBadge score={16} market="jp" />);
    expect(container.textContent).toContain("歴史的にも冷たい水準");
  });
  it("平温（55）では上位 14% でも「熱い」と出さない", () => {
    const { container } = render(<HistoricalPercentileBadge score={55} market="us" />);
    expect(container.textContent).not.toContain("熱い");
  });
});
