import { describe, it, expect } from "vitest";
import {
  formatReturn,
  returnColorClass,
  formatDrawdownGap,
  drawdownGapColorClass,
} from "@/lib/format";

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

describe("formatDrawdownGap", () => {
  // DD は負値（例: 温度PF -27.52% vs 積立 -23.95%）。
  // 差分（自PF − 比較対象）が負 = 自分のほうが DD が深い。
  it("差分が負なら「深い」（実データ: JP 温度PF vs 積立 = -3.57pp）", () => {
    expect(formatDrawdownGap(-3.57)).toBe("3.6pp 深い");
    expect(formatDrawdownGap(-10.94)).toBe("10.9pp 深い");
  });

  it("差分が正なら「浅い」（実データ: JP 温度PF vs 買い持ち = +4.28pp）", () => {
    expect(formatDrawdownGap(4.28)).toBe("4.3pp 浅い");
  });

  it("表示は絶対値で、+- のような二重符号にならない", () => {
    expect(formatDrawdownGap(-4.28)).not.toContain("+-");
    expect(formatDrawdownGap(-4.28)).not.toContain("--");
  });

  it("0 は「浅い」扱い（差なし）", () => {
    expect(formatDrawdownGap(0)).toBe("0.0pp 浅い");
  });
});

describe("drawdownGapColorClass", () => {
  it("浅い（正）は emerald / 深い（負）は amber", () => {
    expect(drawdownGapColorClass(4.28)).toBe("text-emerald-700");
    expect(drawdownGapColorClass(-3.57)).toBe("text-amber-700");
  });
});
