import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { catalogApi } from "@/api/endpoints/catalog";
import { clearSession } from "@/api/session";
import type { BookCard as Book, Paginated } from "@/api/types";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { renderWithProviders } from "@/test/render";
import { BookCard } from "./BookCard";
import { CatalogBrowser } from "./CatalogBrowser";
import { CatalogueHeader } from "./CatalogueHeader";
import { RelatedShelf } from "./RelatedShelf";

/* The shared catalogue v2 pieces (pages/catalogue-v2.md): header, related shelf, availability line, the browser's
   URL state (sort chip, quick grade chips, page), the no-results recovery and Back scroll memory. */

const book = (id: number, title: string, extra: Partial<Book> = {}): Book => ({
  id,
  title,
  authors: [{ id: 1, name: "Sokha Chan" }],
  price_from_usd: "10.00",
  price_from_khr: "41000",
  formats: ["paperback"],
  in_stock: true,
  rating_avg: null,
  review_count: 0,
  ...extra,
});
const page = (books: Book[], total = books.length, current = 1): Paginated<Book> =>
  ({ data: books, meta: { current_page: current, last_page: Math.max(1, Math.ceil(total / 24)), per_page: 24, total, from: books.length ? 1 : null, to: books.length || null }, links: {} }) as Paginated<Book>;

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};
const browse = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/books" element={<CatalogBrowser />} />
        <Route path="/categories/:slug" element={<CatalogBrowser locked={{ category_id: 5 }} />} />
      </Routes>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>,
    { route },
  );

beforeEach(() => {
  clearSession("customer");
  vi.spyOn(catalogApi, "categories").mockResolvedValue([{ id: 5, name: "Education", slug: "education", parent_id: null, books_count: 3 }]);
  vi.spyOn(catalogApi, "categoryTree").mockResolvedValue([{ id: 5, name: "Education", slug: "education", parent_id: null, sort_order: 1, icon: null, books_count: 3, total_books: 3, children: [] }]);
  vi.spyOn(catalogApi, "publishers").mockResolvedValue(page([]) as never);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue(page([]));
});
afterEach(() => vi.restoreAllMocks());

describe("CatalogueHeader", () => {
  it("clamps a long blurb and opens it with Read more", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CatalogueHeader variant="entity" crumbs={[{ label: "Home", to: "/" }, { label: "Sokha Chan" }]} title="Sokha Chan" blurb={"A long biography. ".repeat(20)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Sokha Chan" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: "Read more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });

  it("shows a short blurb without a toggle", () => {
    renderWithProviders(<CatalogueHeader crumbs={[{ label: "Home" }]} title="Series" blurb="Short." />);
    expect(screen.queryByRole("button", { name: "Read more" })).not.toBeInTheDocument();
  });
});

describe("BookCard availability line", () => {
  it("names pre-orders with their date and ebook-only books, only when asked", () => {
    const future = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    renderWithProviders(
      <ul>
        <li><BookCard book={book(1, "Coming", { publish_date: future })} showAvailability /></li>
        <li><BookCard book={book(2, "Digital", { formats: ["ebook"] })} showAvailability /></li>
        <li><BookCard book={book(3, "Elsewhere", { formats: ["ebook"] })} /></li>
      </ul>,
    );
    expect(screen.getByText(/^Pre-order · out /)).toBeInTheDocument();
    expect(screen.getAllByText("Ebook only")).toHaveLength(1);
  });
});

describe("RelatedShelf", () => {
  it("asks for books like the seeds and leaves out the ones already on the page", async () => {
    const recommend = vi.spyOn(catalogApi, "recommendations").mockResolvedValue([book(1, "On the page"), book(7, "Something new")]);
    renderWithProviders(<RelatedShelf id="t" title="Readers also like" source={{ kind: "similar", seeds: [1, 2], exclude: [1, 2] }} />);
    const shelf = await screen.findByRole("region", { name: "Readers also like" });
    expect(await within(shelf).findByRole("link", { name: "Something new" })).toBeInTheDocument();
    expect(within(shelf).queryByRole("link", { name: "On the page" })).not.toBeInTheDocument();
    expect(recommend).toHaveBeenCalledWith(expect.objectContaining({ cart_ids: "1,2", exclude_ids: "1,2" }));
  });

  it("hides itself when there is nothing to show", async () => {
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    renderWithProviders(<RelatedShelf id="t" title="More by Sokha Chan" source={{ kind: "filter", filters: { author_id: 1 } }} />);
    await waitFor(() => expect(screen.queryByRole("region", { name: "More by Sokha Chan" })).not.toBeInTheDocument());
  });
});

describe("CatalogBrowser URL state", () => {
  it("shows a chosen sort as a removable chip and drops it back to the default", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([book(1, "Emma")]));
    browse("/books?sort=best_selling&page=2");
    await user.click(await screen.findByRole("button", { name: "Remove filter: Sorted: Best selling" }));
    // Removing the sort also goes back to page 1.
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/books$/);
  });

  it("offers grade chips inside a category and writes the grade to the URL", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue({ ...page([book(1, "Grade 9 Physics")]), facets: { school_grades: { "9": 1, "10": 2 } } });
    browse("/categories/education");
    const grades = await screen.findByRole("group", { name: "School grade" });
    expect(within(grades).getByRole("button", { name: "All grades" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(grades).getByRole("button", { name: "Grade 10" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/categories/education?school_grade=10");
  });

  it("links to a page through the URL and keeps the filters", async () => {
    vi.spyOn(catalogApi, "books").mockResolvedValue({ ...page([book(1, "Emma")], 60), meta: { current_page: 1, last_page: 3, per_page: 24, total: 60, from: 1, to: 24 } } as Paginated<Book>);
    browse("/books?format=ebook");
    const pagination = await screen.findByRole("navigation", { name: "Pagination" });
    expect(within(pagination).getByRole("link", { name: /2/ })).toHaveAttribute("href", "/books?format=ebook&page=2");
  });

  it("recovers from no results: a removable filter and the shop's popular books", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "recommendations").mockResolvedValue([book(9, "Atomic Habits")]);
    browse("/books?format=ebook&in_stock=1");
    expect(await screen.findByRole("heading", { name: "No books match these filters" })).toBeInTheDocument();
    const shelf = await screen.findByRole("region", { name: "Popular right now" });
    expect(await within(shelf).findByRole("link", { name: "Atomic Habits" })).toBeInTheDocument();
    const empty = screen.getByRole("heading", { name: "No books match these filters" }).parentElement!;
    await user.click(within(empty).getByRole("button", { name: "Remove filter: In stock" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/books?format=ebook");
  });

  it("announces the result count in a live region", async () => {
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([book(1, "Emma"), book(2, "Persuasion")]));
    browse("/books");
    await screen.findByRole("link", { name: "Emma" });
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–2 of 2 books");
  });
});

describe("useScrollMemory", () => {
  const Listing = ({ ready }: { ready: boolean }) => {
    useScrollMemory(ready);
    return null;
  };

  it("scrolls back to the saved position on Back once the results are ready", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    // MemoryRouter's first entry is a POP with the key "default".
    sessionStorage.setItem("bookly:scroll:default", "820");
    const { rerender } = renderWithProviders(<Listing ready={false} />, { route: "/books" });
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Listing ready />);
    await act(() => new Promise((r) => requestAnimationFrame(r)));
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 820 }));
    sessionStorage.clear();
  });
});
