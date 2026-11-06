import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { insightsApi, type DashboardInsights, type TrendDay } from "@/api/endpoints/dashboardInsights";
import { staffApi, type DailySales, type DashboardSummary, type StaffUser } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import DashboardPage from "./DashboardPage";

/* Dashboard redesign (BI design 2026-11-01, branch 2): KPI trend lines + View links, income vs previous period, donut. */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const summary: DashboardSummary = {
  period: { from: "2026-10-04", to: "2026-10-06", timezone: "Asia/Phnom_Penh" },
  revenue: { gross_usd: "55.50", refunds_usd: "5.00", net_usd: "50.50" },
  delivered_orders: 3,
  average_order_value_usd: "18.50",
  orders_placed: 4,
  orders_by_status: { pending: 1, paid: 0, processing: 0, shipped: 0, delivered: 3, cancelled: 0, returned: 0 },
  new_customers: 2,
  best_sellers: [],
  open_returns: 1,
  low_stock: [],
};
const sales: DailySales[] = [{ date: "2026-10-04", orders_placed: 1, gross_revenue_usd: "10.00", refunds_usd: "0.00", net_revenue_usd: "10.00" }];
const day = (date: string, previous: string, net: string, prevNet: string, orders: number, prevOrders: number): TrendDay => ({
  date, previous_date: previous, net_revenue_usd: net, previous_net_revenue_usd: prevNet, orders_placed: orders, previous_orders_placed: prevOrders,
  average_order_usd: net, previous_average_order_usd: prevNet, new_customers: 1, previous_new_customers: 0,
});
const insights = {
  period: summary.period,
  trend: [day("2026-10-04", "2026-10-01", "10.00", "5.00", 1, 2), day("2026-10-05", "2026-10-02", "20.50", "0.00", 2, 0), day("2026-10-06", "2026-10-03", "20.00", "15.00", 1, 1)],
} as DashboardInsights;

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

describe("dashboard redesign", () => {
  it("shows real book and ebook copy counts when supplied", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue({ ...summary, books_sold: 8, ebooks_sold: 3 });
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();
    expect(await screen.findByRole("region", { name: "Books sold" })).toHaveTextContent("8");
    expect(screen.getByRole("region", { name: "Ebooks sold" })).toHaveTextContent("3");
  });

  it("shows payment shares and completed reminder recovery without claiming causation", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue({ ...insights, payment_methods: [{ method: "cod", orders: 2, total_usd: "12.00", percent: 75 }], cart_reminder_recovery: { sent: 4, recovered: 1, percent: 25 }, repeat_customer_rate: { customers: 3, returning: 1, percent: 33.3 }, promotions: { orders: 2, offer_orders: 0, offer_discount_usd: "0.00", coupon_orders: 0, coupon_discount_usd: "0.00", gift_orders: 1, plain_orders: 2 } });
    app();
    expect(await screen.findByRole("rowheader", { name: "Cash on delivery" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Cart reminder recovery" })).toHaveTextContent("1 (25%)");
    expect(screen.getByText(/may not have been caused by the reminder/)).toBeInTheDocument();
    expect(screen.getByText("First-time customers").nextElementSibling).toHaveTextContent("2");
  });

  it("shows attention counts and staff activity in accessible tabs", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue({ ...insights, attention: { pending_orders: 2, open_returns: 1, low_stock: 3, waiting_orders: 1, recent_reviews: 4, open_chats: 2 }, activity: [{ id: 9, action: "order.updated", entity_type: "order", entity_id: 12, staff_name: "Dara", created_at: "2026-10-10T10:00:00Z" }] });
    app();
    expect(await screen.findByRole("link", { name: /New orders 2/ })).toHaveAttribute("href", "/admin/orders?status=pending");
    await userEvent.click(screen.getByRole("tab", { name: "Activity" }));
    expect(screen.getByText(/Dara/)).toBeInTheDocument();
    expect(screen.getByText(/order.updated/)).toBeInTheDocument();
  });

  it("shows KPI cards with a trend line and a View link each", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();
    expect(await screen.findByRole("region", { name: "Net revenue" })).toHaveTextContent("$50.50");
    expect(await screen.findAllByTestId("sparkline")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "View sales report" })).toHaveAttribute("href", "/admin/reports");
    expect(screen.getByRole("link", { name: "View orders" })).toHaveAttribute("href", "/admin/orders");
    expect(screen.getByRole("link", { name: "View order report" })).toHaveAttribute("href", "/admin/reports?tab=orders");
    expect(screen.getByRole("link", { name: "View customers" })).toHaveAttribute("href", "/admin/customers");
  });

  it("compares income with the previous period and switches to orders", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();
    const panel = await screen.findByRole("region", { name: "Income report" });
    const legend = within(panel).getByRole("list", { name: "Legend" });
    expect(legend).toHaveTextContent("This period · $50.50");
    expect(legend).toHaveTextContent("Previous period · $20.00");
    await user.click(within(panel).getByRole("radio", { name: "Orders" }));
    expect(legend).toHaveTextContent("This period · 4");
    expect(legend).toHaveTextContent("Previous period · 3");
    await user.click(within(panel).getByRole("button", { name: "Show as a table" }));
    const table = within(panel).getByRole("table");
    expect(within(table).getByRole("row", { name: /4 Oct 1 1 Oct 2/ })).toBeInTheDocument();
  });

  it("shows orders by status as a donut with the total and a text list", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();
    const list = await screen.findByRole("list", { name: "Orders placed by status, 4 in total" });
    expect(list).toHaveTextContent("Delivered375%");
    expect(list).toHaveTextContent("Pending125%");
    expect(screen.getByRole("link", { name: /1 open return · View orders/ })).toHaveAttribute("href", "/admin/orders");
  });

  it("works on an API without insights: daily bars, no trend lines", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app();
    expect(await screen.findByRole("region", { name: "Net revenue by day" })).toBeInTheDocument();
    expect(screen.queryByTestId("sparkline")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Income report" })).not.toBeInTheDocument();
  });

  it("never prints a damaged status answer as text", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    const damaged = { ...summary, orders_by_status: { __PHP_Incomplete_Class_Name: "Illuminate\\Support\\Collection" } as never };
    vi.spyOn(staffApi, "summary").mockResolvedValue(damaged);
    vi.spyOn(staffApi, "sales").mockResolvedValue(sales);
    vi.spyOn(insightsApi, "get").mockResolvedValue(insights);
    app();
    expect(await screen.findByRole("list", { name: "Orders placed by status, 0 in total" })).toBeInTheDocument();
    expect(screen.queryByText(/Incomplete|Collection/)).not.toBeInTheDocument();
  });
});
