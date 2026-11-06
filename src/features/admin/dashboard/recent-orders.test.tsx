import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import type { StaffUser } from "@/api/endpoints/staff";
import { renderWithProviders } from "@/test/render";
import { RecentOrders } from "./RecentOrders";

const order: StaffOrder = { id: 2, order_number: "ORD-2", status: "pending", total_usd: "10.00", allowed_next_statuses: ["processing"] };
const admin: StaffUser = { id: 1, name: "Staff", email: "staff@example.test", role: "admin", two_factor_enabled: true };
afterEach(() => vi.restoreAllMocks());

it("confirms a status change only after the user accepts the dialog", async () => {
  vi.spyOn(opsApi, "orders").mockResolvedValue({ data: [order], links: {}, meta: { current_page: 1, last_page: 1, per_page: 5, total: 1 } });
  const update = vi.spyOn(opsApi, "setOrderStatus").mockResolvedValue({ ...order, status: "processing" });
  renderWithProviders(<RecentOrders user={admin} />);
  await userEvent.click(await screen.findByRole("button", { name: "Confirm ORD-2" }));
  expect(update).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Confirm change" }));
  await waitFor(() => expect(update).toHaveBeenCalledWith(2, "processing"));
});

it("does not show status actions to staff without manage permission", async () => {
  vi.spyOn(opsApi, "orders").mockResolvedValue({ data: [order], links: {}, meta: { current_page: 1, last_page: 1, per_page: 5, total: 1 } });
  renderWithProviders(<RecentOrders user={{ ...admin, role: "staff", permissions: ["orders:view"] }} />);
  expect(await screen.findByRole("link", { name: "ORD-2" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm ORD-2" })).not.toBeInTheDocument();
});
