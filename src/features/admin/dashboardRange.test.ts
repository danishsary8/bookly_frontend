import { afterEach, describe, expect, it, vi } from "vitest";
import { daysIn, rangeDays, rangeFromParams, rangeProblem, rangeToParams } from "./dashboardRange";

describe("dashboard range", () => {
  it("reads presets and custom days from the URL, and falls back to 30 days", () => {
    expect(rangeFromParams(new URLSearchParams("period=7d"))).toEqual({ period: "7d" });
    expect(rangeFromParams(new URLSearchParams("period=custom&from=2026-09-01&to=2026-09-30"))).toEqual({ period: "custom", from: "2026-09-01", to: "2026-09-30" });
    expect(rangeFromParams(new URLSearchParams(""))).toEqual({ period: "30d" });
    expect(rangeFromParams(new URLSearchParams("period=year"))).toEqual({ period: "30d" });
    expect(rangeFromParams(new URLSearchParams("period=custom&from=2026-09-30&to=2026-09-01"))).toEqual({ period: "30d" });
    expect(rangeFromParams(new URLSearchParams("period=custom&from=nope&to=2026-09-01"))).toEqual({ period: "30d" });
  });

  it("writes a clean URL and checks the days like the API (at most 366, both days counted)", () => {
    expect(rangeToParams({ period: "30d" })).toEqual({});
    expect(rangeToParams({ period: "custom", from: "2026-01-01", to: "2026-01-31" })).toEqual({ period: "custom", from: "2026-01-01", to: "2026-01-31" });
    expect(daysIn("2026-10-01", "2026-10-01")).toBe(1);
    expect(rangeProblem("2025-01-01", "2026-01-01")).toBeNull(); // 366 days
    expect(rangeProblem("2025-01-01", "2026-01-02")).toBe("Choose at most 366 days.");
    expect(rangeProblem("", "2026-01-02")).toBe("Choose a start and an end day.");
  });

  it("turns a preset into Phnom Penh days, counting today", () => {
    vi.useFakeTimers();
    // 20:00 UTC on 14 Oct is already 15 Oct in Phnom Penh (UTC+7).
    vi.setSystemTime(new Date("2026-10-14T20:00:00Z"));
    expect(rangeDays({ period: "today" })).toEqual({ from: "2026-10-15", to: "2026-10-15" });
    expect(rangeDays({ period: "7d" })).toEqual({ from: "2026-10-09", to: "2026-10-15" });
    expect(rangeDays({ period: "30d" })).toEqual({ from: "2026-09-16", to: "2026-10-15" });
    expect(rangeDays({ period: "custom", from: "2026-01-01", to: "2026-03-31" })).toEqual({ from: "2026-01-01", to: "2026-03-31" });
  });
});

afterEach(() => vi.useRealTimers());
