import type { useT } from "@/i18n";
import { percentLabel } from "./percent";

type Dict = ReturnType<typeof useT>["dict"];

/** The offer fields the shop reads; every API offer shape (book, cart, nudge, order) fits it. */
export type OfferLike = {
  type?: string | null;
  min_quantity?: number | null;
  percent_off?: string | null;
  amount_off?: string | null;
  bundle_price?: string | null;
  whole_series?: boolean | null;
};

export type OfferKind = "percent" | "amount" | "bundle" | "set" | null;

/** "$20" or "$19.90". */
export const offerMoney = (value: string | number | null | undefined) => {
  const n = Number(value ?? 0);
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
};

/** Which sentence family an offer needs; null when it has nothing to show (e.g. a percent offer at 0%). */
export function offerKind(offer: OfferLike | null | undefined): OfferKind {
  if (!offer) return null;
  if (offer.type === "bundle_price") return Number(offer.bundle_price) > 0 && (offer.min_quantity ?? 0) >= 2 ? "bundle" : null;
  if (offer.type === "buy_n_amount") return Number(offer.amount_off) > 0 ? "amount" : null;
  if (!(Number(offer.percent_off) > 0) || !offer.min_quantity) return null;
  return offer.whole_series ? "set" : "percent";
}

/** Short badge for a book card: "Any 5 for $20", "Buy 2, save $3", "Buy 2, save 15%", "Full set: save 20%". */
export function offerBadgeText(dict: Dict, offer: OfferLike | null | undefined): string | null {
  const o = dict.offers;
  const n = offer?.min_quantity ?? 0;
  switch (offerKind(offer)) {
    case "bundle": return o.bundleBadge(n, offerMoney(offer!.bundle_price));
    case "amount": return o.amountBadge(n, offerMoney(offer!.amount_off));
    case "set": return o.setBadge(percentLabel(offer!.percent_off ?? "0"));
    case "percent": return o.badge(n, percentLabel(offer!.percent_off ?? "0"));
    default: return null;
  }
}

/** The book page sentence. */
export function offerBookLineText(dict: Dict, offer: OfferLike | null | undefined, label: string | null): string | null {
  const o = dict.offers;
  const n = offer?.min_quantity ?? 0;
  switch (offerKind(offer)) {
    case "bundle": return o.bundleBookLine(n, offerMoney(offer!.bundle_price), label);
    case "amount": return o.amountBookLine(n, offerMoney(offer!.amount_off), label);
    case "set": return o.setBookLine(n, percentLabel(offer!.percent_off ?? "0"), label);
    case "percent": return o.bookLine(n, percentLabel(offer!.percent_off ?? "0"), label);
    default: return null;
  }
}

/** The discount row in the cart and at checkout. */
export function offerDiscountText(dict: Dict, offer: OfferLike): string {
  const o = dict.offers;
  const n = offer.min_quantity ?? 0;
  switch (offerKind(offer)) {
    case "bundle": return o.bundleOfferLine(n, offerMoney(offer.bundle_price));
    case "amount": return o.amountOfferLine(n, offerMoney(offer.amount_off));
    case "set": return o.setOfferLine(percentLabel(offer.percent_off ?? "0"));
    default: return o.offerLine(n, percentLabel(offer.percent_off ?? "0"));
  }
}

/** The cart nudge: "Add 2 more books from the bundle to get any 5 for $20". */
export function offerNudgeText(dict: Dict, offer: OfferLike, add: number, label: string | null): string | null {
  const o = dict.offers;
  const n = offer.min_quantity ?? 0;
  switch (offerKind({ ...offer, min_quantity: offer.min_quantity ?? (offer.type === "bundle_price" ? 2 : 1) })) {
    case "bundle": return o.bundleNudge(add, n, offerMoney(offer.bundle_price));
    case "amount": return o.amountNudge(add, offerMoney(offer.amount_off), label);
    case "set": return o.setNudge(add, percentLabel(offer.percent_off ?? "0"), label);
    case "percent": return o.nudge(add, percentLabel(offer.percent_off ?? "0"), label);
    default: return null;
  }
}
