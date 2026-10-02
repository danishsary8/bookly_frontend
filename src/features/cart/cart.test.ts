import { afterEach, describe, expect, it } from "vitest";
import type { CartLine } from "@/api/types";
import { isDigitalLine, lineHasBlockingIssue, maxQuantity, MAX_PER_LINE } from "./cartIssues";
import { getCoupon, setCoupon } from "./couponStore";

const line = (over: Partial<CartLine> = {}): CartLine => ({ id: 1, book_variant_id: 3, format: "paperback", quantity: 1, issues: [], ...over });

describe("cart issues", () => {
  it("treats stock and availability problems as blocking, a price change as information", () => {
    expect(lineHasBlockingIssue(line({ issues: [{ code: "out_of_stock", message: "Out of stock" }] }))).toBe(true);
    expect(lineHasBlockingIssue(line({ issues: [{ code: "insufficient_stock", message: "Only 2 left", available_quantity: 2 }] }))).toBe(true);
    expect(lineHasBlockingIssue(line({ issues: [{ code: "price_changed", message: "Price went up" }] }))).toBe(false);
  });

  it("caps quantity at the per-line limit, the stock left, and one for digital formats", () => {
    expect(maxQuantity(line())).toBe(MAX_PER_LINE);
    expect(maxQuantity(line({ issues: [{ code: "insufficient_stock", message: "Only 3 left", available_quantity: 3 }] }))).toBe(3);
    expect(maxQuantity(line({ issues: [{ code: "insufficient_stock", message: "None left", available_quantity: 0 }] }))).toBe(1);
    expect(isDigitalLine(line({ format: "ebook" }))).toBe(true);
    expect(maxQuantity(line({ format: "audiobook" }))).toBe(1);
  });
});

describe("coupon store", () => {
  afterEach(() => setCoupon(null));

  it("remembers the applied coupon for the visit and forgets it on null", () => {
    setCoupon("WELCOME10");
    expect(getCoupon()).toBe("WELCOME10");
    expect(sessionStorage.getItem("bookly.coupon")).toBe("WELCOME10");
    setCoupon(null);
    expect(getCoupon()).toBeNull();
  });
});
