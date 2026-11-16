import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { purchaseApi } from "@/api/endpoints/purchases";
import { renderWithProviders } from "@/test/render";
import PurchaseListPage from "./PurchaseListPage";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("shows reserved demand and lets staff export the purchase list", async () => {
  vi.spyOn(purchaseApi, "list").mockResolvedValue([{ book_id: 1, title: "A book", variant_id: 2, format: "paperback", sku: "BOOK-1", stock_quantity: -2, low_stock_threshold: 5, waiting_quantity: 4, quantity_to_buy: 8 }]);
  const csv = vi.spyOn(purchaseApi, "csv").mockResolvedValue(new Blob(["book"]));
  vi.stubGlobal("URL", class extends URL { static createObjectURL = vi.fn(() => "blob:test"); static revokeObjectURL = vi.fn(); });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  renderWithProviders(<PurchaseListPage />);
  expect(await screen.findByRole("rowheader", { name: "A book" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "8" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));
  expect(csv).toHaveBeenCalledOnce();
});

it("puts the most urgent book first and shows when each format runs out", async () => {
  vi.spyOn(purchaseApi, "list").mockResolvedValue([
    { book_id: 1, title: "Slow book", variant_id: 1, format: "paperback", sku: "S-1", stock_quantity: 2, low_stock_threshold: 3, waiting_quantity: 0, quantity_to_buy: 2, sold_last_30_days: 0, days_left: null },
    { book_id: 2, title: "Fast book", variant_id: 2, format: "hardcover", sku: "F-1", stock_quantity: 3, low_stock_threshold: 5, waiting_quantity: 0, quantity_to_buy: 3, sold_last_30_days: 30, days_left: 3 },
  ]);
  renderWithProviders(<PurchaseListPage />);
  const headers = await screen.findAllByRole("rowheader");
  expect(headers.map((h) => h.textContent)).toEqual(["Fast book", "Slow book"]);
  expect(screen.getByText("3 days")).toBeInTheDocument();
  expect(screen.getByText("30 sold in 30 days")).toBeInTheDocument();
  expect(screen.getByText("Not selling")).toBeInTheDocument();
  expect(screen.getByText(/Buy 5/)).toBeInTheDocument();
});
