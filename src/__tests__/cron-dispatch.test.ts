// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CRON_JOBS,
  dispatchCronJob,
  isAuthorizedCronRequest,
} from "@/lib/cron-dispatch";

const root = process.cwd();

describe("isAuthorizedCronRequest", () => {
  it("accepts the Bearer header that matches the secret", () => {
    expect(isAuthorizedCronRequest("Bearer s3cret", "s3cret")).toBe(true);
  });

  it("rejects a wrong, missing or malformed header", () => {
    expect(isAuthorizedCronRequest("Bearer wrong!", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest("s3cret", "s3cret")).toBe(false);
    expect(isAuthorizedCronRequest(null, "s3cret")).toBe(false);
  });

  it("rejects every request when the secret is not configured", () => {
    expect(isAuthorizedCronRequest("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer ", "")).toBe(false);
  });
});

describe("dispatchCronJob", () => {
  it("returns null for an unknown job without calling GitHub", async () => {
    const fetchMock = vi.fn();
    expect(await dispatchCronJob("nope", "t", fetchMock)).toBeNull();
    expect(await dispatchCronJob("toString", "t", fetchMock)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("dispatches every workflow of the job on main with its inputs", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const results = await dispatchCronJob("morning", "tok", fetchMock);

    expect(results?.map((r) => r.workflow)).toEqual([
      "update-portfolio.yml",
      "check-temperature-alerts.yml",
      "post-daily-tweet.yml",
    ]);
    expect(results?.every((r) => r.ok)).toBe(true);

    const [url, init] = fetchMock.mock.calls[1] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(
      "https://api.github.com/repos/peibabo/kabuonkei/actions/workflows/check-temperature-alerts.yml/dispatches",
    );
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      ref: "main",
      inputs: { variant: "us", dry_run: "false" },
    });
  });

  it("keeps going after a failure and reports it", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Bad credentials", { status: 401 }))
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const results = await dispatchCronJob("morning", "tok", fetchMock);

    expect(results).toEqual([
      {
        workflow: "update-portfolio.yml",
        ok: false,
        status: 401,
        error: "Bad credentials",
      },
      {
        workflow: "check-temperature-alerts.yml",
        ok: false,
        status: 0,
        error: "network down",
      },
      { workflow: "post-daily-tweet.yml", ok: true, status: 204 },
    ]);
  });
});

describe("cron configuration", () => {
  const crons: { path: string; schedule: string }[] = JSON.parse(
    readFileSync(path.join(root, "vercel.json"), "utf8"),
  ).crons;

  it("has exactly one Vercel cron per job", () => {
    const jobs = crons.map((c) => c.path.replace("/api/cron/", ""));
    expect([...jobs].sort()).toEqual(Object.keys(CRON_JOBS).sort());
  });

  it("runs each cron at most once a day (Vercel Hobby limit)", () => {
    for (const { schedule } of crons) {
      const [minute, hour] = schedule.split(" ");
      expect(minute).toMatch(/^\d+$/);
      expect(hour).toMatch(/^\d+$/);
    }
  });

  it("only targets workflows that exist and accept workflow_dispatch", () => {
    const workflows = new Set(
      Object.values(CRON_JOBS).flatMap((list) => list.map((d) => d.workflow)),
    );
    for (const workflow of workflows) {
      const file = path.join(root, ".github/workflows", workflow);
      expect(existsSync(file), workflow).toBe(true);
      expect(readFileSync(file, "utf8"), workflow).toContain(
        "workflow_dispatch",
      );
    }
  });
});
