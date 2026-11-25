import { act, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { catalogApi } from "@/api/endpoints/catalog";
import { renderWithProviders } from "@/test/render";
import { addRecentlyViewed, clearRecentlyViewed, useRecentlyViewed } from "./recentlyViewed";

afterEach(() => {
  clearRecentlyViewed();
  vi.restoreAllMocks();
});

function Titles() {
  const books = useRecentlyViewed();
  return <p data-testid="titles">{books.map((b) => b.title).join(",") || "none"}</p>;
}

it("shows nothing at once after Clear, even though the books query keeps its previous answer", async () => {
  vi.spyOn(catalogApi, "books").mockResolvedValue({ data: [{ id: 4, title: "Emma" }], meta: { current_page: 1, last_page: 1, per_page: 24, total: 1 }, links: {} } as never);
  addRecentlyViewed(4);
  renderWithProviders(<Titles />);
  expect(await screen.findByText("Emma")).toBeInTheDocument();

  act(() => clearRecentlyViewed());
  expect(screen.getByTestId("titles")).toHaveTextContent("none");
});
