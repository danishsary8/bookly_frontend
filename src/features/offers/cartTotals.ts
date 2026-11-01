import type { Cart, CouponCheck } from "@/api/types";

type Amount = { usd?: string | null; khr?: string | null };
type FreeShipping = NonNullable<NonNullable<Cart["pricing"]>["free_shipping"]>;
type Offer = NonNullable<NonNullable<Cart["pricing"]>["offer"]>;

export interface CartTotals {
  /** The one discount in force (offer or coupon, never both), or null. */
  discount: { kind: "offer"; offer: Offer; amount: Amount } | { kind: "coupon"; code: string; amount: Amount } | null;
  totalBeforeShipping: Amount;
  /** undefined: the API has no free-delivery numbers (older API) -> the bar falls back to its own threshold.
   *  null: no free delivery for this cart (ebooks only, or switched off) -> no bar. */
  freeShipping: FreeShipping | null | undefined;
  /** A valid coupon that lost to the offer (it stays saved for a later order). */
  couponNotUsed: string | null;
}

/*
 * What the cart summary shows (offers spec 6.1, 6.2): the coupon check, when there is one, already compares the
 * coupon with the offer (`applied`, `best_*`); without a coupon the cart's `pricing` has the offer. An API without
 * offers has neither `applied` nor `pricing`, and the summary works exactly as before.
 */
export function cartTotals(cart: Cart, check: CouponCheck | null): CartTotals {
  const pricing = cart.pricing ?? null;
  const subtotal = { usd: cart.subtotal_usd, khr: cart.subtotal_khr };

  if (check) {
    if (check.applied === "offer" && check.offer) {
      return {
        discount: { kind: "offer", offer: check.offer, amount: { usd: check.best_discount_usd, khr: check.best_discount_khr } },
        totalBeforeShipping: { usd: check.best_total_before_shipping_usd, khr: check.best_total_before_shipping_khr },
        freeShipping: check.free_shipping,
        couponNotUsed: check.coupon_not_used?.code ?? check.code ?? null,
      };
    }
    const newApi = check.applied === "coupon";
    return {
      discount: {
        kind: "coupon",
        code: check.code ?? "",
        amount: newApi ? { usd: check.best_discount_usd, khr: check.best_discount_khr } : { usd: check.discount_usd, khr: check.discount_khr },
      },
      totalBeforeShipping: newApi
        ? { usd: check.best_total_before_shipping_usd, khr: check.best_total_before_shipping_khr }
        : { usd: check.total_before_shipping_usd, khr: check.total_before_shipping_khr },
      freeShipping: newApi ? check.free_shipping : undefined,
      couponNotUsed: null,
    };
  }

  if (pricing) {
    return {
      discount: pricing.offer ? { kind: "offer", offer: pricing.offer, amount: { usd: pricing.discount_usd, khr: pricing.discount_khr } } : null,
      totalBeforeShipping: { usd: pricing.total_before_shipping_usd, khr: pricing.total_before_shipping_khr },
      freeShipping: pricing.free_shipping,
      couponNotUsed: null,
    };
  }

  return { discount: null, totalBeforeShipping: subtotal, freeShipping: undefined, couponNotUsed: null };
}
