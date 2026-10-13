import { describe, expect, it } from "vitest";
import { daysIn, rangeFromParams, rangeProblem, rangeToParams } from "./dashboardRange";

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
});
