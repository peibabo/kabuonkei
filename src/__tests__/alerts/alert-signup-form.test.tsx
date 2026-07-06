import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import AlertSignupForm from "@/components/alerts/AlertSignupForm";
import { ALERT_VARIANTS } from "@/lib/types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function fillValidForm() {
  fireEvent.change(screen.getByLabelText(/メールアドレス/), {
    target: { value: "test@example.com" },
  });
  fireEvent.click(screen.getByLabelText(/プライバシーポリシー/));
}

describe("AlertSignupForm", () => {
  it("メール・variant・同意が揃うまで送信ボタンは無効", () => {
    render(<AlertSignupForm defaultVariants={[...ALERT_VARIANTS]} source="landing" />);
    const submit = screen.getByRole("button", { name: /確認メールを送る/ });
    expect(submit).toBeDisabled();

    fillValidForm();
    expect(submit).toBeEnabled();
  });

  it("variant が 0 件なら送信できない", () => {
    render(<AlertSignupForm defaultVariants={[]} source="landing" />);
    fillValidForm();
    expect(screen.getByRole("button", { name: /確認メールを送る/ })).toBeDisabled();
  });

  it("送信成功で確認メール案内を表示", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })
    );
    render(<AlertSignupForm defaultVariants={[...ALERT_VARIANTS]} source="landing" />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /確認メールを送る/ }));

    await waitFor(() => {
      expect(screen.getByText(/確認メールを送信しました/)).toBeInTheDocument();
    });
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it("API エラー時は日本語のエラーメッセージを表示", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ ok: false, error: "rate_limited" }),
      })
    );
    render(<AlertSignupForm defaultVariants={[...ALERT_VARIANTS]} source="landing" />);
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /確認メールを送る/ }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/短時間に試行しすぎました/);
    });
  });

  it("successAction が成功画面に表示される", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      })
    );
    render(
      <AlertSignupForm
        defaultVariants={[...ALERT_VARIANTS]}
        source="modal"
        successAction={<button type="button">閉じる</button>}
      />
    );
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: /確認メールを送る/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "閉じる" })).toBeInTheDocument();
    });
  });
});
