import { queryOptions } from "@tanstack/react-query";
import { api, newIdempotencyKey } from "../client";
import type { Cart, CheckoutPreview, CouponCheck, Order, Resource } from "../types";

export interface AddSeriesResult {
  added: Array<{
    book_id: number;
    title: string;
    variant_id: number;
    format: string;
    price_usd: string;
  }>;
  skipped: Array<{
    book_id: number;
    title: string;
    reason: 'already_owned' | 'already_in_cart' | 'out_of_stock';
  }>;
  cart: Cart;
}

export const cartKeys = {
  cart: () => ["cart"] as const,
  preview: (couponCode: string | null, addressId: number | null = null) => ["cart", "preview", couponCode ?? "", addressId ?? 0] as const,
};

export interface PlaceOrderInput {
  address_id: number;
  payment_method: "cod" | "khqr";
  coupon_code?: string;
  delivery_note?: string;
  /** Free gift option; the message (max 200) is printed on the packing sheet. */
  is_gift?: boolean;
  gift_message?: string;
  /** The automatic offer the preview showed; if it no longer applies the API answers 422 and places nothing. */
  offer_id?: number;
  use_credit?: boolean;
  expected_payment_due_usd?: string;
}

const cartData = (response: Resource<Cart>) => response.data;

export const cartApi = {
  cart: () => api.get<Resource<Cart>>("/cart").then(cartData),
  /** Adding a format already in the cart increases its quantity. */
  addItem: (bookVariantId: number, quantity = 1) =>
    api.post<Resource<Cart>>("/cart/items", { book_variant_id: bookVariantId, quantity }).then(cartData),
  setQuantity: (itemId: number, quantity: number) => api.patch<Resource<Cart>>(`/cart/items/${itemId}`, { quantity }).then(cartData),
  removeItem: (itemId: number) => api.delete<Resource<Cart>>(`/cart/items/${itemId}`).then(cartData),
  clear: () => api.delete<Resource<Cart>>("/cart").then(cartData),
  /** `wholeSet`: also add volumes the customer already owns (a set offer needs every volume in the cart). */
  addSeries: (seriesId: number, wholeSet = false) => api.post<Resource<AddSeriesResult>>(`/cart/series/${seriesId}`, wholeSet ? { whole_set: true } : undefined).then((r) => r.data),

  checkCoupon: (code: string) => api.post<Resource<CouponCheck>>("/cart/coupon/check", { code }).then((r) => r.data),
  /** Totals for the cart; delivery is priced for `addressId` (else the default address). */
  preview: (couponCode?: string | null, addressId?: number | null, deliveryArea?: "phnom_penh" | "provinces", useCredit = false) =>
    api
      .post<Resource<CheckoutPreview>>("/checkout/preview", { ...(couponCode ? { coupon_code: couponCode } : {}), ...(addressId ? { address_id: addressId } : {}), ...(deliveryArea ? { delivery_area: deliveryArea } : {}), ...(useCredit ? { use_credit: true } : {}) })
      .then((r) => r.data),

  /**
   * Places the order. Pass the same `idempotencyKey` when retrying after a timeout so the API returns
   * the order it already created instead of making a second one.
   */
  placeOrder: (input: PlaceOrderInput, idempotencyKey: string = newIdempotencyKey()) =>
    api.post<Resource<Order>>("/checkout", input, { headers: { "Idempotency-Key": idempotencyKey } }).then((r) => r.data),
};

export const cartQueries = {
  cart: () => queryOptions({ queryKey: cartKeys.cart(), queryFn: cartApi.cart, staleTime: 0 }),
  preview: (couponCode: string | null, addressId: number | null = null, useCredit = false) =>
    queryOptions({ queryKey: useCredit ? [...cartKeys.preview(couponCode, addressId), true] : cartKeys.preview(couponCode, addressId), queryFn: () => useCredit ? cartApi.preview(couponCode, addressId, undefined, true) : cartApi.preview(couponCode, addressId), staleTime: 0 }),
};
