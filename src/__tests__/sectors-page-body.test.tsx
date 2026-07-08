import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import SectorsPageBody from "@/components/sectors/SectorsPageBody";
import type { UseMarketDataResult } from "@/components/dashboard/useMarketData";

const mockResult: UseMarketDataResult = {
  data: null,
  loading: false,
  error: null,
};

vi.mock("@/components/dashboard/useMarketData", () => ({
  useMarketData: () => mockResult,
}));

beforeEach(() => {
  mockResult.data = null;
  mockResult.loading = false;
  mockResult.error = null;
});

afterEach(() => {
  cleanup();
});

describe("SectorsPageBody", () => {
  it("スコア未取得でもフルテーブルを描画する", () => {
    const { container } = render(<SectorsPageBody />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(17);
    expect(screen.queryByText("◀ 現在")).toBeNull();
  });

  it("スコア未取得でも温度帯別 TOP5 を 5 帯ぶん描画する", () => {
    render(<SectorsPageBody />);
    expect(
      screen.getByText(/温度帯別の強かった業種 TOP5/)
    ).toBeInTheDocument();
    // 帯別カードの見出し（該当 N 日）が 5 つある
    expect(screen.getAllByText(/該当 \d+ 日/)).toHaveLength(5);
  });

  it("スコア取得後に現在帯コールアウトとハイライトを表示する", () => {
    mockResult.data = {
      japanFearGreed: { score: 10 },
    } as unknown as UseMarketDataResult["data"];
    render(<SectorsPageBody />);
    expect(screen.getByText(/10度（極寒）/)).toBeInTheDocument();
    expect(screen.getByText("◀ 現在")).toBeInTheDocument();
  });

  it("期間切替ボタンを 3 つ表示する", () => {
    render(<SectorsPageBody />);
    expect(screen.getByText("1ヶ月")).toBeInTheDocument();
    expect(screen.getByText("3ヶ月")).toBeInTheDocument();
    expect(screen.getByText("6ヶ月")).toBeInTheDocument();
  });

  it("データ期間と生成日のフッタを表示する", () => {
    const { container } = render(<SectorsPageBody />);
    expect(container.textContent).toContain("データ期間:");
    expect(container.textContent).toContain("毎月1日に自動更新");
  });
});
