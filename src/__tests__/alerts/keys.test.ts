import { describe, expect, it } from "vitest";
import {
  blocklistKey,
  emailIndexKey,
  failuresKey,
  KEY_PREFIX,
  lastStateKey,
  rateEmailKey,
  rateIpKey,
  subscriberKey,
  variantIndexKey,
  verifyPendingKey,
} from "@/lib/alerts/keys";

describe("alerts Redis keys", () => {
  it("全て alerts: プレフィックス", () => {
    expect(KEY_PREFIX).toBe("alerts");
    expect(subscriberKey("x")).toBe("alerts:sub:x");
    expect(emailIndexKey("h")).toBe("alerts:email:h");
    expect(verifyPendingKey("h")).toBe("alerts:verify-pending:h");
    expect(lastStateKey("us")).toBe("alerts:last-state:us-fg");
    expect(lastStateKey("jp")).toBe("alerts:last-state:jp-fg");
    expect(variantIndexKey("us_cold")).toBe("alerts:index:us_cold");
    expect(rateIpKey("1.2.3.4")).toBe("alerts:rate:ip:1.2.3.4");
    expect(rateEmailKey("h")).toBe("alerts:rate:email:h");
    expect(failuresKey("2026-04-24", "jp_cold")).toBe(
      "alerts:failures:2026-04-24:jp_cold"
    );
    expect(blocklistKey("h")).toBe("alerts:blocklist:h");
  });
});
