import type { useT } from "@/i18n";
import { offerDiscountText, type OfferLike } from "./offerKind";

type Dict = ReturnType<typeof useT>["dict"];

/** The discount row label in the cart and at checkout: "Offer: buy 2, save 15%", "Bundle: any 5 for $20", "Full set offer: save 20%". */
export function offerLineText(dict: Dict, offer: OfferLike) {
  return offerDiscountText(dict, offer);
}
