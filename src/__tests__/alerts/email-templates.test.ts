import { describe, expect, it } from "vitest";
import {
  buildAlertEmail,
  buildVerifyEmail,
  variantLabel,
} from "@/lib/alerts/email-templates";

describe("buildVerifyEmail", () => {
  const input = {
    verifyUrl: "https://kabuonkei.com/api/alerts/verify?token=abc",
    unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=xyz",
    email: "user@example.com",
    variants: ["us_cold" as const, "jp_hot" as const],
  };

  it("件名に確認の意図が含まれる", () => {
    const r = buildVerifyEmail(input);
    expect(r.subject).toContain("確認");
    expect(r.subject).toContain("株温計");
  });

  it("text / html に verify URL と unsubscribe URL が含まれる", () => {
    const r = buildVerifyEmail(input);
    expect(r.text).toContain(input.verifyUrl);
    expect(r.text).toContain(input.unsubscribeUrl);
    expect(r.html).toContain(input.verifyUrl);
    expect(r.html).toContain(input.unsubscribeUrl);
  });

  it("選択した variants のラベルが含まれる", () => {
    const r = buildVerifyEmail(input);
    expect(r.text).toContain("米国");
    expect(r.text).toContain("日本");
  });

  it("HTML は email をエスケープする", () => {
    const r = buildVerifyEmail({ ...input, email: "<script>@x.com" });
    expect(r.html).not.toContain("<script>@x.com");
    expect(r.html).toContain("&lt;script&gt;");
  });
});

describe("buildAlertEmail", () => {
  it("極寒の件名に警告マーク / 市場 / スコア", () => {
    const r = buildAlertEmail({
      market: "us",
      kind: "cold",
      score: 15,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
    });
    expect(r.subject).toContain("米国");
    expect(r.subject).toContain("極寒");
    expect(r.subject).toContain("15");
    expect(r.text).toContain("15 / 100");
    expect(r.html).toContain("スコア 15 / 100");
  });

  it("hot でスコア 81 以上なら「沸騰（総楽観）」", () => {
    const r = buildAlertEmail({
      market: "jp",
      kind: "hot",
      score: 85,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
    });
    expect(r.subject).toContain("日本");
    expect(r.subject).toContain("沸騰");
    expect(r.text).toContain("沸騰（総楽観）");
  });

  it("hot でスコアちょうど 80 なら温度計ゲージと同じ「過熱（強気）」", () => {
    const r = buildAlertEmail({
      market: "jp",
      kind: "hot",
      score: 80,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
    });
    expect(r.subject).toContain("過熱");
    expect(r.subject).not.toContain("沸騰");
    expect(r.text).toContain("過熱（強気）");
  });

  it("cold でスコアちょうど 20 は「極寒（総悲観）」", () => {
    const r = buildAlertEmail({
      market: "us",
      kind: "cold",
      score: 20,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
    });
    expect(r.subject).toContain("極寒");
    expect(r.text).toContain("極寒（総悲観）");
  });

  it("類似日を含める", () => {
    const r = buildAlertEmail({
      market: "us",
      kind: "cold",
      score: 15,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
      similarDay: {
        date: "2020-03-23",
        label: "コロナショック底",
        return1m: 12.3,
        return3m: 28.4,
        return6m: 37.1,
      },
    });
    expect(r.text).toContain("2020-03-23");
    expect(r.text).toContain("コロナショック底");
    expect(r.text).toContain("+12.3%");
  });

  it("unsubscribe URL を必ず含める", () => {
    const r = buildAlertEmail({
      market: "us",
      kind: "cold",
      score: 15,
      dateLabelJst: "2026/04/24(金)",
      dashboardUrl: "https://kabuonkei.com/",
      unsubscribeUrl: "https://kabuonkei.com/api/alerts/unsubscribe?token=x",
    });
    expect(r.text).toContain("https://kabuonkei.com/api/alerts/unsubscribe?token=x");
    expect(r.html).toContain("https://kabuonkei.com/api/alerts/unsubscribe?token=x");
  });
});

describe("variantLabel", () => {
  it("全 variants に日本語ラベル", () => {
    expect(variantLabel("us_cold")).toContain("米国");
    expect(variantLabel("us_hot")).toContain("米国");
    expect(variantLabel("jp_cold")).toContain("日本");
    expect(variantLabel("jp_hot")).toContain("日本");
  });
});
