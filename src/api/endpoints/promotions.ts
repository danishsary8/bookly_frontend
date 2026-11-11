import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Paginated, Resource } from "../types";

/*
 * Promotion pop-ups (owner 2026-11-12). Shop: GET /promotions/current (the live one or null) and two counters.
 * Staff: list with results, create, change (also show/hide) and delete. Both languages come from the API;
 * `promotionText` picks one, Khmer falling back to English.
 */
export interface Promotion {
  id: number;
  title_en: string;
  title_km: string | null;
  body_en: string | null;
  body_km: string | null;
  image_url: string | null;
  cta_label_en: string | null;
  cta_label_km: string | null;
  /** A path inside the shop, e.g. "/series/3". */
  cta_url: string;
  starts_at: string | null;
  ends_at: string | null;
  /** The linked automatic offer while it is live. */
  offer: { id: number; percent_off: string; min_quantity: number; whole_series: boolean; free_delivery: boolean; target_label: string | null } | null;
}

export type PromotionStatus = "live" | "scheduled" | "hidden" | "ended";
export interface StaffPromotion extends Omit<Promotion, "offer"> {
  offer_id: number | null;
  offer_name: string | null;
  is_active: boolean;
  status: PromotionStatus;
  views: number;
  clicks: number;
  /** The linked offer's orders and revenue while the promotion ran. */
  orders_count: number;
  revenue_usd: string;
}
export type PromotionInput = Partial<{
  title_en: string;
  title_km: string | null;
  body_en: string | null;
  body_km: string | null;
  image_url: string | null;
  cta_label_en: string | null;
  cta_label_km: string | null;
  cta_url: string;
  offer_id: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
}>;

export const promotionsApi = {
  current: () => api.get<Resource<Promotion | null>>("/promotions/current").then((r) => r.data),
  // Counters are best effort: a failed count must never show an error to a shopper.
  view: (id: number) => api.post(`/promotions/${id}/view`).catch(() => undefined),
  click: (id: number) => api.post(`/promotions/${id}/click`).catch(() => undefined),
  staffList: () => api.get<Paginated<StaffPromotion>>("/staff/promotions", { params: { per_page: 100 } }),
  create: (input: PromotionInput) => api.post<Resource<StaffPromotion>>("/staff/promotions", input).then((r) => r.data),
  update: (id: number, input: PromotionInput) => api.patch<Resource<StaffPromotion>>(`/staff/promotions/${id}`, input).then((r) => r.data),
  remove: (id: number) => api.delete(`/staff/promotions/${id}`),
};

export const promotionQueries = {
  // An API without promotions (404) or any error simply means "no promotion".
  current: () => queryOptions({ queryKey: ["promotions", "current"], queryFn: () => promotionsApi.current().catch(() => null), staleTime: 5 * 60_000, retry: false }),
  staffList: () => queryOptions({ queryKey: ["staff", "promotions"], queryFn: promotionsApi.staffList }),
};

export const promotionText = (p: Pick<Promotion, "title_en" | "title_km" | "body_en" | "body_km" | "cta_label_en" | "cta_label_km">, lang: string) => ({
  title: (lang === "km" && p.title_km) || p.title_en,
  body: (lang === "km" && p.body_km) || p.body_en,
  cta: (lang === "km" && p.cta_label_km) || p.cta_label_en,
});
