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
