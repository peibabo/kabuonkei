import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import AlertBanner from "@/components/alerts/AlertBanner";

afterEach(() => {
  cleanup();
});

describe("AlertBanner", () => {
  it("平温時は控えめな CTA を表示", () => {
    render(<AlertBanner japanScore={50} usScore={55} />);
    expect(screen.getByText(/極端温度/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /アラート登録/ })).toBeInTheDocument();
    expect(screen.queryByText(/今、温度が極端です/)).toBeNull();
  });

  it("日本が極寒のとき強調表示", () => {
    render(<AlertBanner japanScore={15} usScore={50} />);
    expect(screen.getByText(/今、温度が極端です/)).toBeInTheDocument();
    expect(screen.getByText(/日本 極寒/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /このタイミングで登録/ })
    ).toBeInTheDocument();
  });

  it("米国が過熱のとき強調表示", () => {
    render(<AlertBanner japanScore={50} usScore={85} />);
    expect(screen.getByText(/今、温度が極端です/)).toBeInTheDocument();
    expect(screen.getByText(/米国 過熱/)).toBeInTheDocument();
  });

  it("両方が極端の場合は両方表示", () => {
    render(<AlertBanner japanScore={12} usScore={88} />);
    const label = screen.getByText(/今、温度が極端です/);
    expect(label.textContent).toContain("米国 過熱");
    expect(label.textContent).toContain("日本 極寒");
  });

  it("score が null なら平温扱い", () => {
    render(<AlertBanner japanScore={null} usScore={null} />);
    expect(screen.queryByText(/今、温度が極端です/)).toBeNull();
  });

  it("境界値 20 / 80 も極端扱い", () => {
    const { unmount } = render(<AlertBanner japanScore={20} usScore={50} />);
    expect(screen.getByText(/日本 極寒/)).toBeInTheDocument();
    unmount();

    render(<AlertBanner japanScore={50} usScore={80} />);
    expect(screen.getByText(/米国 過熱/)).toBeInTheDocument();
  });

  it("クリックでモーダルを開く", () => {
    render(<AlertBanner japanScore={50} usScore={50} />);
    const button = screen.getByRole("button", { name: /アラート登録/ });
    fireEvent.click(button);
    // モーダルは最初 aria-hidden でフェードイン開始のため hidden オプションで取得
    expect(
      screen.getByRole("dialog", { hidden: true })
    ).toBeInTheDocument();
    expect(screen.getByText(/温度アラートに登録/)).toBeInTheDocument();
  });
});
