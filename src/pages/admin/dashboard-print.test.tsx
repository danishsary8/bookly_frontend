import { screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { insightsApi, type DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { staffApi, type DashboardSummary } from "@/api/endpoints/staff";
import { renderWithProviders } from "@/test/render";
import DashboardPrintPage from "./DashboardPrintPage";

afterEach(() => vi.restoreAllMocks());

it("prints the selected period with real dashboard totals and analysis", async () => {
  const summary: DashboardSummary = { period: { from: "2026-10-01", to: "2026-10-07", timezone: "Asia/Phnom_Penh" }, revenue: { gross_usd: "20.00", refunds_usd: "0.00", net_usd: "20.00" }, delivered_orders: 2, open_returns: 0, low_stock: [], orders_placed: 2, new_customers: 1, average_order_value_usd: "10.00", books_sold: 3, ebooks_sold: 1, orders_by_status: { pending: 1 }, best_sellers: [{ book_id: 1, title: "The book", copies_sold: 3, sales_usd: "20.00" }], top_categories: [] };
  const insights: DashboardInsights = { period: summary.period, trend: [], dead_stock: { days: 60, variants: 0, copies: 0, value_usd: "0.00", value_khr: null, items: [] }, stock_value: { copies: 0, value_usd: "0.00", value_khr: null, basis: "selling_price" }, top_authors: [], payment_methods: [], promotions: { orders: 2, offer_orders: 1, offer_discount_usd: "1.00", coupon_orders: 0, coupon_discount_usd: "0.00", plain_orders: 1, gift_orders: 1 }, cart_reminder_recovery: { sent: 4, recovered: 1, percent: 25 }, repeat_customer_rate: { customers: 2, returning: 1, percent: 50 }, provinces: [], order_ratings: { average: 4, count: 1 } };
  vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
  vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
  renderWithProviders(<DashboardPrintPage />, { route: "/admin/reports/print?period=7d" });
  expect(await screen.findByText("The book")).toBeInTheDocument();
  expect(screen.getByText(/2026-10-01 – 2026-10-07/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Print / Save as PDF" })).toBeEnabled();
  expect(staffApi.summary).toHaveBeenCalledWith({ period: "7d" });
});

it("does not present missing payment data as zero orders", async () => {
  const summary: DashboardSummary = { period: { from: "2026-10-01", to: "2026-10-07", timezone: "Asia/Phnom_Penh" }, revenue: { gross_usd: "0.00", refunds_usd: "0.00", net_usd: "0.00" }, delivered_orders: 0, open_returns: 0, low_stock: [], orders_placed: 0, new_customers: 0, average_order_value_usd: "0.00", orders_by_status: {}, best_sellers: [], top_categories: [] };
  const insights: DashboardInsights = { period: summary.period, trend: [], dead_stock: { days: 60, variants: 0, copies: 0, value_usd: "0.00", value_khr: null, items: [] }, stock_value: { copies: 0, value_usd: "0.00", value_khr: null, basis: "selling_price" }, top_authors: [], promotions: { orders: 0, offer_orders: 0, offer_discount_usd: "0.00", coupon_orders: 0, coupon_discount_usd: "0.00", plain_orders: 0 }, repeat_customer_rate: { customers: 0, returning: 0, percent: 0 }, provinces: [], order_ratings: { average: 4, count: 1 } };
  vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
  vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
  renderWithProviders(<DashboardPrintPage />);
  expect(await screen.findByText("No data")).toBeInTheDocument();
  expect(screen.queryByText("No orders in this period.")).not.toBeInTheDocument();
});
