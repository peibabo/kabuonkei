import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ForwardReturnTable from "@/components/learn/ForwardReturnTable";
import WhatIsMarginRatioPage from "@/app/learn/what-is-margin-ratio/page";
import WhatIsFearGreedPage from "@/app/learn/what-is-fear-greed/page";
import WhatIsDrawdownPage from "@/app/learn/what-is-drawdown/page";
import WhenToBuyStocksPage from "@/app/learn/when-to-buy-stocks/page";
import { getMarginRatioAnalysis } from "@/lib/margin-ratio-analysis";
import { getHistoricalStats } from "@/lib/historical-stats";
import { getNikkeiCrashAnalysis } from "@/lib/nikkei-crash-analysis";
import { getVixSp500Analysis, poolVixJointCells } from "@/lib/vix-sp500-analysis";

// next/script は jsdom では何もしないので素通しにする
vi.mock("next/script", () => ({ default: () => null }));

const stats = (avgReturn: number, winRate: number) => ({
  avgReturn,
  medianReturn: avgReturn,
  winRate,
  sampleSize: 10,
});

describe("ForwardReturnTable", () => {
  it("件数・平均（符号付き）・勝率を並べ、データが無い期間は — にする", () => {
    render(
      <ForwardReturnTable
        caption="テストの表"
        conditionLabel="条件"
        countUnit="週"
        periods={[
          { key: "3m", label: "3ヶ月後" },
          { key: "6m", label: "6ヶ月後" },
        ]}
        rows={[
          { label: "A", count: 1234, stats: { "3m": stats(4.25, 68.6), "6m": stats(-1.04, 40) } },
          { label: "B", count: 5, stats: { "3m": stats(0, 50) }, highlight: true },
        ]}
      />
    );
    const table = screen.getByRole("table", { name: "テストの表" });
    const rowA = within(table).getByRole("row", { name: /^A/ });
    expect(rowA).toHaveTextContent("1,234週");
    expect(rowA).toHaveTextContent("+4.3%勝率 69%・10週");
    expect(rowA).toHaveTextContent("-1.0%勝率 40%・10週");
    const rowB = within(table).getByRole("row", { name: /^B/ });
    expect(rowB).toHaveTextContent("0.0%勝率 50%・10週");
    expect(rowB).toHaveTextContent("——");
    expect(rowB.className).toContain("bg-amber-50");
    // 0 はプラスでもマイナスでもないので灰色
    expect(within(rowB).getByText("0.0%").className).toContain("text-gray-600");
  });

  it("プラスは赤・マイナスは緑（日本式）", () => {
    render(
      <ForwardReturnTable
        caption="色"
        conditionLabel="条件"
        countUnit="日"
        periods={[{ key: "1m", label: "1ヶ月後" }]}
        rows={[
          { label: "上", count: 1, stats: { "1m": stats(2, 60) } },
          { label: "下", count: 1, stats: { "1m": stats(-2, 40) } },
        ]}
      />
    );
    expect(screen.getByText("+2.0%").className).toContain("text-red-500");
    expect(screen.getByText("-2.0%").className).toContain("text-green-500");
  });
});

describe("解説記事に載せた株温計の自前データ", () => {
  it("信用倍率: 水準別の表に全帯が週数つきで出る", () => {
    render(<WhatIsMarginRatioPage />);
    const table = screen.getByRole("table", { name: /信用倍率の水準別・その後の日経225/ });
    for (const band of getMarginRatioAnalysis().marginalRatio) {
      expect(within(table).getByRole("row", { name: new RegExp(band.band) })).toHaveTextContent(
        `${band.occurrences}週`
      );
    }
  });

  it("Fear & Greed: 米国版の温度帯 5 つがその後の S&P500 と一緒に出る", () => {
    render(<WhatIsFearGreedPage />);
    const table = screen.getByRole("table", { name: /米国版の温度帯別・その後の S&P500/ });
    const levels = getHistoricalStats("us").levels;
    expect(levels).toHaveLength(5);
    for (const l of levels) {
      expect(within(table).getByRole("row", { name: new RegExp(l.level) })).toHaveTextContent(
        `${l.occurrences.toLocaleString()}日`
      );
    }
  });

  it("ドローダウン: 拾った局面数と、6ヶ月が経過した局面での集計が区別して出る", () => {
    render(<WhatIsDrawdownPage />);
    const crash = getNikkeiCrashAnalysis();
    const dd = crash.summary.drawdown;
    expect(screen.getByText(`${crash.episodes.length} 回`)).toBeInTheDocument();
    const table = screen.getByRole("table", { name: new RegExp(`6ヶ月が経過した ${dd.count} 回`) });
    expect(table).toHaveTextContent(`${dd.bottomOnCrashDay} 回 / ${dd.count} 回`);
    expect(table).toHaveTextContent(`${dd.medianDrawdown.toFixed(1)}%`);
    expect(table).toHaveTextContent(`${dd.medianDaysToLow} 営業日`);
  });

  it("買い時まとめ: 全セルを 3 グループに分け、日数の合計が全体と一致する", () => {
    render(<WhenToBuyStocksPage />);
    const table = screen.getByRole("table", { name: /VIX の水準 × 日本の市場温度/ });
    const analysis = getVixSp500Analysis();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.querySelector("th")?.textContent)).toEqual([
      "悲観がそろった日",
      "それ以外の日",
      "楽観がそろった日",
    ]);
    const total = rows.reduce(
      (sum, r) => sum + Number(r.querySelector("td")?.textContent?.replace(/[,日]/g, "")),
      0
    );
    expect(total).toBe(analysis.joint.cells.reduce((sum, c) => sum + c.occurrences, 0));
  });
});

describe("poolVixJointCells", () => {
  it("平均・勝率は集計数で重み付けし、集計数は合計する", () => {
    const cell = (avg: number, win: number, n: number) => ({
      vixBand: "x",
      tempBand: "平温" as const,
      occurrences: n,
      returns: {
        "1m": { avgReturn: avg, medianReturn: avg, winRate: win, sampleSize: n },
        "3m": { avgReturn: avg, medianReturn: avg, winRate: win, sampleSize: n },
        "6m": { avgReturn: avg, medianReturn: avg, winRate: win, sampleSize: 0 },
      },
    });
    const pooled = poolVixJointCells([cell(10, 100, 1), cell(-2, 40, 3)]);
    expect(pooled.occurrences).toBe(4);
    expect(pooled.returns["3m"]).toEqual({ avgReturn: 1, winRate: 55, sampleSize: 4 });
    // 集計数が 0 の期間は出さない
    expect(pooled.returns["6m"]).toBeUndefined();
  });
});
