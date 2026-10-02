import type { Address } from "@/api/types";

/** The API's limit on saved addresses per customer (AddressController::MAX_ADDRESSES). */
export const MAX_ADDRESSES = 10;

/** An address as a courier reads it: street, extra line, "city, state, postcode", country. */
export function formatAddressLines(a: Address) {
  return [a.address_line1, a.address_line2, [a.city, a.state, a.postal_code].filter(Boolean).join(", "), a.country].filter(Boolean) as string[];
}
