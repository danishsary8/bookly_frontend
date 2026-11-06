import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { components } from "../schema";

export type GiftCard = components["schemas"]["GiftCard"];
export type GiftPurchaseInput = components["schemas"]["GiftPurchaseInput"];
export type GiftPaymentState = components["schemas"]["GiftPaymentState"];
export type ReferralSummary = components["schemas"]["ReferralSummary"];
export interface ShopFeatures { gift_cards: boolean; referrals: boolean }
export interface GiftPurchases { data: GiftCard[]; balance_usd: string; current_page: number; last_page: number }

export const creditApi = {
  features: () => api.get<{ data: ShopFeatures }>("/shop/features").then((r) => r.data),
  purchases: (page = 1) => api.get<GiftPurchases>("/me/gift-cards", { params: { page } }),
  buy: (input: GiftPurchaseInput, key: string) => api.post<{ data: GiftCard }>("/me/gift-cards", input, { headers: { "Idempotency-Key": key } }).then((r) => r.data),
  payment: (id: number) => api.get<GiftPaymentState>(`/me/gift-cards/${id}/payment`),
  reveal: (id: number) => api.post<{ data: { code: string } }>(`/me/gift-cards/${id}/reveal`).then((r) => r.data.code),
  redeem: (gift_code: string) => api.post<{ data: { balance_usd: string } }>("/me/gift-cards/redeem", { gift_code }).then((r) => r.data),
  referrals: (device: string | undefined, page = 1) => api.get<{ data: ReferralSummary }>("/me/referrals", { headers: device ? { "X-Bookly-Device": device } : {}, params: { page } }).then((r) => r.data),
};
export const shopFeaturesQuery = () => queryOptions({ queryKey: ["shop-features"], queryFn: creditApi.features, staleTime: 60_000, retry: false });
