import { describe, it, expect } from "vitest";
import { formatReturn, returnColorClass } from "@/lib/format";

describe("formatReturn", () => {
  it("正の値は + 符号付きで整形", () => {
    expect(formatReturn(1.23)).toBe("+1.2%");
    expect(formatReturn(10)).toBe("+10.0%");
  });

  it("負の値は - 符号付きで整形", () => {
    expect(formatReturn(-1.23)).toBe("-1.2%");
    expect(formatReturn(-10.5)).toBe("-10.5%");
  });

  it("0 は符号なしで整形（現状挙動を維持）", () => {
    expect(formatReturn(0)).toBe("0.0%");
  });

  it("null / undefined はダッシュを返す", () => {
    expect(formatReturn(null)).toBe("—");
    expect(formatReturn(undefined)).toBe("—");
  });

  it("小数第2位は四捨五入される", () => {
    expect(formatReturn(1.26)).toBe("+1.3%");
    expect(formatReturn(-1.26)).toBe("-1.3%");
  });
});

describe("returnColorClass", () => {
  it("正の値は赤", () => {
    expect(returnColorClass(1)).toBe("text-red-500");
  });

  it("負の値は緑", () => {
    expect(returnColorClass(-1)).toBe("text-green-500");
  });

  it("0 は緑（> 0 でないため）", () => {
    expect(returnColorClass(0)).toBe("text-green-500");
  });

  it("null / undefined はグレー", () => {
    expect(returnColorClass(null)).toBe("text-gray-400");
    expect(returnColorClass(undefined)).toBe("text-gray-400");
  });
});
