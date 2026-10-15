import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../client";

/*
 * Admin reports (GET /staff/reports/*, admin only). Money is USD as a decimal string with a KHR twin at the
 * current rate (null until a rate is set). Revenue is cash basis, like the dashboard: delivered orders on
 * the day they were delivered, less refunds on the day they were paid back.
 */

export type ReportName = "sales" | "orders" | "products" | "customers" | "funnel" | "coupons";
export type ReportGroup = "day" | "week" | "month";
export type ReportRange = { from: string; to: string };

type Usd = string;
type Khr = string | null;
type Period = { from: string; to: string; timezone: string };

export interface SalesTotals {
  gross_revenue_usd: Usd;
  gross_revenue_khr: Khr;
  refunds_usd: Usd;
  refunds_khr: Khr;
  net_revenue_usd: Usd;
  net_revenue_khr: Khr;
  orders_count: number;
  orders_placed: number;
  items_sold: number;
  average_order_value_usd: Usd;
  average_order_value_khr: Khr;
  discount_usd: Usd;
  discount_khr: Khr;
  shipping_usd: Usd;
  shipping_khr: Khr;
}

export interface SalesPoint {
  date: string;
  orders_count: number;
  gross_revenue_usd: Usd;
  gross_revenue_khr: Khr;
  refunds_usd: Usd;
  refunds_khr: Khr;
  net_revenue_usd: Usd;
  net_revenue_khr: Khr;
  items_sold: number;
  average_order_value_usd: Usd;
}

export interface SalesReport {
  period: Period & { group: ReportGroup };
  totals: SalesTotals;
  comparison: {
    period: Period;
    totals: SalesTotals;
    change_percent: Record<"gross_revenue" | "refunds" | "net_revenue" | "orders_count" | "orders_placed" | "average_order_value" | "items_sold" | "discounts" | "shipping", number>;
  };
  series: SalesPoint[];
}

export interface OrdersReport {
  period: Period;
  total_orders: number;
  orders_by_status: Record<string, number>;
  cancellation_rate: number;
  average_delivery_hours: number | null;
  orders_by_payment_method: Record<string, number>;
  orders_by_delivery_area: { phnom_penh: number; provinces: number };
  comparison: {
    period: Period;
    total_orders: number;
    cancellation_rate: number;
    average_delivery_hours: number | null;
    change_percent: Record<"total_orders" | "cancellation_rate" | "average_delivery_hours", number>;
  };
}

export interface ProductRow {
  book_id: number;
  variant_id: number;
  title: string;
  format: string;
  units_sold: number;
  revenue_usd: Usd;
  revenue_khr?: Khr;
  stock_quantity?: number;
}

export interface ProductsReport {
  period: Period;
  best_sellers_by_units: ProductRow[];
  best_sellers_by_revenue: ProductRow[];
  worst_sellers: ProductRow[];
  low_stock: Array<{ book_variant_id: number; book_id: number; title: string; format: string; sku: string; stock_quantity: number; low_stock_threshold: number }>;
  revenue_by_category: Array<{ category_id: number; name: string; units_sold: number; revenue_usd: Usd; revenue_khr: Khr }>;
}

export interface CustomersReport {
  period: Period;
  total_new_customers: number;
  returning_customer_rate: number;
  new_customers_series: Array<{ date: string; new_customers: number }>;
  top_customers: Array<{ customer_id: number; name: string | null; email: string | null; orders_count: number; total_spent_usd: Usd; total_spent_khr: Khr }>;
  comparison: {
    period: Period;
    total_new_customers: number;
    returning_customer_rate: number;
    change_percent: Record<"total_new_customers" | "returning_customer_rate", number>;
  };
}

export interface FunnelReport {
  period: Period;
  steps: Array<{ key: string; name: string; count: number; conversion_rate: number; step_conversion_rate: number; dropoff_rate: number }>;
}

export interface CouponsReport {
  period: Period;
  coupons: Array<{ coupon_id: number; code: string; type: string; value: string; times_used: number; discount_usd: Usd; discount_khr: Khr; revenue_usd: Usd; revenue_khr: Khr }>;
  refunds: { count: number; amount_usd: Usd; amount_khr: Khr; by_reason: Array<{ reason: string | null; count: number; amount_usd: Usd; amount_khr: Khr }> };
}

type Reports = { sales: SalesReport; orders: OrdersReport; products: ProductsReport; customers: CustomersReport; funnel: FunnelReport; coupons: CouponsReport };

type Params = ReportRange & { group?: ReportGroup };

export const reportsApi = {
  get: <N extends ReportName>(name: N, params: Params) => api.get<{ data: Reports[N] }>(`/staff/reports/${name}`, { params }).then((r) => r.data),
  /** The same report as a CSV file (UTF-8 with BOM, so Excel shows Khmer names). */
  csv: (name: ReportName, params: Params) => api.get<Blob>(`/staff/reports/${name}`, { params: { ...params, format: "csv" }, responseType: "blob" }),
};

export const reportKeys = {
  report: (name: ReportName, params: Params) => ["staff", "reports", name, params] as const,
};

export const reportQueries = {
  report: <N extends ReportName>(name: N, params: Params) =>
    queryOptions({
      queryKey: reportKeys.report(name, params),
      queryFn: () => reportsApi.get(name, params),
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    }),
};
