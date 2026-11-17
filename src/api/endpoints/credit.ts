import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { components } from "../schema";

export type ReferralSummary = components["schemas"]["ReferralSummary"];
export interface ShopFeatures { referrals: boolean }

export const creditApi = {
  features: () => api.get<{ data: ShopFeatures }>("/shop/features").then((r) => ({ referrals: r?.data?.referrals === true })),
  referrals: (device: string | undefined, page = 1) => api.get<{ data: ReferralSummary }>("/me/referrals", { headers: device ? { "X-Bookly-Device": device } : {}, params: { page } }).then((r) => r.data),
};
export const shopFeaturesQuery = () => queryOptions({ queryKey: ["shop-features"], queryFn: creditApi.features, staleTime: 60_000, retry: false });
