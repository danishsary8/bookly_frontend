import { describe, expect, it } from "vitest";
import { removalLabel } from "./removal";

const now = Date.parse("2026-10-06T10:00:00Z");
const at = (hours: number) => new Date(now + hours * 3_600_000).toISOString();

describe("removalLabel", () => {
  it.each([
    [47.6, "Removed in 2 days"],
    [30, "Removed in 1 day"],
    [23.4, "Removed in 23 hours"],
    [1, "Removed in 1 hour"],
    [0.5, "Removed in under an hour"],
    [-2, "Removal due"],
  ])("%s hours left → %s", (hours, label) => {
    expect(removalLabel(at(hours), now)).toBe(label);
  });
});
