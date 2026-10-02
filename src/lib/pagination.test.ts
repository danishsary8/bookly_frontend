import { describe, expect, it } from "vitest";
import { pageRange, rangeSummary } from "./pagination";

describe("pageRange", () => {
  it("lists every page up to seven", () => {
    expect(pageRange(1, 1)).toEqual([1]);
    expect(pageRange(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("keeps the start together near the first page", () => {
    expect(pageRange(1, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 12]);
    expect(pageRange(4, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis-end", 12]);
  });

  it("shows the current page with neighbours in the middle", () => {
    expect(pageRange(6, 12)).toEqual([1, "ellipsis-start", 5, 6, 7, "ellipsis-end", 12]);
  });

  it("keeps the end together near the last page", () => {
    expect(pageRange(9, 12)).toEqual([1, "ellipsis-start", 8, 9, 10, 11, 12]);
    expect(pageRange(12, 12)).toEqual([1, "ellipsis-start", 8, 9, 10, 11, 12]);
  });

  it("clamps an out-of-range page", () => {
    expect(pageRange(99, 12)).toEqual(pageRange(12, 12));
    expect(pageRange(0, 12)).toEqual(pageRange(1, 12));
  });
});

describe("rangeSummary", () => {
  it("describes the visible slice", () => {
    expect(rangeSummary(25, 48, 286, "books")).toBe("Showing 25–48 of 286 books");
    expect(rangeSummary(1, 24, 1200, "books")).toBe("Showing 1–24 of 1,200 books");
  });

  it("handles an empty list", () => {
    expect(rangeSummary(null, null, 0, "books")).toBe("0 books");
  });
});
