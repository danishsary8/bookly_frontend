import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import type { StaffUser } from "@/api/endpoints/staff";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import { setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import OrdersAdminPage from "./OrdersAdminPage";

const adminUser: StaffUser = {
  id: 1,
  name: "Admin User",
  email: "admin@bookly.test",
  role: "admin",
  two_factor_enabled: true,
};

const makeOrder = (id: number, number: string, waiting: boolean): StaffOrder => ({
  id,
  order_number: number,
  status: "processing",
  payment_method: "cod",
  payment_status: "pending",
  placed_at: "2026-11-06T10:00:00Z",
  total_usd: "25.00",
  total_khr: "102500",
  subtotal_usd: "25.00",
  discount_usd: "0.00",
  shipping_fee_usd: "0.00",
  tax_usd: "0.00",
  is_free_shipping: true,
  can_cancel: waiting,
  is_waiting_stock: waiting,
  allowed_next_statuses: ["shipped", "cancelled"],
  customer: { id: 10, name: "Customer One", email: "c1@test.com" },
  items: [
    {
      id: 1,
      book_variant_id: 100,
      title: "Preorder Book",
      quantity: 1,
      unit_price_usd: "25.00",
      subtotal_usd: "25.00",
      discount_usd: "0.00",
      is_preorder: true,
    },
  ],
});

describe("Admin Orders Waiting & Pre-order Filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSession("staff", { token: "staff-token", expiresAt: null, user: adminUser });
  });

  it("renders Waiting filter tab and Waiting for stock / release badge", async () => {
    const ordersList = [
      makeOrder(1, "ORD-WAIT-01", true),
      makeOrder(2, "ORD-NORM-02", false),
    ];

    vi.spyOn(opsApi, "orders").mockResolvedValue({
      data: ordersList,
      links: {},
      meta: { current_page: 1, last_page: 1, per_page: 20, total: 2, from: 1, to: 2 },
    } as never);

    renderWithProviders(
      <Routes>
        <Route path="/admin/orders" element={<OrdersAdminPage />} />
      </Routes>,
      { route: "/admin/orders" },
    );

    // Filter tab "Waiting" exists
    expect(await screen.findByRole("radio", { name: "Waiting" })).toBeInTheDocument();

    // Order numbers appear
    expect(await screen.findByText("ORD-WAIT-01")).toBeInTheDocument();
    expect(screen.getByText("ORD-NORM-02")).toBeInTheDocument();

    // Badge appears for waiting order
    expect(screen.getByText("Waiting for stock / release")).toBeInTheDocument();
  });
});
