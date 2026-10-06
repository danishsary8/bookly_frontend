import { queryOptions } from "@tanstack/react-query";
import { api, newIdempotencyKey } from "../client";
import type { Cart, CheckoutPreview, CouponCheck, Order, Resource } from "../types";

export const cartKeys = {
  cart: () => ["cart"] as const,
  preview: (couponCode: string | null, addressId: number | null = null) => ["cart", "preview", couponCode ?? "", addressId ?? 0] as const,
};

export interface PlaceOrderInput {
  address_id: number;
  payment_method: "cod";
  coupon_code?: string;
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

  checkCoupon: (code: string) => api.post<Resource<CouponCheck>>("/cart/coupon/check", { code }).then((r) => r.data),
  /** Totals for the cart; delivery is priced for `addressId` (else the default address). */
  preview: (couponCode?: string | null, addressId?: number | null) =>
    api
      .post<Resource<CheckoutPreview>>("/checkout/preview", { ...(couponCode ? { coupon_code: couponCode } : {}), ...(addressId ? { address_id: addressId } : {}) })
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
  preview: (couponCode: string | null, addressId: number | null = null) =>
    queryOptions({ queryKey: cartKeys.preview(couponCode, addressId), queryFn: () => cartApi.preview(couponCode, addressId), staleTime: 0 }),
};
