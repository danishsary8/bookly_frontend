import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";
import type { Resource } from "../types";
import type { DashboardRange } from "./staff";

/*
 * GET /staff/dashboard/insights (admin): the dashboard's extra numbers (backend spec
 * docs/superpowers/specs/2026-11-01-bi-dashboard-design.md). An API without it answers 404; callers then hide what
 * needs it (sparklines, the comparison line), so the dashboard still works on an older API.
 */

type Usd = string;
type Khr = string | null;

export interface TrendDay {
  date: string;
  previous_date: string | null;
  net_revenue_usd: Usd;
  previous_net_revenue_usd: Usd;
  orders_placed: number;
  previous_orders_placed: number;
  average_order_usd: Usd;
  previous_average_order_usd: Usd;
  new_customers: number;
  previous_new_customers: number;
  books_sold?: number;
  previous_books_sold?: number;
  ebooks_sold?: number;
  previous_ebooks_sold?: number;
}

export interface DashboardInsights {
  order_ratings?: { average: number | null; count: number };
  period: { from: string; to: string; timezone: string };
  trend: TrendDay[];
  dead_stock: {
    days: number;
    variants: number;
    copies: number;
    value_usd: Usd;
    value_khr: Khr;
    items: Array<{ book_variant_id: number; book_id: number; title: string; format: string; sku: string | null; stock_quantity: number; value_usd: Usd; last_sold_at: string | null }>;
  };
  stock_value: { copies: number; value_usd: Usd; value_khr: Khr; basis: "selling_price" };
  top_authors: Array<{ author_id: number; name: string; copies_sold: number; sales_usd: Usd; sales_khr: Khr }>;
  provinces: Array<{ code: string | null; name: string; name_km: string | null; orders: number; total_usd: Usd; total_khr: Khr }>;
  promotions: { orders: number; offer_orders: number; offer_discount_usd: Usd; coupon_orders: number; coupon_discount_usd: Usd; gift_orders?: number; plain_orders: number };
  repeat_customer_rate: { customers: number; returning: number; percent: number };
  cart_reminder_recovery?: { sent: number; recovered: number; percent: number };
  payment_methods?: Array<{ method: string; orders: number; total_usd: Usd; percent: number }>;
  attention?: { pending_orders: number; open_returns: number; low_stock: number; waiting_orders: number; recent_reviews: number; open_chats: number };
  activity?: Array<{ id: number; action: string; entity_type: string; entity_id: number; staff_name: string | null; created_at: string }>;
  delivery_areas?: { phnom_penh: number; provinces: number; unknown: number };
}

export const insightsApi = {
  get: (range: DashboardRange) => api.get<Resource<DashboardInsights>>("/staff/dashboard/insights", { params: range }).then((r) => r.data),
};

export const insightsQueries = {
  get: (range: DashboardRange) =>
    queryOptions({ queryKey: ["staff", "dashboard-insights", range] as const, queryFn: () => insightsApi.get(range), placeholderData: keepPreviousData, retry: false }),
};
