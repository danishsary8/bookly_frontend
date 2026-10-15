import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type BookImportPreviewResult, type StaffBook, type StaffUser } from "@/api/endpoints/staff";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import BookEditPage from "./BookEditPage";
import BooksPage from "./BooksPage";

const admin: StaffUser = {
  id: 1,
  name: "Demo Admin",
  email: "admin@bookly.test",
  role: "admin",
  two_factor_enabled: true,
};

const staff: StaffUser = {
  ...admin,
  id: 2,
  name: "Demo Staff",
  email: "staff@bookly.test",
  role: "staff",
};

const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[], meta: object = {}) =>
  ({
    data,
    links: {},
    meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length, ...meta },
  }) as never;

const liveBook: StaffBook = {
  id: 101,
  title: "Live Odyssey",
  description: "A great classic",
  status: "live",
  publish_at: null,
  language: "English",
  page_count: 400,
  publish_date: "2026-01-01",
  publisher_id: null,
  series_id: null,
  series_order: null,
  authors: [{ id: 1, name: "Homer" }],
  categories: [{ id: 1, name: "Classics", slug: "classics" }],
  variants: [
    {
      id: 201,
      book_id: 101,
      format: "paperback",
      sku: "ODY-PB",
      isbn: null,
      price_usd: "15.00",
      price_khr: null,
      stock_quantity: 12,
      low_stock_threshold: 5,
      is_low_stock: false,
      is_active: true,
      in_stock: true,
      cover_image_url: null,
    },
  ],
  is_visible: true,
  deleted_at: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

const scheduledBook: StaffBook = {
  ...liveBook,
  id: 102,
  title: "Future Chronicles",
  status: "scheduled",
  publish_at: "2026-12-01T10:00:00Z",
};

const draftBook: StaffBook = {
  ...liveBook,
  id: 103,
  title: "Draft Manuscript",
  status: "draft",
  publish_at: null,
};

describe("Book Publishing, Bulk Actions and CSV Import/Export", () => {
  afterEach(() => {
    clearSession("staff");
    dismissToast();
    vi.restoreAllMocks();
  });

  it("displays status badges and filter radio options on books page", async () => {
    signIn(admin);
    vi.spyOn(staffApi, "books").mockResolvedValue(page([liveBook, scheduledBook, draftBook]));

    renderWithProviders(
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/books" element={<BooksPage />} />
        </Route>
      </Routes>,
      { route: "/admin/books" },
    );

    // Filter options are present
    expect(await screen.findByRole("radio", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Scheduled" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Draft" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Deleted" })).toBeInTheDocument();

    // Books and status badges rendered
    expect(await screen.findByText("Live Odyssey")).toBeInTheDocument();
    expect(screen.getByText("Future Chronicles")).toBeInTheDocument();
    expect(screen.getByText("Draft Manuscript")).toBeInTheDocument();

    expect(screen.getAllByText("Live").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Scheduled/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Draft").length).toBeGreaterThanOrEqual(2);
  });

  it("allows selecting books and shows bulk actions bar with category, status and variant dialogs", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(staffApi, "books").mockResolvedValue(page([liveBook, draftBook]));
    const bulkBooksSpy = vi.spyOn(staffApi, "bulkUpdateBooks").mockResolvedValue({
      updated_count: 2,
      items: [
        { id: 101, title: "Live Odyssey", status: "live", success: true },
        { id: 103, title: "Draft Manuscript", status: "live", success: true },
      ],
    });

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/books" element={<BooksPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/books" },
    );

    expect(await screen.findByText("Live Odyssey")).toBeInTheDocument();

    // Check the first book
    const check1 = screen.getByLabelText("Select Live Odyssey");
    await user.click(check1);

    // Toolbar appears with selected count
    expect(screen.getByText("1 books selected")).toBeInTheDocument();

    // Check the second book
    const check2 = screen.getByLabelText("Select Draft Manuscript");
    await user.click(check2);
    expect(screen.getByText("2 books selected")).toBeInTheDocument();

    // Open bulk status dialog
    const statusBtn = screen.getByRole("button", { name: "Status" });
    await user.click(statusBtn);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Update Publishing Status/)).toBeInTheDocument();

    // Submit changes
    const applyBtn = within(dialog).getByRole("button", { name: "Apply changes" });
    await user.click(applyBtn);

    await waitFor(() => {
      expect(bulkBooksSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          ids: [101, 103],
          status: "live",
        }),
      );
    });
  });

  it("disables bulk status change for staff members with informative title", async () => {
    const user = userEvent.setup();
    signIn(staff);
    vi.spyOn(staffApi, "books").mockResolvedValue(page([liveBook]));

    renderWithProviders(
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/books" element={<BooksPage />} />
        </Route>
      </Routes>,
      { route: "/admin/books" },
    );

    expect(await screen.findByText("Live Odyssey")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Select Live Odyssey"));

    const statusBtn = screen.getByRole("button", { name: "Status" });
    expect(statusBtn).toBeDisabled();
    expect(statusBtn).toHaveAttribute("title", "Only administrators can change status");
  });

  it("admin can change book status to draft, live or scheduled with future datetime in BookEditPage", async () => {
    signIn(admin);
    vi.spyOn(staffApi, "book").mockResolvedValue(draftBook);

    renderWithProviders(
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/books/:id" element={<BookEditPage />} />
        </Route>
      </Routes>,
      { route: "/admin/books/103" },
    );

    expect(await screen.findByRole("heading", { name: "Details" })).toBeInTheDocument();

    // Admin sees the publishing status selector
    expect(screen.getByText("Publishing Status")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Book Status" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "live" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "scheduled" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "draft" })).toBeInTheDocument();
  });

  it("staff sees read-only status and disclaimer in BookEditPage", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "book").mockResolvedValue(draftBook);

    renderWithProviders(
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/books/:id" element={<BookEditPage />} />
        </Route>
      </Routes>,
      { route: "/admin/books/103" },
    );

    expect(await screen.findByRole("heading", { name: "Details" })).toBeInTheDocument();

    // Staff sees notice that status changes are restricted to admin
    expect(screen.getByText("Only administrators can publish or schedule books.")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Book Status" })).not.toBeInTheDocument();
  });

  it("CSV import dialog previews rows and confirms import", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(staffApi, "books").mockResolvedValue(page([]));

    const mockPreview: BookImportPreviewResult = {
      preview_token: "test-preview-token-123",
      total_rows: 3,
      new_books_count: 2,
      update_variants_count: 1,
      error_rows_count: 0,
      rows: [
        {
          row_number: 2,
          action: "new",
          title: "New Book 1",
          sku: "NB1-PB",
          format: "paperback",
          price_usd: "12.00",
          stock_quantity: 10,
          errors: [],
        },
        {
          row_number: 3,
          action: "update",
          title: "Existing Book",
          sku: "EXT-PB",
          format: "paperback",
          price_usd: "14.00",
          stock_quantity: 20,
          errors: [],
        },
      ],
    };

    const previewSpy = vi.spyOn(staffApi, "previewImportBooksCsv").mockResolvedValue(mockPreview);
    const confirmSpy = vi.spyOn(staffApi, "confirmImportBooksCsv").mockResolvedValue({
      books_created: 1,
      variants_updated: 1,
      message: "Catalog imported successfully.",
    });

    renderWithProviders(
      <>
        <Routes>
          <Route element={<RequireStaff />}>
            <Route path="/admin/books" element={<BooksPage />} />
          </Route>
        </Routes>
        <Toaster />
      </>,
      { route: "/admin/books" },
    );

    // Open import dialog
    const importBtn = await screen.findByRole("button", { name: "Import CSV" });
    await user.click(importBtn);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Import books from CSV")).toBeInTheDocument();
    expect(within(dialog).getByText("Download template")).toBeInTheDocument();

    // Upload a simulated CSV file
    const file = new File(["title,format,sku\nTest,paperback,TST-PB"], "books.csv", { type: "text/csv" });
    const input = within(dialog).getByLabelText(/Browse file/i, { selector: "input" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(previewSpy).toHaveBeenCalled();
    });

    // Preview table and confirm button appear
    expect(await within(dialog).findByText("New books")).toBeInTheDocument();
    expect(within(dialog).getByText("New Book 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Confirm & Import 3 valid items")).toBeInTheDocument();

    // Confirm import
    await user.click(within(dialog).getByRole("button", { name: "Confirm & Import 3 valid items" }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith("test-preview-token-123");
    });
  });
});
