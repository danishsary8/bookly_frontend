import { afterEach, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { api } from "@/api/client";
import { renderWithProviders } from "@/test/render";
import { parseBookFilters, toSearchParams } from "@/lib/catalog";
import { CatalogRows } from "./CatalogRows";

afterEach(() => vi.restoreAllMocks());

it("renders fixed translated shelves with matching catalogue links", async () => {
  vi.spyOn(api, "get").mockResolvedValue({ data: [
    { id: "coming_soon", total: 1, books: [{ id: 1, title: "Future book" }] },
    { id: "ebook_deals", total: 1, books: [{ id: 2, title: "Ebook" }] },
  ] });
  renderWithProviders(<CatalogRows />);
  expect(await screen.findByRole("heading", { name: "Coming soon" })).toBeInTheDocument();
  const links = screen.getAllByRole("link", { name: "View all" });
  expect(links[0]).toHaveAttribute("href", "/books?coming_soon=1&sort=release_soon");
  expect(links[1]).toHaveAttribute("href", "/books?has_ebook=1&format=ebook&max_price=4.99&sort=price_asc");
  const filters = parseBookFilters(new URLSearchParams("coming_soon=1&sort=release_soon"));
  expect(filters).toMatchObject({ coming_soon: true, sort: "release_soon" });
  expect(toSearchParams(filters).toString()).toBe("coming_soon=1&sort=release_soon");
});

it("requests category rows and uses the category name and filter", async () => {
  const get = vi.spyOn(api, "get").mockResolvedValue({ data: [{ id: "best_sellers", total: 1, books: [{ id: 1, title: "Book" }] }] });
  renderWithProviders(<CatalogRows categoryId={4} categoryName="Fiction" />);
  expect(await screen.findByRole("heading", { name: "Best sellers in Fiction" })).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith("/catalog/rows", { params: { category_id: 4 } });
  expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/books?sort=best_selling&category_id=4");
});
