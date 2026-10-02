import { useSyncExternalStore } from "react";

/*
 * The coupon a customer applied on the cart page, carried to checkout (the API
 * checks it again in the preview and when the order is placed). sessionStorage:
 * it lasts for this visit and is cleared after an order.
 */
const KEY = "bookly.coupon";
const listeners = new Set<() => void>();

const read = () => {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const getCoupon = () => read();

export function setCoupon(code: string | null) {
  try {
    if (code) sessionStorage.setItem(KEY, code);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* not stored: the coupon must be entered again at checkout */
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCoupon = () => useSyncExternalStore(subscribe, read, () => null);
