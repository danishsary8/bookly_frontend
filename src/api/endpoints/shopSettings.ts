import { queryOptions } from "@tanstack/react-query";
import { api } from "../client";

/** Store settings (GET catalog:view, PATCH admin): delivery fees, free delivery threshold, monthly sales goal. */
export interface ShopSettings {
  shipping_fee_phnom_penh_usd: string;
  shipping_fee_provinces_usd: string;
  free_shipping_threshold_usd: string | null;
  monthly_sales_goal_usd: string | null;
  province_rates: Record<string, string>;
}
export type ShopSettingsInput = Partial<Omit<ShopSettings, "province_rates">>;

/** This month's net revenue against the goal (GET /staff/dashboard/goal, admin). */
export interface GoalProgress {
  month: string;
  days_in_month: number;
  days_passed: number;
  net_revenue_usd: string;
  net_revenue_khr: string | null;
  goal_usd: string | null;
  percent: number | null;
  expected_by_today_usd: string | null;
  on_track: boolean | null;
  needed_per_day_usd: string | null;
}

/** How one book sells (GET /staff/books/{id}/sales). */
export interface BookSales {
  sold_30_days: number;
  sold_90_days: number;
  sales_90_days_usd: string;
  sold_all_time: number;
  rank_90_days: number | null;
  books_ranked: number;
  last_sold_at: string | null;
  by_format: Array<{ variant_id: number; format: string; units_sold: number }>;
}

/*
 * Shape checks: an older API, a proxy or a test double can answer a route with something else (e.g. `{ data: [] }`).
 * Panels treat that as "not available" and hide, instead of crashing the whole page.
 */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const isGoalProgress = (v: unknown): v is GoalProgress => isObj(v) && typeof v.month === "string" && /^\d{4}-\d{2}$/.test(v.month) && typeof v.days_in_month === "number" && typeof v.net_revenue_usd === "string";
export const isBookSales = (v: unknown): v is BookSales => isObj(v) && typeof v.sold_30_days === "number" && Array.isArray(v.by_format);
export const isShopSettings = (v: unknown): v is ShopSettings => isObj(v) && typeof v.shipping_fee_phnom_penh_usd === "string" && typeof v.shipping_fee_provinces_usd === "string";

export const shopSettingsApi = {
  get: () => api.get<{ data: ShopSettings }>("/staff/settings/shop").then((r) => r.data),
  update: (input: ShopSettingsInput) => api.patch<{ data: ShopSettings }>("/staff/settings/shop", input).then((r) => r.data),
  goal: () => api.get<{ data: GoalProgress }>("/staff/dashboard/goal").then((r) => r.data),
  bookSales: (bookId: number) => api.get<{ data: BookSales }>(`/staff/books/${bookId}/sales`).then((r) => r.data),
};

export const shopSettingsQueries = {
  get: () => queryOptions({ queryKey: ["staff", "settings", "shop"] as const, queryFn: shopSettingsApi.get }),
  goal: () => queryOptions({ queryKey: ["staff", "dashboard", "goal"] as const, queryFn: shopSettingsApi.goal, staleTime: 60_000, retry: false }),
  bookSales: (bookId: number) => queryOptions({ queryKey: ["staff", "books", bookId, "sales"] as const, queryFn: () => shopSettingsApi.bookSales(bookId), staleTime: 60_000, retry: false }),
};
