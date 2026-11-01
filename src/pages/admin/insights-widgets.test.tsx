import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { insightsApi, type DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { staffApi, type DashboardSummary, type StaffUser } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import DashboardPage from "./DashboardPage";

/* Dashboard extras (BI design 2026-11-01, branch 4): numbers from the backend DashboardInsightsTest fixtures. */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const summary: DashboardSummary = {
  period: { from: "2026-10-04", to: "2026-10-10", timezone: "Asia/Phnom_Penh" },
  revenue: { gross_usd: "0.00", refunds_usd: "0.00", net_usd: "0.00" },
  delivered_orders: 0,
  average_order_value_usd: "0.00",
  orders_placed: 3,
  orders_by_status: { pending: 3 },
  new_customers: 0,
  best_sellers: [],
  open_returns: 0,
  low_stock: [],
};
const insights: DashboardInsights = {
  period: summary.period,
  trend: [],
  dead_stock: {
    days: 60, variants: 2, copies: 5, value_usd: "76.00", value_khr: null,
    items: [
      { book_variant_id: 2, book_id: 12, title: "The Time Machine", format: "paperback", sku: "BK1-PB", stock_quantity: 3, value_usd: "60.00", last_sold_at: "2026-07-01T03:00:00Z" },
      { book_variant_id: 3, book_id: 13, title: "Treasure Island", format: "hardcover", sku: "BK2-HC", stock_quantity: 2, value_usd: "16.00", last_sold_at: null },
    ],
  },
  stock_value: { copies: 10, value_usd: "126.00", value_khr: null, basis: "selling_price" },
  top_authors: [
    { author_id: 1, name: "Jane Austen", copies_sold: 2, sales_usd: "20.00", sales_khr: null },
    { author_id: 2, name: "Arthur Conan Doyle", copies_sold: 2, sales_usd: "16.00", sales_khr: null },
  ],
  provinces: [
    { code: "phnom_penh", name: "Phnom Penh", name_km: "ភ្នំពេញ", orders: 1, total_usd: "16.00", total_khr: null },
    { code: null, name: "Unknown", name_km: null, orders: 1, total_usd: "8.00", total_khr: null },
  ],
  promotions: { orders: 3, offer_orders: 1, offer_discount_usd: "1.20", coupon_orders: 1, coupon_discount_usd: "2.00", plain_orders: 1 },
  repeat_customer_rate: { customers: 2, returning: 1, percent: 50 },
};

const app = () =>
  renderWithProviders(
    <Routes>
      <Route element={<RequireStaff />}>
        <Route path="/admin" element={<DashboardPage />} />
      </Route>
    </Routes>,
    { route: "/admin" },
  );

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(() => {
  vi.restoreAllMocks();
  clearSession("staff");
});

describe("dashboard extras", () => {
  it("shows stock value, dead stock, repeat customers, authors, provinces and promotions", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue([]);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();

    expect((await screen.findByText("Stock value")).parentElement).toHaveTextContent("$126.00");
    expect(screen.getByText("Stock value").parentElement).toHaveTextContent("10 printed copies · at selling price");
    expect(screen.getByText("Dead stock (no sale in 60 days)").parentElement).toHaveTextContent("$76.00");
    expect(screen.getByText("Repeat customers").parentElement).toHaveTextContent("50%1 of 2 buyers had ordered before");

    const slow = screen.getByRole("list", { name: "In stock, no sale in 60 days, biggest value first" });
    expect(within(slow).getByRole("link", { name: /The Time Machine.*last sold 1 Jul 2026.*\$60\.00/ })).toHaveAttribute("href", "/admin/books/12");
    expect(within(slow).getByRole("link", { name: /Treasure Island.*never sold/ })).toBeInTheDocument();

    expect(within(screen.getByRole("list", { name: "Top authors by copies" })).getByText("Jane Austen")).toBeInTheDocument();
    const provinces = screen.getByRole("list", { name: "Orders by province" });
    expect(within(provinces).getByText("Phnom Penh")).toBeInTheDocument();
    expect(within(provinces).getByText("Unknown province")).toBeInTheDocument();

    const promo = screen.getByRole("table", { name: "Orders placed in this period by discount" });
    expect(within(promo).getByRole("row", { name: /With an offer 1 33% \$1\.20/ })).toBeInTheDocument();
    expect(within(promo).getByRole("row", { name: /With a coupon 1 33% \$2\.00/ })).toBeInTheDocument();
    expect(within(promo).getByRole("row", { name: /No discount 1 33% –/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Offers report/ })).toHaveAttribute("href", "/admin/reports?tab=offers");
  });

  it("hides the extras on an API without insights", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue([]);
    vi.spyOn(insightsApi, "get").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app();
    expect(await screen.findByRole("region", { name: "Net revenue by day" })).toBeInTheDocument();
    expect(screen.queryByText("Stock value")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Slow movers" })).not.toBeInTheDocument();
  });
});
