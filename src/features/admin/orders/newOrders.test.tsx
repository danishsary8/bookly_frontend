import { afterEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { StaffUser } from "@/api/endpoints/staff";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import OrdersAdminPage from "@/pages/admin/OrdersAdminPage";
import { dismissToast } from "@/stores/toast";
import { renderWithProviders } from "@/test/render";
import { canViewOrders, NEW_ORDER_POLL_MS, resetNewOrders, useNewOrderWatch } from "./newOrders";

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const order = (id: number) =>
  ({ id, order_number: `ORD-${id}`, status: "pending", item_count: 2, total_usd: "11.99", placed_at: "2026-10-31T08:00:00Z", customer: { id: 5, name: "Sok Dara", email: "dara@bookly.test" } }) as unknown as StaffOrder;
const page = (data: StaffOrder[], total = data.length) =>
  ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 20, total, from: data.length ? 1 : null, to: data.length || null } }) as never;

function Watch({ user = admin }: { user?: StaffUser }) {
  useNewOrderWatch(user);
  return null;
}

const shell = (user?: StaffUser) =>
  renderWithProviders(
    <>
      <Watch user={user} />
      <Routes>
        <Route path="/admin/orders" element={<OrdersAdminPage />} />
      </Routes>
      <Toaster />
    </>,
    { route: "/admin/orders" },
  );

/** Waits until the first check has landed and been seen by the watcher. */
const firstCheck = async (queryClient: ReturnType<typeof shell>["queryClient"]) => {
  await waitFor(() => expect(queryClient.getQueryState(["staff", "new-order-watch"])?.status).toBe("success"));
  await act(async () => {});
};

/** Runs the next 30-second check without waiting 30 seconds. */
const nextCheck = async (queryClient: ReturnType<typeof shell>["queryClient"]) => {
  await act(() => queryClient.refetchQueries({ queryKey: ["staff", "new-order-watch"] }));
};

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  resetNewOrders();
  clearSession("staff");
});

describe("new order watch", () => {
  it("checks the newest order every 30 seconds", () => {
    expect(NEW_ORDER_POLL_MS).toBe(30_000);
  });

  it("stays quiet on the first check, then announces an order placed since", async () => {
    setSession("staff", { token: "t", expiresAt: null, user: admin });
    const orders = vi.spyOn(opsApi, "orders").mockResolvedValue(page([order(7)], 7));
    const { queryClient } = shell();
    expect(await screen.findByRole("link", { name: "ORD-7" })).toBeInTheDocument();
    expect(orders).toHaveBeenCalledWith({ per_page: 1 });
    expect(screen.queryByText(/new order/i)).not.toBeInTheDocument();
    expect(screen.queryByText("New")).not.toBeInTheDocument();

    orders.mockImplementation((f) => Promise.resolve(f?.per_page === 1 ? page([order(8)], 8) : page([order(8), order(7)], 8)));
    await nextCheck(queryClient);

    expect(await screen.findByText("New order ORD-8")).toBeInTheDocument();
    expect(screen.getByText("Sok Dara · 2 items")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order" })).toHaveAttribute("href", "/admin/orders/8");
    // The open orders list reloads by itself and marks only the new order.
    const row = (await screen.findByRole("link", { name: "ORD-8" })).closest("tr")!;
    expect(row).toHaveTextContent("New");
    expect(screen.getByRole("link", { name: "ORD-7" }).closest("tr")).not.toHaveTextContent("New");
  });

  it("counts several new orders together", async () => {
    const orders = vi.spyOn(opsApi, "orders").mockResolvedValue(page([order(7)], 7));
    const { queryClient } = renderWithProviders(
      <>
        <Watch />
        <Toaster />
      </>,
    );
    await firstCheck(queryClient);
    orders.mockResolvedValue(page([order(10)], 10));
    await nextCheck(queryClient);
    expect(await screen.findByText("3 new orders")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View orders" })).toHaveAttribute("href", "/admin/orders");
  });

  it("announces the very first order of a shop that had none", async () => {
    const orders = vi.spyOn(opsApi, "orders").mockResolvedValue(page([], 0));
    const { queryClient } = renderWithProviders(
      <>
        <Watch />
        <Toaster />
      </>,
    );
    await firstCheck(queryClient);
    orders.mockResolvedValue(page([order(1)], 1));
    await nextCheck(queryClient);
    expect(await screen.findByText("New order ORD-1")).toBeInTheDocument();
  });

  it("says nothing when the newest order is unchanged", async () => {
    const orders = vi.spyOn(opsApi, "orders").mockResolvedValue(page([order(7)], 7));
    const { queryClient } = renderWithProviders(
      <>
        <Watch />
        <Toaster />
      </>,
    );
    await firstCheck(queryClient);
    await nextCheck(queryClient);
    expect(orders).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/new order/i)).not.toBeInTheDocument();
  });

  it("does not ask for orders when the staff member may not view them", async () => {
    const orders = vi.spyOn(opsApi, "orders").mockResolvedValue(page([order(7)]));
    const limited: StaffUser = { ...admin, role: "staff", permissions: ["catalog:view"] };
    renderWithProviders(<Watch user={limited} />);
    await new Promise((r) => setTimeout(r, 20));
    expect(orders).not.toHaveBeenCalled();
    expect(canViewOrders({ ...limited, permissions: undefined })).toBe(true);
    expect(canViewOrders({ ...limited, permissions: ["orders:view"] })).toBe(true);
    expect(canViewOrders(undefined)).toBe(false);
  });
});
