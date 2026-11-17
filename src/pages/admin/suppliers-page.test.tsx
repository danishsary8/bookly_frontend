import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { suppliersApi, type Supplier } from "@/api/endpoints/suppliers";
import { clearSession, setSession } from "@/api/session";
import { renderWithProviders } from "@/test/render";
import SuppliersPage from "./SuppliersPage";

afterEach(() => { vi.restoreAllMocks(); clearSession("staff"); });

const monument: Supplier = { id: 1, name: "Monument Books", contact_name: "Dara", phone: "012 345 678", email: "orders@monument.test", note: null, is_active: true, restocks: 3, units: 40, spend_usd: "232.50", last_restock_at: "2026-11-10T03:00:00Z" };
const old: Supplier = { ...monument, id: 2, name: "Old Shop", contact_name: null, phone: null, email: null, is_active: false, restocks: 0, units: 0, spend_usd: "0.00", last_restock_at: null };

it("shows suppliers as cards with what was bought, and adds a new one", async () => {
  setSession("staff", { token: "t", expiresAt: null, user: { id: 1, name: "Admin", email: "a@b.test", role: "admin", two_factor_enabled: true } });
  vi.spyOn(suppliersApi, "list").mockResolvedValue([monument, old]);
  const create = vi.spyOn(suppliersApi, "create").mockResolvedValue({ ...monument, id: 3, name: "Peace Book Center" });
  renderWithProviders(<SuppliersPage />);

  const card = (await screen.findByRole("heading", { name: "Monument Books" })).closest("article")!;
  expect(within(card).getByText("$232.50")).toBeInTheDocument();
  expect(within(card).getByRole("link", { name: "012 345 678" })).toHaveAttribute("href", "tel:012345678");
  expect(within(card).getByText("Last restock 10 Nov 2026")).toBeInTheDocument();
  expect(within(screen.getByRole("heading", { name: "Old Shop" }).closest("article")!).getByText("Switched off")).toBeInTheDocument();
  expect(screen.getByText("1 active")).toBeInTheDocument();

  await userEvent.click(screen.getAllByRole("button", { name: "Add supplier" })[0]);
  await userEvent.click(screen.getByRole("button", { name: "Save supplier" }));
  expect(await screen.findByText("Enter the supplier's name.")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/Supplier name/), "Peace Book Center");
  await userEvent.click(screen.getByRole("button", { name: "Save supplier" }));
  await waitFor(() => expect(create).toHaveBeenCalledWith({ name: "Peace Book Center", type: "distributor", publisher_id: null, contact_name: null, phone: null, email: null, note: null, is_active: true }));
});

it("lets staff pick an active supplier when restocking", async () => {
  const { RestockDialog } = await import("@/features/admin/stock/RestockDialog");
  const { staffApi } = await import("@/api/endpoints/staff");
  vi.spyOn(suppliersApi, "list").mockResolvedValue([monument]);
  const restock = vi.spyOn(staffApi, "restockVariant").mockResolvedValue({ variant: {}, movement: { change_qty: 5 } } as never);
  renderWithProviders(<RestockDialog variant={{ id: 9, sku: "D-1", stock_quantity: 0 }} open onOpenChange={() => {}} />);

  await userEvent.type(await screen.findByLabelText(/Quantity received/), "5");
  await userEvent.selectOptions(await screen.findByLabelText(/^Supplier/), "Monument Books");
  await userEvent.click(screen.getByRole("button", { name: "Confirm restock" }));
  await waitFor(() => expect(restock).toHaveBeenCalledWith(9, { quantity: 5, supplier_id: 1, supplier: null, unit_cost_usd: null, note: null }));
});

it("suggests the book's own publisher first when restocking (owner 2026-11-17)", async () => {
  const { RestockDialog } = await import("@/features/admin/stock/RestockDialog");
  const direct = { ...monument, id: 7, name: "Penguin (direct)", type: "publisher" as const, publisher: { id: 3, name: "Penguin" } };
  vi.spyOn(suppliersApi, "list").mockResolvedValue([{ ...monument, type: "distributor" as const }, direct]);
  renderWithProviders(<RestockDialog variant={{ id: 9, sku: "D-1", stock_quantity: 0, publisher_id: 3 }} open onOpenChange={() => {}} />);
  const select = (await screen.findByRole("combobox", { name: /^Supplier/ })) as HTMLSelectElement;
  await waitFor(() => expect(select.value).toBe("7"));
  expect([...select.querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["This book's publisher", "Distributors and wholesalers"]);
});
