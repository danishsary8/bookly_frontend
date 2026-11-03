import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { reportsApi, type CouponsReport, type OffersReport, type OrdersReport, type ReportName, type SalesReport } from "@/api/endpoints/reports";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { StaffUser } from "@/api/endpoints/staff";
import { navFor } from "@/features/admin/adminNav";
import { rangeDays } from "@/features/admin/dashboardRange";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { toast } from "@/stores/toast";
import ReportsPage from "./ReportsPage";

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };

const zero = { gross_revenue_usd: "0.00", gross_revenue_khr: null, refunds_usd: "0.00", refunds_khr: null, net_revenue_usd: "0.00", net_revenue_khr: null, orders_count: 0, orders_placed: 0, items_sold: 0, average_order_value_usd: "0.00", average_order_value_khr: null, discount_usd: "0.00", discount_khr: null, shipping_usd: "0.00", shipping_khr: null };
const period = { from: "2026-10-09", to: "2026-10-15", timezone: "Asia/Phnom_Penh" };
const sales: SalesReport = {
  period: { ...period, group: "day" },
  totals: { ...zero, gross_revenue_usd: "120.00", refunds_usd: "20.00", net_revenue_usd: "100.00", net_revenue_khr: "410000", orders_count: 4, orders_placed: 6, items_sold: 9, average_order_value_usd: "30.00" },
  comparison: { period, totals: { ...zero, net_revenue_usd: "80.00" }, change_percent: { gross_revenue: 50, refunds: 0, net_revenue: 25, orders_count: 100, orders_placed: 100, average_order_value: 0, items_sold: 100, discounts: 0, shipping: 0 } },
  series: [
    { date: "2026-10-14", orders_count: 1, gross_revenue_usd: "40.00", gross_revenue_khr: null, refunds_usd: "0.00", refunds_khr: null, net_revenue_usd: "40.00", net_revenue_khr: null, items_sold: 3, average_order_value_usd: "40.00" },
    { date: "2026-10-15", orders_count: 3, gross_revenue_usd: "80.00", gross_revenue_khr: null, refunds_usd: "20.00", refunds_khr: null, net_revenue_usd: "60.00", net_revenue_khr: null, items_sold: 6, average_order_value_usd: "26.67" },
  ],
};
const orders: OrdersReport = {
  period,
  total_orders: 10,
  orders_by_status: { pending: 2, delivered: 6, cancelled: 2 },
  cancellation_rate: 20,
  average_delivery_hours: 30,
  orders_by_payment_method: { cod: 7, khqr: 3 },
  orders_by_delivery_area: { phnom_penh: 8, provinces: 2 },
  comparison: { period, total_orders: 5, cancellation_rate: 10, average_delivery_hours: 40, change_percent: { total_orders: 100, cancellation_rate: 100, average_delivery_hours: -25 } },
};
const coupons: CouponsReport = {
  period,
  coupons: [{ coupon_id: 1, code: "WELCOME10", type: "percentage", value: "10.00", times_used: 3, discount_usd: "4.50", discount_khr: null, revenue_usd: "40.50", revenue_khr: null }],
  refunds: { count: 1, amount_usd: "20.00", amount_khr: null, by_reason: [{ reason: "Damaged", count: 1, amount_usd: "20.00", amount_khr: null }] },
};
const row = (orders: number, units: number, withOffer: number, revenue: string, discount: string, average: string, perOrder: string) => ({
  orders, units, units_with_offer: withOffer, revenue_usd: revenue, revenue_khr: null, discount_usd: discount, discount_khr: null,
  average_order_usd: average, average_order_khr: null, books_per_order: perOrder,
});
// Backend OfferReportTest numbers: 2 offer orders (example 1 + 2 Holmes books) and 1 order without an offer.
const offers: OffersReport = {
  period: { from: "2026-09-01", to: "2026-09-30", timezone: "Asia/Phnom_Penh" },
  offers: [{ offer_id: 1, name: "Buy 2 Holmes", min_quantity: 2, percent_off: "15.00", ...row(2, 5, 4, "67.00", "6.00", "33.50", "2.50") }],
  without_offer: row(1, 1, 0, "31.50", "0.00", "31.50", "1.00"),
};
const reports: Partial<Record<ReportName, unknown>> = { sales, orders, coupons, offers };

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const open = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>
      </Routes>
      <Where />
    </>,
    { route },
  );

beforeAll(() => {
  // Recharts sizes charts with ResizeObserver, which jsdom lacks.
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

const stubReports = () => vi.spyOn(reportsApi, "get").mockImplementation(async (name) => reports[name] as never);

describe("reports page", () => {
  it("shows the sales figures for the chosen days, grouped by day, with the numbers as a table", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    const get = stubReports();
    open("/admin/reports?period=7d");

    expect(await screen.findByText("$100.00")).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith("sales", { ...rangeDays({ period: "7d" }), group: "day" });
    expect(screen.getByText("≈ 410,000 ៛")).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Net revenue by day" });
    expect(within(table).getByRole("row", { name: "15 Oct $60.00" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "Week" }));
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("sales", { ...rangeDays({ period: "7d" }), group: "week" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/reports?period=7d&group=week");
  });

  it("keeps the period when switching tabs, and shows order mix with status labels", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    const get = stubReports();
    open("/admin/reports?period=7d");
    await screen.findByText("$100.00");

    await userEvent.click(screen.getByRole("tab", { name: "Orders" }));
    expect(await screen.findByText("20%")).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith("orders", rangeDays({ period: "7d" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/reports?tab=orders&period=7d");
    const byStatus = screen.getByRole("list", { name: "Orders by status" });
    expect(within(byStatus).getByText("Delivered")).toBeInTheDocument();
    expect(within(byStatus).getByText("· 60%")).toBeInTheDocument();
    expect(screen.getByText("Cash on delivery")).toBeInTheDocument();
    expect(screen.getByText("30 hours")).toBeInTheDocument();
  });

  it("downloads the open tab as CSV for the same days", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    stubReports();
    const csv = vi.spyOn(reportsApi, "csv").mockResolvedValue(new Blob(["a,b"]));
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    open("/admin/reports?tab=coupons&period=custom&from=2026-09-01&to=2026-09-30");

    expect(await screen.findByText("WELCOME10")).toBeInTheDocument();
    expect(screen.getByText("Damaged")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(csv).toHaveBeenCalledWith("coupons", { from: "2026-09-01", to: "2026-09-30" }));
    expect(click).toHaveBeenCalled();
  });

  it("downloads every report as one Excel file for the same days", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    stubReports();
    const excel = vi.spyOn(reportsApi, "excel").mockResolvedValue(new Blob(["xlsx"]));
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    const anchors: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      anchors.push(this);
    });
    open("/admin/reports?tab=coupons&period=custom&from=2026-09-01&to=2026-09-30");

    await screen.findByText("WELCOME10");
    await userEvent.click(screen.getByRole("button", { name: "Excel, all reports" }));
    await waitFor(() => expect(excel).toHaveBeenCalledWith({ from: "2026-09-01", to: "2026-09-30" }));
    expect(anchors[0]?.download).toBe("bookly-report-2026-09-01-to-2026-09-30.xlsx");
  });

  it("says the Excel download isn't available yet on an older API", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    stubReports();
    vi.spyOn(reportsApi, "excel").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    const error = vi.spyOn(toast, "error");
    open("/admin/reports?period=7d");

    await userEvent.click(await screen.findByRole("button", { name: "Excel, all reports" }));
    await waitFor(() => expect(error).toHaveBeenCalledWith(expect.objectContaining({ title: "Excel download isn't available yet" })));
  });

  it("shows what each offer sold next to orders without an offer, and exports it", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    stubReports();
    const csv = vi.spyOn(reportsApi, "csv").mockResolvedValue(new Blob(["a,b"]));
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    open("/admin/reports?tab=offers&period=custom&from=2026-09-01&to=2026-09-30");

    expect((await screen.findByText("Books per order with an offer")).parentElement).toHaveTextContent("2.50");
    expect(screen.getByText("Average order with an offer").parentElement).toHaveTextContent("$33.50");
    expect(screen.getByText("Without an offer: 1.00")).toBeInTheDocument();
    expect(screen.getByText("Without an offer: $31.50")).toBeInTheDocument();
    expect(screen.getByText("66.7% of 3 orders")).toBeInTheDocument();
    const table = screen.getByRole("region", { name: "Offers table" });
    const holmes = within(table).getByRole("rowheader", { name: /Buy 2 Holmes/ }).closest("tr")!;
    expect(within(holmes).getByText("Buy 2, save 15%")).toBeInTheDocument();
    expect(holmes).toHaveTextContent("$67.00");
    expect(holmes).toHaveTextContent("(4)");
    expect(within(table).getByRole("rowheader", { name: /Orders without an offer/ }).closest("tr")).toHaveTextContent("$31.50");
    await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(csv).toHaveBeenCalledWith("offers", { from: "2026-09-01", to: "2026-09-30" }));
  });

  it("says the offers report is not available yet on an API without offers", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    vi.spyOn(reportsApi, "get").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    open("/admin/reports?tab=offers");
    expect(await screen.findByText(/The offers report is not available on this server yet/)).toBeInTheDocument();
  });

  it("is in the admin menu for admins only", () => {
    const has = (role: "admin" | "staff") => navFor(role).some((g) => g.items.some((i) => i.to === "/admin/reports"));
    expect(has("admin")).toBe(true);
    expect(has("staff")).toBe(false);
  });
});
