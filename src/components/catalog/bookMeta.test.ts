import { describe, expect, it } from "vitest";
import { authorNames, isNewRelease } from "./bookMeta";

const now = Date.parse("2026-10-02T00:00:00Z");

describe("isNewRelease", () => {
  it("is true within 60 days of publication", () => {
    expect(isNewRelease("2026-09-01", now)).toBe(true);
    expect(isNewRelease("2026-08-04", now)).toBe(true);
  });
  it("is false for older, far-future, missing or invalid dates", () => {
    expect(isNewRelease("2026-07-01", now)).toBe(false);
    expect(isNewRelease("2026-12-01", now)).toBe(false);
    expect(isNewRelease(null, now)).toBe(false);
    expect(isNewRelease("soon", now)).toBe(false);
  });
});

describe("authorNames", () => {
  it("joins names and skips blanks", () => {
    expect(authorNames([{ name: "Neil Gaiman" }, { name: "" }, { name: "Terry Pratchett" }])).toBe("Neil Gaiman, Terry Pratchett");
    expect(authorNames(undefined)).toBe("");
  });
});
