import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import { cartApi } from "@/api/endpoints/cart";
import { catalogApi } from "@/api/endpoints/catalog";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import type { BookCard, BookDetail, Paginated } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import LegacyBrowseRedirect from "@/routes/LegacyBrowseRedirect";
import { renderWithProviders } from "@/test/render";
import { setCurrency } from "@/stores/currency";
import { clearRecentlyViewed, getRecentlyViewed } from "@/stores/recentlyViewed";
import { dismissToast } from "@/stores/toast";
import BookDetailPage from "./BookDetailPage";
import BooksPage from "./BooksPage";

const card = (id: number, title: string, extra: Partial<BookCard> = {}): BookCard => ({
  id,
  title,
  authors: [{ id: 1, name: "Jane Austen" }],
  price_from_usd: "8.99",
  price_from_khr: "36859",
  formats: ["paperback"],
  in_stock: true,
  rating_avg: null,
  review_count: 0,
  ...extra,
});

const page = (books: BookCard[], total = books.length): Paginated<BookCard> =>
  ({ data: books, meta: { current_page: 1, last_page: Math.max(1, Math.ceil(total / 24)), per_page: 24, total, from: books.length ? 1 : null, to: books.length || null }, links: {} }) as Paginated<BookCard>;

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

beforeEach(() => {
  setCurrency("USD");
  clearSession("customer");
  clearRecentlyViewed();
  vi.spyOn(catalogApi, "categories").mockResolvedValue([
    { id: 1, name: "Fiction", slug: "fiction", books_count: 6 },
    { id: 2, name: "Classics", slug: "classics", books_count: 14 },
  ]);
  vi.spyOn(catalogApi, "publishers").mockResolvedValue(page([]) as never);
  vi.spyOn(accountApi, "wishlist").mockResolvedValue(page([]));
});

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
});

describe("BooksPage", () => {
  it("reads filters from the URL, sends them to the API and shows the result count", async () => {
    const books = vi.spyOn(catalogApi, "books").mockResolvedValue(page([card(1, "Emma"), card(2, "Persuasion")], 2));
    renderWithProviders(
      <Routes>
        <Route path="/books" element={<BooksPage />} />
      </Routes>,
      { route: "/books?category_id=2&in_stock=1&sort=title" },
    );
    expect(await screen.findByRole("link", { name: "Emma" })).toBeInTheDocument();
    expect(books).toHaveBeenCalledWith(expect.objectContaining({ category_id: 2, in_stock: true, sort: "title", per_page: 24 }));
    expect(screen.getByText("Showing 1–2 of 2 books")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Remove filter: Classics" })).toBeInTheDocument();
  });

  it("writes a filter change to the URL and resets the page", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([card(1, "Emma")]));
    renderWithProviders(
      <>
        <Routes>
          <Route path="/books" element={<BooksPage />} />
        </Routes>
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
      { route: "/books?page=2" },
    );
    const sidebar = await screen.findByRole("complementary", { name: "Filters" });
    await user.click(await within(sidebar).findByRole("radio", { name: /Fiction/ }));
    expect(screen.getByTestId("where")).toHaveTextContent("/books?category_id=1");
  });

  it("offers to clear filters when nothing matches", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    renderWithProviders(
      <>
        <Routes>
          <Route path="/books" element={<BooksPage />} />
        </Routes>
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
      { route: "/books?format=audiobook" },
    );
    expect(await screen.findByRole("heading", { name: "No books match these filters" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/books$/);
  });

  it("asks a signed-out visitor to sign in before adding to cart", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([card(1, "Emma")]));
    const add = vi.spyOn(cartApi, "addItem");
    renderWithProviders(
      <>
        <Routes>
          <Route path="/books" element={<BooksPage />} />
        </Routes>
        <Toaster />
      </>,
      { route: "/books" },
    );
    await user.click(await screen.findByRole("button", { name: "Add Emma to cart" }));
    const notifications = screen.getByRole("region", { name: "Notifications" });
    expect(await within(notifications).findByRole("status")).toHaveTextContent("Sign in to add books to your cart");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?next=%2Fbooks");
    expect(add).not.toHaveBeenCalled();
  });
});

describe("BookDetailPage", () => {
  const detail: BookDetail = {
    ...card(7, "Pride and Prejudice", { formats: ["paperback", "hardcover"] }),
    description: "A classic.",
    categories: [{ id: 2, name: "Classics", slug: "classics" }],
    publisher: { id: 3, name: "Riverside Classics" },
    series: null,
    variants: [
      { id: 71, format: "hardcover", price_usd: "20.99", price_khr: "86059", in_stock: true, isbn: "111" },
      { id: 72, format: "paperback", price_usd: "12.99", price_khr: "53259", in_stock: true, isbn: "222" },
    ],
  };

  const renderDetail = (route = "/books/7") =>
    renderWithProviders(
      <>
        <Routes>
          <Route path="/books/:id" element={<BookDetailPage />} />
        </Routes>
        <Toaster />
      </>,
      { route },
    );

  beforeEach(() => {
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "bookReviews").mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 5, total: 0, rating_summary: { average: null, count: 0, distribution: {} } } } as never);
  });

  it("preselects the cheapest format, switches price, and remembers the book", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "book").mockResolvedValue(detail);
    renderDetail();
    expect(await screen.findByRole("heading", { level: 1, name: "Pride and Prejudice" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Paperback/ })).toBeChecked();
    expect(screen.getByText("$12.99", { selector: "p" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /Hardcover/ }));
    expect(screen.getByText("$20.99", { selector: "p" })).toBeInTheDocument();
    await waitFor(() => expect(getRecentlyViewed()[0]?.id).toBe(7));
  });

  it("adds the chosen format and quantity to the cart when signed in", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "book").mockResolvedValue(detail);
    const add = vi.spyOn(cartApi, "addItem").mockResolvedValue({ id: 1, item_count: 2, items: [{ id: 9, book_variant_id: 72, format: "paperback", quantity: 2 }] });
    setSession("customer", { token: "t", expiresAt: null, user: { id: 1, name: "Dara" } });
    renderDetail();
    await screen.findByRole("heading", { level: 1, name: "Pride and Prejudice" });
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(add).toHaveBeenCalledWith(72, 2);
    expect(await within(screen.getByRole("region", { name: "Notifications" })).findByRole("status")).toHaveTextContent("Added to cart");
  });

  it("shows a not-found page for a missing book", async () => {
    vi.spyOn(catalogApi, "book").mockRejectedValue(new ApiError({ kind: "not_found", status: 404, message: "We couldn't find that." }));
    renderDetail("/books/999");
    expect(await screen.findByRole("heading", { level: 1, name: "We couldn't find that book" })).toBeInTheDocument();
  });
});

describe("LegacyBrowseRedirect", () => {
  it.each([
    ["/browse?search=dune", "/search?q=dune"],
    ["/browse", "/books"],
  ])("sends %s to %s", (from, to) => {
    renderWithProviders(
      <Routes>
        <Route path="/browse" element={<LegacyBrowseRedirect />} />
        <Route path="*" element={<Where />} />
      </Routes>,
      { route: from },
    );
    expect(screen.getByTestId("where")).toHaveTextContent(to);
  });
});
