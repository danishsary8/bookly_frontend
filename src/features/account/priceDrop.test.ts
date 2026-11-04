import { describe, expect, it } from "vitest";
import type { WishlistBookCard } from "@/api/types";
import { priceDropSince } from "./priceDrop";

const book = (now: string | null, saved: string | null | undefined): WishlistBookCard =>
  ({ id: 1, title: "Emma", price_from_usd: now, wishlist_saved_price_usd: saved }) as WishlistBookCard;

describe("priceDropSince", () => {
  it("gives the rounded percentage and the saved price when the book got cheaper", () => {
    expect(priceDropSince(book("16.40", "20.50"))).toEqual({ percent: 20, savedUsd: 20.5 });
    expect(priceDropSince(book("0.00", "5.00"))).toEqual({ percent: 100, savedUsd: 5 });
  });

  it("shows nothing for the same or a higher price, a tiny drop, or no saved price", () => {
    expect(priceDropSince(book("20.50", "20.50"))).toBeNull();
    expect(priceDropSince(book("22.00", "20.50"))).toBeNull();
    expect(priceDropSince(book("20.45", "20.50"))).toBeNull(); // under 1%
    expect(priceDropSince(book("16.40", null))).toBeNull();
    expect(priceDropSince(book("16.40", undefined))).toBeNull();
    expect(priceDropSince(book(null, "20.50"))).toBeNull();
  });
});
