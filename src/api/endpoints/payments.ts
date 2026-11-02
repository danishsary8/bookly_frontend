import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Resource } from "../types";
import type { components } from "../schema";

/* KHQR payments (backend design docs/superpowers/specs/2026-11-02-khqr-payments-design.md). */

export type KhqrPayment = components["schemas"]["KhqrPayment"];
export type KhqrCurrency = "USD" | "KHR";

export const paymentKeys = {
  khqr: (orderId: number) => ["payments", "khqr", orderId] as const,
};

export const paymentsApi = {
  khqr: (orderId: number) => api.get<Resource<KhqrPayment>>(`/orders/${orderId}/payment`).then((r) => r.data),
  khqrQr: (orderId: number, currency: KhqrCurrency) => api.post<Resource<KhqrPayment>>(`/orders/${orderId}/payment/qr`, { currency }).then((r) => r.data),
  simulate: (orderId: number) => api.post<Resource<KhqrPayment>>(`/orders/${orderId}/payment/simulate`).then((r) => r.data),
};

export const paymentQueries = {
  /** Asks every 3 seconds while the order waits for payment (each ask also lets the API check Bakong). */
  khqr: (orderId: number) =>
    queryOptions({
      queryKey: paymentKeys.khqr(orderId),
      queryFn: () => paymentsApi.khqr(orderId),
      retry: false,
      refetchInterval: (query) => (query.state.data?.status === "awaiting_payment" ? 3000 : false),
      refetchIntervalInBackground: false,
    }),
};
