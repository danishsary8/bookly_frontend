import { describe, expect, it } from "vitest";
import { bucketCounts, trendPath } from "./chartMotion";

describe("dashboard chart geometry", () => {
  it("keeps compatible curve commands between short and long periods, including zero and negative income", () => {
    const paths = [[0], [4, 0, -2, 8, 3, 0, 5], Array.from({ length: 30 }, (_, index) => index % 6 - 2)].map((values) => trendPath(values));
    const commands = paths.map((path) => path.line.match(/[MC]/g));
    expect(commands[0]).toEqual(commands[1]);
    expect(commands[1]).toEqual(commands[2]);
    for (const path of paths) expect(path.line).not.toMatch(/NaN|Infinity/);
  });

  it("includes the entire selected period in book totals, rather than dropping all but the last 14 days", () => {
    const points = Array.from({ length: 365 }, (_, index) => ({ label: `Day ${index + 1}`, value: index % 5 }));
    const bars = bucketCounts(points);
    expect(bars.length).toBeLessThanOrEqual(30);
    expect(bars[0].label).toContain("Day 1");
    expect(bars.at(-1)?.label).toContain("Day 365");
    expect(bars.reduce((sum, bar) => sum + bar.value!, 0)).toBe(points.reduce((sum, point) => sum + point.value, 0));
  });

  it("keeps genuine zero counts separate from unavailable counts", () => {
    const bars = bucketCounts([{ label: "Monday", value: 0 }, { label: "Tuesday", value: undefined }]);
    expect(bars[0].value).toBe(0);
    expect(bars[1].value).toBeUndefined();
    expect(bucketCounts([{ label: "Monday", value: 4 }, { label: "Tuesday", value: undefined }], 1)[0].value).toBeUndefined();
  });
});
