import { describe, expect, it } from "vitest";
import { formatPrice, lineTotal, toNumber } from "./format";

describe("toNumber", () => {
  it("reads numbers and numeric strings", () => {
    expect(toNumber(12.5)).toBe(12.5);
    expect(toNumber("19.99")).toBe(19.99);
  });

  it("falls back for empty, invalid or non-finite values", () => {
    expect(toNumber("")).toBe(0);
    expect(toNumber("abc", 7)).toBe(7);
    expect(toNumber(Number.NaN)).toBe(0);
    expect(toNumber(null)).toBe(0);
  });
});

describe("lineTotal", () => {
  it("multiplies in cents so totals have no floating-point noise", () => {
    expect(lineTotal("19.99", 3)).toBe(59.97);
  });

  it("never goes negative and ignores fractional quantities", () => {
    expect(lineTotal(10, -2)).toBe(0);
    expect(lineTotal(10, 2.9)).toBe(20);
  });
});

describe("formatPrice", () => {
  it("formats as US dollars", () => {
    expect(formatPrice("1234.5")).toBe("$1,234.50");
  });
});
