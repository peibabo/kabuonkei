import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import AlertVariantCheckboxes from "@/components/alerts/AlertVariantCheckboxes";
import type { AlertVariant } from "@/lib/types";

afterEach(() => {
  cleanup();
});

describe("AlertVariantCheckboxes", () => {
  it("4 チェックボックスを表示する", () => {
    render(<AlertVariantCheckboxes value={[]} onChange={() => {}} />);
    expect(screen.getAllByRole("checkbox")).toHaveLength(4);
  });

  it("value に含まれる variant は checked になる", () => {
    render(
      <AlertVariantCheckboxes
        value={["jp_cold", "us_hot"]}
        onChange={() => {}}
      />
    );
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    const labels = checkboxes.map((c) => {
      const label = c.closest("label");
      return { checked: c.checked, text: label?.textContent ?? "" };
    });
    const coldJp = labels.find((l) => l.text.includes("日本 極寒"));
    const hotUs = labels.find((l) => l.text.includes("米国 過熱"));
    expect(coldJp?.checked).toBe(true);
    expect(hotUs?.checked).toBe(true);
  });

  it("クリックで onChange が呼ばれる（トグル）", () => {
    const onChange = vi.fn<(next: AlertVariant[]) => void>();
    render(<AlertVariantCheckboxes value={[]} onChange={onChange} />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it("既にチェック済みをクリックで解除される", () => {
    const onChange = vi.fn<(next: AlertVariant[]) => void>();
    render(
      <AlertVariantCheckboxes value={["jp_cold"]} onChange={onChange} />
    );
    const checkbox = screen
      .getAllByRole("checkbox")
      .find((c) =>
        (c as HTMLInputElement).closest("label")?.textContent?.includes(
          "日本 極寒"
        )
      );
    fireEvent.click(checkbox!);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("disabled=true で全チェックが無効化", () => {
    render(
      <AlertVariantCheckboxes value={[]} onChange={() => {}} disabled />
    );
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes.forEach((c) => expect(c.disabled).toBe(true));
  });
});
