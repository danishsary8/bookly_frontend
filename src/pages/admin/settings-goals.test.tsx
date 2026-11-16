import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { shopSettingsApi, type ShopSettings } from "@/api/endpoints/shopSettings";
import { clearSession, setSession } from "@/api/session";
import { GoalCard } from "@/features/admin/dashboard/GoalCard";
import { BookSalesPanel } from "@/features/admin/books/BookSalesPanel";
import { renderWithProviders } from "@/test/render";
import SettingsPage from "./SettingsPage";

afterEach(() => { vi.restoreAllMocks(); clearSession("staff"); });

const settings: ShopSettings = { shipping_fee_phnom_penh_usd: "1.50", shipping_fee_provinces_usd: "3.00", free_shipping_threshold_usd: "50.00", monthly_sales_goal_usd: null, province_rates: { kandal: "2.00" } };
const admin = { id: 1, name: "Admin", email: "a@b.test", role: "admin" as const, two_factor_enabled: true };

it("lets an admin change delivery fees and set a monthly goal", async () => {
  setSession("staff", { token: "t", expiresAt: null, user: admin });
  vi.spyOn(shopSettingsApi, "get").mockResolvedValue(settings);
  const update = vi.spyOn(shopSettingsApi, "update").mockResolvedValue({ ...settings, shipping_fee_phnom_penh_usd: "2.00", monthly_sales_goal_usd: "2000.00" });
  renderWithProviders(<SettingsPage />);

  const fee = await screen.findByLabelText(/Phnom Penh delivery fee/);
  expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  await userEvent.clear(fee);
  await userEvent.type(fee, "2.5.0");
  await userEvent.type(screen.getByLabelText(/Goal per month/), "2000");
  expect(screen.getByText("You have unsaved changes.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(await screen.findByText("Enter an amount like 1.50 (at most 2 decimals).")).toBeInTheDocument();
  expect(update).not.toHaveBeenCalled();

  await userEvent.clear(fee);
  await userEvent.type(fee, "2.00");
  await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(update).toHaveBeenCalledWith({ shipping_fee_phnom_penh_usd: "2.00", shipping_fee_provinces_usd: "3.00", free_shipping_threshold_usd: "50.00", monthly_sales_goal_usd: "2000" }));
});

it("shows settings read-only to staff", async () => {
  setSession("staff", { token: "t", expiresAt: null, user: { ...admin, role: "staff" } });
  vi.spyOn(shopSettingsApi, "get").mockResolvedValue(settings);
  renderWithProviders(<SettingsPage />);
  expect(await screen.findByLabelText(/Phnom Penh delivery fee/)).toBeDisabled();
  expect(screen.getByText("Only admins can change these settings.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
});

it("shows this month's goal progress and whether the shop is on track", async () => {
  vi.spyOn(shopSettingsApi, "goal").mockResolvedValue({ month: "2026-11", days_in_month: 30, days_passed: 10, net_revenue_usd: "500.00", net_revenue_khr: null, goal_usd: "1200.00", percent: 41.7, expected_by_today_usd: "400.00", on_track: true, needed_per_day_usd: "35.00" });
  renderWithProviders(<GoalCard />);
  expect(await screen.findByText("On track")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Monthly goal" })).toHaveAttribute("aria-valuenow", "42");
  expect(screen.getByText(/Expected by today: \$400.00/)).toBeInTheDocument();
  expect(screen.getByText("$35.00 a day needed for the rest of the month")).toBeInTheDocument();
});

it("invites setting a goal when there is none", async () => {
  vi.spyOn(shopSettingsApi, "goal").mockResolvedValue({ month: "2026-11", days_in_month: 30, days_passed: 10, net_revenue_usd: "0.00", net_revenue_khr: null, goal_usd: null, percent: null, expected_by_today_usd: null, on_track: null, needed_per_day_usd: null });
  renderWithProviders(<GoalCard />);
  expect(await screen.findByText("Set a monthly sales goal to see your progress here.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Set a goal/ })).toHaveAttribute("href", "/admin/settings");
});

it("shows how one book sells with its best-seller rank", async () => {
  vi.spyOn(shopSettingsApi, "bookSales").mockResolvedValue({ sold_30_days: 4, sold_90_days: 9, sales_90_days_usd: "90.00", sold_all_time: 20, rank_90_days: 3, books_ranked: 40, last_sold_at: null, by_format: [{ variant_id: 1, format: "paperback", units_sold: 7 }, { variant_id: 2, format: "hardcover", units_sold: 2 }] });
  renderWithProviders(<BookSalesPanel bookId={5} />);
  expect(await screen.findByText("#3 best seller of 40 (90 days)")).toBeInTheDocument();
  expect(screen.getByText("Paperback · 7")).toBeInTheDocument();
  expect(screen.getByText(/20 copies sold in total/)).toBeInTheDocument();
});

it("hides the goal card and book sales instead of crashing on an unexpected answer", async () => {
  vi.spyOn(shopSettingsApi, "goal").mockResolvedValue([] as never);
  vi.spyOn(shopSettingsApi, "bookSales").mockResolvedValue([] as never);
  const { container } = renderWithProviders(<><GoalCard /><BookSalesPanel bookId={1} /></>);
  await waitFor(() => expect(container.querySelector("#dash-goal")).toBeNull());
  await waitFor(() => expect(container.querySelector("#book-sales")).toBeNull());
});
