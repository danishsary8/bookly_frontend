import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type StaffBook, type StaffUser, type StaffVariant } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import BookEditPage from "./BookEditPage";

/* Cover on the New book page and a Cover panel on the book page (owner 2026-11-02). */

vi.mock("@/lib/imageValidation", async (original) => ({
  ...(await original<typeof import("@/lib/imageValidation")>()),
  validateImageFile: async () => ({ ok: true }),
}));

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const COVER = "https://pub-test.r2.dev/covers/emma.webp";
const variant = (over: Partial<StaffVariant>): StaffVariant => ({
  id: 201, book_id: 7, format: "paperback", sku: "EMMA-PB", isbn: null, price_usd: "12.99", price_khr: null, stock_quantity: 5,
  low_stock_threshold: 5, is_low_stock: false, is_active: true, in_stock: true, cover_image_url: null, ...over,
});
const book = (variants: StaffVariant[]): StaffBook => ({
  id: 7, title: "Emma", description: null, status: "draft", publish_at: null, language: "English", page_count: null, publish_date: null,
  publisher_id: null, series_id: null, series_order: null, authors: [], categories: [], variants, is_visible: false, deleted_at: null,
  created_at: "2026-11-02T00:00:00Z", updated_at: "2026-11-02T00:00:00Z",
});

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/books/new" element={<BookEditPage />} />
          <Route path="/admin/books/:id" element={<BookEditPage key="edit" />} />
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route },
  );

beforeEach(() => {
  setSession("staff", { token: "t", expiresAt: null, user: admin });
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("book cover", () => {
  it("New book: upload a cover, create, and the first format opens with that cover", async () => {
    const user = userEvent.setup();
    const upload = vi.spyOn(staffApi, "uploadMedia").mockResolvedValue({ url: COVER } as never);
    vi.spyOn(staffApi, "createBook").mockResolvedValue(book([]));
    vi.spyOn(staffApi, "book").mockResolvedValue(book([]));
    app("/admin/books/new");

    await user.type(await screen.findByLabelText("Title"), "Emma");
    await user.upload(screen.getByLabelText(/^Cover/), new File(["x"], "emma.png", { type: "image/png" }));
    expect(upload).toHaveBeenCalled();
    expect(await screen.findByRole("img", { name: "Cover preview" })).toHaveAttribute("src", COVER);
    await user.click(screen.getByRole("button", { name: /Create/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("img", { name: /preview/ })).toHaveAttribute("src", COVER);
    expect(sessionStorage.getItem("bookly.pendingCover.7")).toBe(COVER); // kept if the dialog is closed
  });

  it("book page: changing the cover updates formats with the main cover or none, not a different one", async () => {
    const user = userEvent.setup();
    const old = "https://pub-test.r2.dev/covers/old.webp";
    vi.spyOn(staffApi, "book").mockResolvedValue(book([
      variant({ id: 1, cover_image_url: old }),
      variant({ id: 2, format: "hardcover", cover_image_url: null }),
      variant({ id: 3, format: "ebook", cover_image_url: "https://pub-test.r2.dev/covers/ebook-only.webp" }),
    ]));
    vi.spyOn(staffApi, "uploadMedia").mockResolvedValue({ url: COVER } as never);
    const update = vi.spyOn(staffApi, "updateVariant").mockResolvedValue(variant({}));
    app("/admin/books/7");

    const panel = await screen.findByRole("region", { name: "Cover" });
    await user.click(within(panel).getByRole("button", { name: "Remove change cover" }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    update.mockClear();
    await user.upload(within(panel).getByLabelText(/Upload a cover/), new File(["x"], "new.png", { type: "image/png" }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    const ids = update.mock.calls.map((c) => c[0]).sort();
    expect(ids).toEqual([1, 2]); // the ebook keeps its own cover
    expect(update).toHaveBeenCalledWith(1, { cover_image_url: COVER });
  });

  it("book page without formats: the cover waits for the first format", async () => {
    const user = userEvent.setup();
    vi.spyOn(staffApi, "book").mockResolvedValue(book([]));
    vi.spyOn(staffApi, "uploadMedia").mockResolvedValue({ url: COVER } as never);
    const update = vi.spyOn(staffApi, "updateVariant");
    app("/admin/books/7");
    const panel = await screen.findByRole("region", { name: "Cover" });
    await user.upload(within(panel).getByLabelText(/Upload a cover/), new File(["x"], "new.png", { type: "image/png" }));
    expect(await screen.findByText("Cover kept for the first format you add")).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("bookly.pendingCover.7")).toBe(COVER);
  });
});
