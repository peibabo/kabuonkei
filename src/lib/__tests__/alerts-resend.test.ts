import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "../alerts/resend";

describe("sendEmail", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "alerts@example.com");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function sentBody(): Record<string, unknown> {
    return JSON.parse(fetchMock.mock.calls[0][1].body as string);
  }

  it("添付ファイルを Resend の attachments（filename + base64 content）として送る", async () => {
    const res = await sendEmail({
      to: "ops@example.com",
      subject: "s",
      text: "t",
      html: "<p>t</p>",
      attachments: [{ filename: "a.png", content: Buffer.from("png").toString("base64") }],
    });
    expect(res).toEqual({ ok: true, id: "abc" });
    expect(sentBody().attachments).toEqual([{ filename: "a.png", content: "cG5n" }]);
  });

  it("添付が無いときは attachments を送らない", async () => {
    await sendEmail({ to: "ops@example.com", subject: "s", text: "t", html: "<p>t</p>" });
    expect(sentBody()).not.toHaveProperty("attachments");
  });
});
