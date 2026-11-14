import { afterEach, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { accountApi } from "@/api/endpoints/account";
import { ebookApi } from "@/api/endpoints/ebooks";
import { ordersApi } from "@/api/endpoints/orders";
import { rewardsApi } from "@/api/endpoints/rewards";
import type { Order, Paginated } from "@/api/types";
import { renderWithProviders } from "@/test/render";
import AccountOverviewPage from "./AccountOverviewPage";

vi.mock("@/features/account/StockAlertsCard", () => ({ StockAlertsCard: () => null }));
vi.mock("@/features/account/StoreCreditsCard", () => ({ StoreCreditsCard: () => null }));
afterEach(() => vi.restoreAllMocks());

it.each([[[{ book_id: 9 }], "/books/9#your-review"], [[{ book_id: 9 }, { book_id: 10 }], "/account/orders/42"]] as const)("sends delivered-order reviews to a place where customers can write them", async (items, destination) => {
  vi.spyOn(accountApi, "me").mockResolvedValue({ id: 1, name: "Test Reader", email_verified: true });
  vi.spyOn(accountApi, "addresses").mockResolvedValue([]);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 100, from: null, to: null }, links: { first: null, last: null, prev: null, next: null } });
  vi.spyOn(ebookApi, "library").mockResolvedValue([]);
  vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([]);
  vi.spyOn(ordersApi, "orders").mockResolvedValue({ data: [{ id: 42, order_number: "ORD-42", status: "delivered", placed_at: "2026-11-01T00:00:00Z", total_usd: "10.00", total_khr: "40000", items: [...items] } as Order] } as Paginated<Order>);
  renderWithProviders(<AccountOverviewPage />, { route: "/account" });
  expect(await screen.findByRole("link", { name: /Write a review/ })).toHaveAttribute("href", destination);
});
