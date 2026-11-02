import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type StaffHealth, type StaffUser } from "@/api/endpoints/staff";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { SystemHealthCard } from "@/features/admin/SystemHealthCard";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import OrderAdminPage from "./OrderAdminPage";
import OrdersAdminPage from "./OrdersAdminPage";

/* KHQR payments in the admin (design 2026-11-02, branch khqr-admin). */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 20, total: data.length, from: 1, to: data.length } }) as never;

const base = {
  id: 9, order_number: "ORD-20261102-ABCDE", status: "pending", payment_method: "khqr", payment_status: "pending", placed_at: "2026-11-02T10:00:00Z",
  items: [{ id: 1, book_id: 1, title: "Emma", format: "paperback", quantity: 1, unit_price_usd: "12.99", subtotal_usd: "12.99" }],
  subtotal_usd: "12.99", discount_usd: "0.00", shipping_fee_usd: "1.50", tax_usd: "0.00", total_usd: "14.49", total_khr: "59409",
  shipping_address: { recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12", city: "Phnom Penh", country: "Cambodia" },
  can_cancel: true, customer: { id: 4, name: "Sok Dara", email: "dara@example.com" }, status_history: [], allowed_next_statuses: ["processing", "cancelled"],
};
const qrRow = (over: object) => ({ id: 1, provider: "bakong", status: "pending", amount: "14.49", currency: "USD", reference: "a".repeat(32), paid_at: null, how: null, paid_after_cancel: false, created_at: "2026-11-02T10:00:00Z", ...over });
const waiting = { ...base, payments: [qrRow({}), qrRow({ id: 2, amount: "59409.00", currency: "KHR" })] } as unknown as StaffOrder;

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/orders" element={<OrdersAdminPage />} />
          <Route path="/admin/orders/:id" element={<OrderAdminPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route },
  );

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("order payment box", () => {
  it("lists the KHQR codes and lets an admin mark the order paid with a note", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(opsApi, "order").mockResolvedValue(waiting);
    const mark = vi.spyOn(opsApi, "markOrderPaid").mockResolvedValue({
      ...waiting, status: "paid", payment_status: "succeeded",
      payments: [qrRow({ status: "succeeded", how: "staff", paid_at: "2026-11-02T10:05:00Z" }), qrRow({ id: 2, status: "failed", amount: "59409.00", currency: "KHR" })],
    } as unknown as StaffOrder);
    app("/admin/orders/9");
    const box = await screen.findByRole("region", { name: "Payment" });
    expect(within(box).getByText("Bakong KHQR")).toBeInTheDocument();
    expect(within(box).getByText("$14.49")).toBeInTheDocument();
    expect(within(box).getByText("59,409 ៛")).toBeInTheDocument();
    expect(within(box).getAllByText("Waiting")).toHaveLength(2);

    await user.click(within(box).getByRole("button", { name: "Mark as paid" }));
    const dialog = await screen.findByRole("dialog", { name: /Mark ORD-20261102-ABCDE as paid/ });
    await user.click(within(dialog).getByRole("button", { name: "Mark as paid" }));
    expect(within(dialog).getByText(/at least 3 characters/)).toBeInTheDocument();
    expect(mark).not.toHaveBeenCalled();
    await user.type(within(dialog).getByLabelText("How did you check?"), "Seen in ABA app");
    await user.click(within(dialog).getByRole("button", { name: "Mark as paid" }));
    await waitFor(() => expect(mark).toHaveBeenCalledWith(9, "Seen in ABA app"));
    expect(await within(screen.getByRole("region", { name: "Payment" })).findByText(/confirmed by staff/)).toBeInTheDocument();
  });

  it("staff see the codes but cannot mark paid", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "order").mockResolvedValue(waiting);
    app("/admin/orders/9");
    const box = await screen.findByRole("region", { name: "Payment" });
    expect(within(box).queryByRole("button", { name: "Mark as paid" })).not.toBeInTheDocument();
    expect(within(box).getByText(/Only admins can mark it as paid/)).toBeInTheDocument();
  });

  it("flags a payment that came after the cancel", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "order").mockResolvedValue({
      ...base, status: "cancelled", allowed_next_statuses: [],
      payments: [qrRow({ status: "succeeded", how: "bakong", paid_at: "2026-11-02T10:20:00Z", paid_after_cancel: true })],
    } as unknown as StaffOrder);
    app("/admin/orders/9");
    expect(await screen.findByText(/after the order was cancelled\. Refund the customer by hand/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as paid" })).not.toBeInTheDocument();
  });

  it("cash on delivery looks as before (also on an API without payment rows)", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "order").mockResolvedValue({ ...base, payment_method: "cod", payments: undefined } as unknown as StaffOrder);
    app("/admin/orders/9");
    const box = await screen.findByRole("region", { name: "Payment" });
    expect(within(box).getByText("Cash on delivery")).toBeInTheDocument();
    expect(within(box).getByText("Not collected yet")).toBeInTheDocument();
  });
});

describe("orders list payment filter", () => {
  it("asks the API for KHQR orders only", async () => {
    const user = userEvent.setup();
    signIn(admin);
    const list = vi.spyOn(opsApi, "orders").mockResolvedValue(page([waiting]));
    app("/admin/orders");
    await user.click(await screen.findByRole("radio", { name: "KHQR" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ payment_method: "khqr" })));
  });
});

describe("health card", () => {
  const health = (payments?: StaffHealth["checks"]["payments"]): StaffHealth => ({
    status: "ok",
    checks: { database: { status: "ok" }, queue: { status: "ok", pending: 0, failed: 0, oldest_pending_seconds: null }, telegram_bot: { status: "ok" }, ...(payments ? { payments } : {}) },
  });

  it("shows test mode, and a blocked Bakong as a problem", async () => {
    signIn(admin);
    const spy = vi.spyOn(staffApi, "health").mockResolvedValue(health({ mode: "test", status: "test", token_expires_at: null, last_check_at: null }));
    const { unmount } = renderWithProviders(<SystemHealthCard />);
    expect(await screen.findByText("Test mode: Simulate button, no real money")).toBeInTheDocument();
    unmount();
    spy.mockResolvedValue(health({ mode: "bakong", status: "blocked", token_expires_at: "2027-01-30T00:00:00Z", last_check_at: "2026-11-02T10:00:00Z" }));
    renderWithProviders(<SystemHealthCard />);
    expect(await screen.findByText(/Bakong refused this server/)).toBeInTheDocument();
  });

  it("no payments line on an API without it", async () => {
    signIn(admin);
    vi.spyOn(staffApi, "health").mockResolvedValue(health());
    renderWithProviders(<SystemHealthCard />);
    await screen.findByText("Telegram bot");
    expect(screen.queryByText("KHQR payments")).not.toBeInTheDocument();
  });
});
