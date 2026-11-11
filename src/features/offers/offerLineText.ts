import type { useT } from "@/i18n";
import { percentLabel } from "./percent";

type Dict = ReturnType<typeof useT>["dict"];

/** The discount row label in the cart and at checkout: "Offer: buy 2, save 15%" or "Full set offer: save 20%". */
export function offerLineText(dict: Dict, offer: { min_quantity?: number; percent_off?: string; whole_series?: boolean }) {
  const pct = percentLabel(offer.percent_off);
  return offer.whole_series ? dict.offers.setOfferLine(pct) : dict.offers.offerLine(offer.min_quantity ?? 0, pct);
}
