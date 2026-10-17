import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { accountApi } from "@/api/endpoints/account";
import type { Customer, WishlistBookCard, WishlistPageData } from "@/api/types";
import { Toaster } from "@/components/ui/toaster";
import { renderWithProviders } from "@/test/render";
import { clearSession, setSession } from "@/api/session";
import { dismissToast } from "@/stores/toast";
import { setLanguage } from "@/i18n";
import WishlistPage from "./WishlistPage";

const customer: Customer = {
  id: 1,
  name: "Sok Dara",
  email: "dara@example.com",
  phone: "012345678",
  email_verified: true,
  has_password: true,
};

const book1: WishlistBookCard = {
  id: 101,
  title: "The Great Gatsby",
  language: "en",
  authors: [{ id: 1, name: "F. Scott Fitzgerald" }],
  price_from_usd: "8.50",
  price_from_khr: "35000",
  cover_image_url: null,
  formats: ["paperback"],
  in_stock: true,
  wishlist_status: "want_to_read",
};

const book2: WishlistBookCard = {
  id: 102,
  title: "1984",
  language: "en",
  authors: [{ id: 2, name: "George Orwell" }],
  price_from_usd: "9.00",
  price_from_khr: "37000",
  cover_image_url: null,
  formats: ["hardcover"],
  in_stock: true,
  wishlist_status: "reading",
};

const book3: WishlistBookCard = {
  id: 103,
  title: "To Kill a Mockingbird",
  language: "en",
  authors: [{ id: 3, name: "Harper Lee" }],
  price_from_usd: "7.00",
  price_from_khr: "29000",
  cover_image_url: null,
  formats: ["paperback"],
  in_stock: true,
  wishlist_status: "finished",
};

const mockPage = (books: WishlistBookCard[]): WishlistPageData => ({
  data: books,
  meta: {
    current_page: 1,
    last_page: 1,
    per_page: 24,
    total: books.length,
    from: books.length > 0 ? 1 : 0,
    to: books.length,
    counts: {
      all: 3,
      want_to_read: 1,
      reading: 1,
      finished: 1,
    },
  },
  links: {
    first: null,
    last: null,
    prev: null,
    next: null,
  },
});

const renderPage = (route = "/account/wishlist") =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/account/wishlist" element={<WishlistPage />} />
      </Routes>
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("customer", { token: "token", expiresAt: null, user: customer });
  setLanguage("en");
});

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("customer");
});

describe("WishlistPage with Reading Statuses", () => {
  it("renders status filter tabs with badges and list of saved books", async () => {
    vi.spyOn(accountApi, "wishlist").mockResolvedValue(mockPage([book1, book2, book3]));

    renderPage();

    expect(await screen.findByRole("heading", { name: "Wishlist" })).toBeInTheDocument();

    // Check tabs
    expect(screen.getByRole("tab", { name: /All/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Want to read/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Currently reading/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Finished/i })).toBeInTheDocument();

    // Check books rendered
    expect(await screen.findByRole("heading", { name: "The Great Gatsby" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1984" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "To Kill a Mockingbird" })).toBeInTheDocument();
  });

  it("filters books when clicking a reading status tab", async () => {
    const user = userEvent.setup();
    const wishlistSpy = vi.spyOn(accountApi, "wishlist").mockImplementation(async (params) => {
      if (params?.status === "reading") return mockPage([book2]);
      if (params?.status === "finished") return mockPage([book3]);
      return mockPage([book1, book2, book3]);
    });

    renderPage();

    await screen.findByRole("heading", { name: "The Great Gatsby" });

    // Click Currently reading tab
    const readingTab = screen.getByRole("tab", { name: /Currently reading/i });
    await user.click(readingTab);

    await waitFor(() => {
      expect(wishlistSpy).toHaveBeenCalledWith(
        expect.objectContaining({ status: "reading" }),
      );
    });

    expect(screen.getByRole("heading", { name: "1984" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The Great Gatsby" })).not.toBeInTheDocument();
  });

  it("changes book reading status via dropdown menu", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "wishlist").mockResolvedValue(mockPage([book1]));
    const updateSpy = vi.spyOn(accountApi, "updateWishlistStatus").mockResolvedValue({
      message: "Wishlist status updated.",
      book_id: 101,
      status: "reading",
    });

    renderPage();

    await screen.findByRole("heading", { name: "The Great Gatsby" });

    // Find the reading status trigger button
    const statusBtn = screen.getByRole("combobox", { name: "Change reading status" });
    expect(statusBtn).toHaveTextContent("Want to read");

    await user.click(statusBtn);

    // Click "Currently reading" item in select dropdown
    const readingOption = await screen.findByRole("option", { name: /Currently reading/i });
    await user.click(readingOption);

    expect(updateSpy).toHaveBeenCalledWith(101, "reading");
    expect(await screen.findByText("Reading status updated")).toBeInTheDocument();
  });

  it("removes a book from wishlist with undo toast option", async () => {
    const user = userEvent.setup();
    vi.spyOn(accountApi, "wishlist").mockResolvedValue(mockPage([book1]));
    const removeSpy = vi.spyOn(accountApi, "removeFromWishlist").mockResolvedValue();

    renderPage();

    await screen.findByRole("heading", { name: "The Great Gatsby" });

    // Click remove heart button
    const removeBtn = screen.getByRole("button", { name: "Save The Great Gatsby to your wishlist" });
    await user.click(removeBtn);

    expect(removeSpy).toHaveBeenCalledWith(101);
    expect(await screen.findByText("Removed from your wishlist")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("renders localized Khmer content on Khmer language switch", async () => {
    setLanguage("km");
    vi.spyOn(accountApi, "wishlist").mockResolvedValue(mockPage([book1]));

    renderPage();

    expect(await screen.findByRole("heading", { name: "បញ្ជីប្រាថ្នា" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /ទាំងអស់/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /ចង់អាន/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /កំពុងអាន/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /បានអានរួចរាល់/i })).toBeInTheDocument();
  });
});
