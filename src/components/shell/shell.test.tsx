import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { cartApi } from "@/api/endpoints/cart";
import { catalogApi } from "@/api/endpoints/catalog";
import { clearSession, setSession } from "@/api/session";
import type { BookCard, Cart, Paginated } from "@/api/types";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from "@/components/ui/toaster";
import { renderWithProviders } from "@/test/render";
import { setCurrency } from "@/stores/currency";
import { closeShellPanel, openShellPanel } from "@/stores/shell";
import { dismissToast, toast } from "@/stores/toast";
import { CartDrawer } from "./CartDrawer";
import { CurrencySwitch } from "./CurrencySwitch";
import { LiveSearch } from "./LiveSearch";
import { SiteHeader } from "./SiteHeader";

const book = (id: number, title: string): BookCard => ({
  id,
  title,
  authors: [{ id: 1, name: "Mark Twain" }],
  price_from_usd: "4.99",
  price_from_khr: "20459",
  cover_image_url: null,
});

const page = (books: BookCard[]): Paginated<BookCard> =>
  ({ data: books, meta: { current_page: 1, last_page: 1, per_page: 6, total: books.length, from: 1, to: books.length }, links: {} }) as Paginated<BookCard>;

const Where = () => {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
};

beforeEach(() => {
  setCurrency("USD");
  clearSession("customer");
  closeShellPanel();
});

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
});

describe("LiveSearch", () => {
  it("suggests books after typing and opens the highlighted one with Enter", async () => {
    const user = userEvent.setup();
    const books = vi.spyOn(catalogApi, "books").mockResolvedValue(page([book(7, "The Adventures of Tom Sawyer"), book(9, "Alice's Adventures")]));
    renderWithProviders(
      <>
        <LiveSearch id="s" />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
    );

    const input = screen.getByRole("combobox", { name: "Search books" });
    await user.type(input, "adv");
    expect(await screen.findByRole("option", { name: /Tom Sawyer/ })).toBeInTheDocument();
    expect(books).toHaveBeenCalledWith(expect.objectContaining({ q: "adv", sort: "relevance", per_page: 6 }));
    expect(input).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", "s-option-0");
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/books/7");
  });

  it("goes to the results page on Enter without a highlighted option", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    renderWithProviders(
      <>
        <LiveSearch id="s" />
        <Routes>
          <Route path="*" element={<Where />} />
        </Routes>
      </>,
    );
    await user.type(screen.getByRole("combobox", { name: "Search books" }), "moby dick{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/search?q=moby%20dick");
  });

  it("waits for two characters before searching", async () => {
    const user = userEvent.setup();
    const books = vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    renderWithProviders(<LiveSearch id="s" />);
    await user.type(screen.getByRole("combobox", { name: "Search books" }), "a");
    await new Promise((r) => setTimeout(r, 350));
    expect(books).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
  });

  it("says when nothing matches", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([]));
    renderWithProviders(<LiveSearch id="s" />);
    await user.type(screen.getByRole("combobox", { name: "Search books" }), "zzz");
    expect(await screen.findByText(/No books match "zzz"/)).toBeInTheDocument();
  });
});

describe("CurrencySwitch", () => {
  it("is a radio group that switches the shared currency", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencySwitch />);
    expect(screen.getByRole("radiogroup", { name: "Currency" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /USD/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /KHR/ }));
    expect(screen.getByRole("radio", { name: /KHR/ })).toBeChecked();
    expect(localStorage.getItem("bookly.currency")).toBe("KHR");
  });
});

describe("Toaster", () => {
  it("shows success as a status and errors as an alert, and closes on dismiss", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Toaster />);
    act(() => {
      toast.success("Added to cart");
      toast.error({ title: "Couldn't save", description: "Try again." });
    });
    expect(screen.getByRole("status")).toHaveTextContent("Added to cart");
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't save");
    await user.click(screen.getAllByRole("button", { name: "Dismiss notification" })[0]);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("Header and cart drawer", () => {
  const cart: Cart = {
    id: 1,
    item_count: 3,
    subtotal_usd: "14.97",
    subtotal_khr: "61377",
    can_checkout: true,
    items: [{ id: 5, book_variant_id: 2, book: { id: 7, title: "Tom Sawyer" }, format: "paperback", quantity: 3, line_total_usd: "14.97", line_total_khr: "61377", issues: [] }],
  };

  it("shows Sign in and an empty cart prompt when signed out", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <SiteHeader />
        <CartDrawer />
      </>,
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    await user.click(screen.getByRole("button", { name: "Cart" }));
    expect(await screen.findByRole("heading", { name: "Sign in to see your cart" })).toBeInTheDocument();
  });

  it("shows the item count and cart lines for a signed-in customer", async () => {
    vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
    setSession("customer", { token: "t", expiresAt: null, user: { id: 1, name: "Sok Dara" } });
    renderWithProviders(
      <>
        <SiteHeader />
        <CartDrawer />
      </>,
    );
    const cartButton = await screen.findByRole("button", { name: "Cart, 3 items" });
    expect(screen.getByRole("button", { name: /Account menu for Sok Dara/ })).toBeInTheDocument();

    act(() => openShellPanel("cart"));
    expect(cartButton).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("link", { name: "Tom Sawyer" })).toHaveAttribute("href", "/books/7");
    expect(screen.getByText("$14.97", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("href", "/checkout");
  });
});

describe("RouteErrorBoundary", () => {
  it("shows the page error instead of a blank screen and recovers on retry", async () => {
    const user = userEvent.setup();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    let crash = true;
    const Page = () => {
      if (crash) throw new Error("boom");
      return <h1>Recovered</h1>;
    };
    renderWithProviders(
      <RouteErrorBoundary>
        <Page />
      </RouteErrorBoundary>,
    );
    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    crash = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("heading", { name: "Recovered" })).toBeInTheDocument();
  });
});
