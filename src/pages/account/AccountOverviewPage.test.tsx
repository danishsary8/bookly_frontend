import { afterEach, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
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
  vi.spyOn(ebookApi, "library").mockResolvedValue([]);
  vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([]);
  vi.spyOn(ordersApi, "orders").mockResolvedValue({ data: [{ id: 42, order_number: "ORD-42", status: "delivered", placed_at: "2026-11-01T00:00:00Z", total_usd: "10.00", total_khr: "40000", items: [...items] } as Order] } as Paginated<Order>);
  renderWithProviders(<AccountOverviewPage />, { route: "/account" });
  expect(await screen.findByRole("link", { name: /Write a review/ })).toHaveAttribute("href", destination);
});

it("removes the old summary tiles and places Continue reading inline beside Latest order", async () => {
  vi.spyOn(accountApi, "me").mockResolvedValue({ id: 1, name: "Test Reader", email_verified: true });
  vi.spyOn(ebookApi, "library").mockResolvedValue([
    {
      id: 7,
      status: "ready",
      last_page: 3,
      page_count: 66,
      last_read_at: "2026-11-26T10:00:00Z",
      book: { id: 101, title: "The Art of War", cover_image_url: null },
    } as never,
  ]);
  vi.spyOn(rewardsApi, "myCoupons").mockResolvedValue([]);
  vi.spyOn(ordersApi, "orders").mockResolvedValue({ data: [] } as unknown as Paginated<Order>);

  renderWithProviders(<AccountOverviewPage />, { route: "/account" });

  expect(screen.queryByText("Coupons ready")).not.toBeInTheDocument();
  expect(screen.queryByText("Price drops")).not.toBeInTheDocument();

  const spotlight = document.querySelector<HTMLElement>('[data-spotlight="true"]');
  expect(spotlight).not.toBeNull();
  const resumeLink = await within(spotlight!).findByRole("link", { name: /Continue reading/i });
  expect(resumeLink).toHaveAttribute("href", "/read/101");
  expect(resumeLink).toHaveTextContent("The Art of War");
  expect(resumeLink).toHaveTextContent("Page 3 of 66");

  const shoppingCard = document.querySelector<HTMLElement>('[data-group="shopping"]');
  expect(shoppingCard).not.toBeNull();
  expect(within(shoppingCard!).queryByText("The Art of War")).not.toBeInTheDocument();
});
