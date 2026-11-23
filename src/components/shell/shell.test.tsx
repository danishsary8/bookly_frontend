import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { authApi } from "@/api/endpoints/auth";
import { cartApi } from "@/api/endpoints/cart";
import { catalogApi } from "@/api/endpoints/catalog";
import { clearSession, getSession, setSession } from "@/api/session";
import type { BookCard, Cart, Paginated } from "@/api/types";
import { RouteErrorBoundary } from "@/components/ErrorBoundary";
import Loading from "@/components/ui/loading";
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

  it("bolds the matched words in the author line too", async () => {
    const user = userEvent.setup();
    vi.spyOn(catalogApi, "books").mockResolvedValue(page([{ ...book(3, "Emma"), authors: [{ id: 2, name: "Jane Austen" }] }]));
    renderWithProviders(<LiveSearch id="s" />);

    await user.type(screen.getByRole("combobox", { name: "Search books" }), "aust");
    const option = await screen.findByRole("option", { name: /Emma/ });
    expect(option.querySelector("mark")).toHaveTextContent(/^Aust$/);
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
    // Two Sign in links: the desktop button and the phone header's profile icon. CSS shows only one per screen size
    // (the test DOM applies no CSS), and both go to the login page.
    const signIns = screen.getAllByRole("link", { name: "Sign in" });
    expect(signIns).toHaveLength(2);
    for (const link of signIns) expect(link).toHaveAttribute("href", "/login");
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

  it("asks for confirmation before signing out from the account menu", async () => {
    const user = userEvent.setup();
    vi.spyOn(cartApi, "cart").mockResolvedValue(cart);
    const logout = vi.spyOn(authApi, "logout").mockImplementation(async () => {
      clearSession("customer");
    });
    setSession("customer", { token: "t", expiresAt: null, user: { id: 1, name: "Danish", email: "danish@bookly.test" } });

    renderWithProviders(<SiteHeader />);
    // Wait for the lazy-loaded AccountMenuSignedIn trigger to replace the disabled placeholder
    await waitFor(() => expect(screen.getByRole("button", { name: /Account menu for Danish/ })).toBeEnabled());
    const trigger = screen.getByRole("button", { name: /Account menu for Danish/ });

    // Open dropdown → click Sign out → dialog opens without signing out yet
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Sign out of Bookly?");
    expect(dialog).toHaveTextContent("danish@bookly.test");
    expect(logout).not.toHaveBeenCalled();

    // Cancel keeps the session active
    await user.click(within(dialog).getByRole("button", { name: "Stay signed in" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(logout).not.toHaveBeenCalled();
    expect(getSession("customer")).not.toBeNull();

    // Confirm actually signs out
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    const confirmDialog = await screen.findByRole("alertdialog");
    await user.click(within(confirmDialog).getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
    expect(getSession("customer")).toBeNull();
  });

  it("reveals the header on bookly:header-peek after scrolling down hides it", async () => {
    const origScrollHeight = Object.getOwnPropertyDescriptor(document.documentElement, "scrollHeight");
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, value: 2400 });
    Object.defineProperty(window, "scrollY", { configurable: true, writable: true, value: 0 });
    try {
      renderWithProviders(<SiteHeader />);
      const header = screen.getByRole("banner");
      // Let the initial rAF in useHeaderScroll complete before dispatching scroll
      await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(undefined))); });

      // Simulate scrolling down past the header threshold to hide it
      window.scrollY = 300;
      act(() => { window.dispatchEvent(new Event("scroll")); });
      await waitFor(() => expect(header).toHaveAttribute("data-scroll-hidden", "true"));

      // Triggering fly-to-cart peek reveals the navbar cart icon again
      act(() => { window.dispatchEvent(new Event("bookly:header-peek")); });
      await waitFor(() => expect(header).not.toHaveAttribute("data-scroll-hidden"));
    } finally {
      if (origScrollHeight) Object.defineProperty(document.documentElement, "scrollHeight", origScrollHeight);
      window.scrollY = 0;
    }
  });
});

describe("Loading", () => {
  it("exposes an accessible live status region with the loading label", () => {
    renderWithProviders(<Loading message="Preparing your shelf…" />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Preparing your shelf…");
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
