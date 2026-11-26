import { describe, expect, it } from "vitest";
import { en } from "@/i18n/en";
import { offerBadgeText, offerBookLineText, offerDiscountText, offerKind, offerMoney, offerNudgeText } from "./offerKind";

const dict = en as unknown as Parameters<typeof offerBadgeText>[0];
const bundle = { type: "bundle_price", min_quantity: 5, percent_off: "0.00", bundle_price: "20.00" };

describe("offer wording", () => {
  it("writes a bundle as 'any N for $P' everywhere", () => {
    expect(offerKind(bundle)).toBe("bundle");
    expect(offerBadgeText(dict, bundle)).toBe("Any 5 for $20");
    expect(offerBookLineText(dict, bundle, null)).toMatch(/^Pick any 5 books in this offer for \$20\./);
    expect(offerDiscountText(dict, bundle)).toBe("Bundle: any 5 for $20");
    expect(offerNudgeText(dict, bundle, 2, null)).toBe("Add 2 more books from the bundle to get any 5 for $20");
  });

  it("writes '$ off' offers in dollars, not as 0%", () => {
    const amount = { type: "buy_n_amount", min_quantity: 2, percent_off: "0.00", amount_off: "3.00" };
    expect(offerBadgeText(dict, amount)).toBe("Buy 2, save $3");
    expect(offerDiscountText(dict, amount)).toBe("Offer: buy 2, save $3");
  });

  it("keeps percent and set offers as before, and shows nothing for an empty offer", () => {
    expect(offerBadgeText(dict, { type: "buy_n_percent", min_quantity: 2, percent_off: "15.00" })).toBe("Buy 2, save 15%");
    expect(offerBadgeText(dict, { min_quantity: 3, percent_off: "20.00", whole_series: true })).toBe("Full set: save 20%");
    expect(offerBadgeText(dict, { type: "buy_n_percent", min_quantity: 2, percent_off: "0.00" })).toBeNull();
    expect(offerBadgeText(dict, null)).toBeNull();
  });

  it("formats money without needless cents", () => {
    expect(offerMoney("20.00")).toBe("$20");
    expect(offerMoney("19.9")).toBe("$19.90");
  });
});
