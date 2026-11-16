// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildReport,
  expectedRuns,
  formatSlotJst,
  judgeRun,
  matchesCron,
  type HealthResult,
} from "../_lib/cron-health";

const CRONS = [
  { path: "/api/cron/japan-snapshot", schedule: "0 8 * * 1-5" },
  { path: "/api/cron/japan-market", schedule: "0 7 * * 3,4" },
  { path: "/api/cron/morning", schedule: "0 22 * * 0-4" },
  { path: "/api/cron/monthly-stats", schedule: "0 0 1 * *" },
  { path: "/api/cron/cron-health", schedule: "0 11 * * *" },
];
const JOBS = {
  "japan-snapshot": [{ workflow: "snapshot-japan-fg.yml" }],
  "japan-market": [{ workflow: "update-japan-market-data.yml" }],
  morning: [
    { workflow: "update-portfolio.yml" },
    { workflow: "check-temperature-alerts.yml" },
  ],
  "monthly-stats": [{ workflow: "update-historical-stats.yml" }],
  "cron-health": [{ workflow: "check-cron-health.yml" }],
};

describe("matchesCron", () => {
  it("matches minute, hour, day-of-month and day-of-week (UTC)", () => {
    // 2026-11-16 は月曜
    expect(matchesCron("0 8 * * 1-5", new Date("2026-11-16T08:00:00Z"))).toBe(true);
    expect(matchesCron("0 8 * * 1-5", new Date("2026-11-15T08:00:00Z"))).toBe(false); // 日曜
    expect(matchesCron("0 8 * * 1-5", new Date("2026-11-16T09:00:00Z"))).toBe(false);
    expect(matchesCron("0 7 * * 3,4", new Date("2026-11-18T07:00:00Z"))).toBe(true); // 水曜
    expect(matchesCron("0 7 * * 3,4", new Date("2026-11-17T07:00:00Z"))).toBe(false);
    expect(matchesCron("0 0 1 * *", new Date("2026-12-01T00:00:00Z"))).toBe(true);
    expect(matchesCron("0 0 1 * *", new Date("2026-12-02T00:00:00Z"))).toBe(false);
  });
});

describe("expectedRuns", () => {
  it("lists the slots of the last day, one per workflow, excluding the watchdog itself", () => {
    // 月曜 20:15 JST
    const runs = expectedRuns(CRONS, JOBS, new Date("2026-11-16T11:15:00Z"), {
      exclude: ["check-cron-health.yml"],
    });
    expect(runs.map((r) => `${r.slot.toISOString()} ${r.workflow}`)).toEqual([
      "2026-11-15T22:00:00.000Z update-portfolio.yml",
      "2026-11-15T22:00:00.000Z check-temperature-alerts.yml",
      "2026-11-16T08:00:00.000Z snapshot-japan-fg.yml",
    ]);
  });

  it("skips slots that fired less than two hours ago", () => {
    const runs = expectedRuns(CRONS, JOBS, new Date("2026-11-16T09:30:00Z"), {
      exclude: ["check-cron-health.yml"],
    });
    expect(runs.some((r) => r.workflow === "snapshot-japan-fg.yml")).toBe(false);
  });

  it("expects nothing from weekday jobs on a weekend and picks up the monthly job on the 1st", () => {
    // 日曜 20:15 JST: 土曜夜〜日曜の起動予定は無い（日曜 22:00 UTC の morning はまだ先）
    expect(
      expectedRuns(CRONS, JOBS, new Date("2026-11-15T11:15:00Z"), {
        exclude: ["check-cron-health.yml"],
      })
    ).toEqual([]);
    // 12/1（火）
    const dec1 = expectedRuns(CRONS, JOBS, new Date("2026-12-01T11:15:00Z"), {
      exclude: ["check-cron-health.yml"],
    });
    expect(dec1.map((r) => r.workflow)).toContain("update-historical-stats.yml");
  });
});

describe("judgeRun", () => {
  const expected = {
    job: "morning",
    workflow: "check-temperature-alerts.yml",
    slot: new Date("2026-11-15T22:00:00Z"),
  };

  it("is ok when a run started within the window and succeeded or is still running", () => {
    expect(
      judgeRun(expected, [
        { createdAt: "2026-11-15T22:03:35Z", status: "completed", conclusion: "success" },
      ])
    ).toBe("ok");
    expect(
      judgeRun(expected, [
        { createdAt: "2026-11-15T22:40:00Z", status: "in_progress", conclusion: null },
      ])
    ).toBe("ok");
  });

  it("is failed when every run in the window failed", () => {
    expect(
      judgeRun(expected, [
        { createdAt: "2026-11-15T22:03:35Z", status: "completed", conclusion: "failure" },
      ])
    ).toBe("failed");
  });

  it("is missing when no run started in the window (a later run of the other variant does not count)", () => {
    expect(judgeRun(expected, [])).toBe("missing");
    expect(
      judgeRun(expected, [
        // 日本版アラート（11 時間後）
        { createdAt: "2026-11-16T09:38:00Z", status: "completed", conclusion: "success" },
      ])
    ).toBe("missing");
  });

  it("accepts a manual re-run within the window after a failure", () => {
    expect(
      judgeRun(expected, [
        { createdAt: "2026-11-15T22:03:35Z", status: "completed", conclusion: "failure" },
        { createdAt: "2026-11-16T01:00:00Z", status: "completed", conclusion: "success" },
      ])
    ).toBe("ok");
  });
});

describe("formatSlotJst", () => {
  it("formats the slot as a JST hour band", () => {
    expect(formatSlotJst(new Date("2026-11-15T22:00:00Z"))).toBe("11/16(月) 7時台");
    expect(formatSlotJst(new Date("2026-11-16T08:00:00Z"))).toBe("11/16(月) 17時台");
  });
});

describe("buildReport", () => {
  const base = { job: "japan-snapshot", workflow: "snapshot-japan-fg.yml", slot: new Date("2026-11-16T08:00:00Z") };
  const now = new Date("2026-11-16T11:15:00Z");

  it("returns null when everything is ok", () => {
    const results: HealthResult[] = [{ ...base, verdict: "ok" }];
    expect(buildReport(results, { repo: "o/r", now })).toBeNull();
  });

  it("lists only the problems, with the reason and the Actions link", () => {
    const results: HealthResult[] = [
      { ...base, verdict: "missing" },
      { job: "morning", workflow: "update-portfolio.yml", slot: new Date("2026-11-15T22:00:00Z"), verdict: "failed" },
      { job: "morning", workflow: "check-temperature-alerts.yml", slot: new Date("2026-11-15T22:00:00Z"), verdict: "ok" },
    ];
    const report = buildReport(results, { repo: "o/r", now });
    expect(report?.subject).toBe("【株温計】定期実行の異常 2 件（2026-11-16）");
    expect(report?.text).toContain("11/16(月) 17時台 snapshot-japan-fg.yml（japan-snapshot）: 起動されなかった");
    expect(report?.text).toContain("11/16(月) 7時台 update-portfolio.yml（morning）: 実行は始まったが失敗した");
    expect(report?.text).not.toContain("check-temperature-alerts.yml");
    expect(report?.text).toContain("https://github.com/o/r/actions");
    expect(report?.html).toContain("<li>11/16(月) 17時台 snapshot-japan-fg.yml");
  });
});
