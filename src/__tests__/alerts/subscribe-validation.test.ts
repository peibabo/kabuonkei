import { describe, expect, it } from "vitest";
import { validateSubscribeInput } from "@/lib/alerts/subscribers";

describe("validateSubscribeInput", () => {
  const valid = {
    email: "user@example.com",
    variants: ["jp_cold"],
    consent: true,
    hp_field: "",
  };

  it("正常な入力は OK", () => {
    const r = validateSubscribeInput(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.email).toBe("user@example.com");
      expect(r.variants).toEqual(["jp_cold"]);
    }
  });

  it("email は trim + 小文字化される", () => {
    const r = validateSubscribeInput({ ...valid, email: "  USER@Example.COM  " });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.email).toBe("user@example.com");
  });

  it("variants は重複を排除する", () => {
    const r = validateSubscribeInput({
      ...valid,
      variants: ["jp_cold", "jp_cold", "us_hot"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.variants).toEqual(["jp_cold", "us_hot"]);
  });

  it("consent が true でない場合 reject", () => {
    expect(validateSubscribeInput({ ...valid, consent: false }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, consent: "true" }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, consent: undefined }).ok).toBe(false);
  });

  it("honeypot が埋まっていたら reject", () => {
    expect(validateSubscribeInput({ ...valid, hp_field: "bot" }).ok).toBe(false);
  });

  it("email 不正形式で reject", () => {
    expect(validateSubscribeInput({ ...valid, email: "not-an-email" }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, email: "" }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, email: "a@b" }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, email: 123 }).ok).toBe(false);
  });

  it("email が 255 文字以上で reject", () => {
    const long = "a".repeat(250) + "@b.co";
    expect(validateSubscribeInput({ ...valid, email: long }).ok).toBe(false);
  });

  it("variants 空で reject", () => {
    expect(validateSubscribeInput({ ...valid, variants: [] }).ok).toBe(false);
    expect(validateSubscribeInput({ ...valid, variants: undefined }).ok).toBe(false);
  });

  it("variants に不明値混入で reject", () => {
    expect(validateSubscribeInput({ ...valid, variants: ["foo"] }).ok).toBe(false);
    expect(
      validateSubscribeInput({ ...valid, variants: ["jp_cold", "unknown"] }).ok
    ).toBe(false);
  });

  it("variants が配列でない場合 reject", () => {
    expect(validateSubscribeInput({ ...valid, variants: "jp_cold" }).ok).toBe(false);
  });
});
