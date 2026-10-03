import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { staffApi, staffAuthApi, type DailySales, type DashboardSummary, type StaffBook, type StaffUser } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { adminNext } from "@/features/admin/adminNext";
import { SalesChart } from "@/features/admin/SalesChart";
import { RequireStaff, RequireStaffSetup, StaffGuestOnly } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import StaffLoginPage from "./auth/StaffLoginPage";
import StaffTwoFactorSetupPage from "./auth/StaffTwoFactorSetupPage";
import BookEditPage from "./BookEditPage";
import DashboardPage from "./DashboardPage";
import LookupPage from "./LookupPage";

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", email: "staff@bookly.test", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length } }) as never;

const book: StaffBook = {
  id: 6,
  title: "The Hound of the Baskervilles",
  description: null,
  language: "English",
  page_count: 256,
  publish_date: null,
  publisher_id: null,
  series_id: null,
  series_order: null,
  authors: [{ id: 3, name: "Arthur Conan Doyle" }],
  categories: [],
  variants: [
    { id: 61, book_id: 6, format: "paperback", sku: "BK006-PB", isbn: null, price_usd: "10.99", price_khr: null, stock_quantity: 3, low_stock_threshold: 5, is_low_stock: true, is_active: true, in_stock: true, cover_image_url: null },
  ],
  is_visible: true,
  deleted_at: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<StaffGuestOnly />}>
          <Route path="/admin/login" element={<StaffLoginPage />} />
        </Route>
        <Route element={<RequireStaffSetup />}>
          <Route path="/admin/two-factor" element={<StaffTwoFactorSetupPage />} />
        </Route>
        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/books/new" element={<BookEditPage />} />
          <Route path="/admin/books/:id" element={<BookEditPage key="edit" />} />
          <Route path="/admin/authors" element={<LookupPage kind="authors" />} />
        </Route>
      </Routes>
      <Where />
      <Toaster />
    </>,
    { route },
  );

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("adminNext", () => {
  it("only returns to admin pages, never to sign-in or another site", () => {
    expect(adminNext("/admin/books?q=x")).toBe("/admin/books?q=x");
    expect(adminNext("/account")).toBe("/admin");
    expect(adminNext("/admin/login")).toBe("/admin");
    expect(adminNext("//evil.example/admin")).toBe("/admin");
    expect(adminNext(null)).toBe("/admin");
  });
});

describe("staff guards", () => {
  it("sends a signed-out visitor to staff sign-in, keeping the page", () => {
    app("/admin?period=7d");
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/login?next=%2Fadmin%3Fperiod%3D7d");
  });

  it("sends staff without two-step verification to set it up", () => {
    signIn({ ...admin, two_factor_enabled: false });
    vi.spyOn(staffAuthApi, "setupTwoFactor").mockReturnValue(new Promise(() => {}));
    app("/admin/books/6");
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/two-factor?next=%2Fadmin%2Fbooks%2F6");
  });
});

describe("StaffLoginPage", () => {
  it("asks for the authenticator code, then signs in and goes to the wanted page", async () => {
    const user = userEvent.setup();
    vi.spyOn(staffAuthApi, "login").mockResolvedValue({ two_factor_required: true, challenge_token: "c1", expires_in: 300 });
    const challenge = vi
      .spyOn(staffAuthApi, "challenge")
      .mockRejectedValueOnce(new ApiError({ kind: "validation", status: 422, message: "Invalid authentication code." }))
      .mockResolvedValueOnce({ staff: admin, token: "tok", token_type: "Bearer", expires_at: null });
    vi.spyOn(staffApi, "summary").mockReturnValue(new Promise(() => {}));
    vi.spyOn(staffApi, "sales").mockReturnValue(new Promise(() => {}));
    app("/admin/login?next=%2Fadmin%3Fperiod%3D7d");
    await user.type(screen.getByLabelText("Work email"), "admin@bookly.test");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Staffpass123");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Enter your code" })).toBeInTheDocument();

    await user.keyboard("111111");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));
    expect(await screen.findByText(/That code didn't work/)).toBeInTheDocument();
    // Focus goes back to the first code box, so the next code can be typed straight away.
    await waitFor(() => expect(screen.getAllByRole("textbox")[0]).toHaveFocus());

    await user.keyboard("222222");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin?period=7d"));
    expect(challenge).toHaveBeenLastCalledWith("c1", "222222");
    expect(getSession<StaffUser>("staff")?.user.email).toBe("admin@bookly.test");
  });

  it("starts two-step setup for staff who don't have it yet", async () => {
    const user = userEvent.setup();
    vi.spyOn(staffAuthApi, "login").mockResolvedValue({
      two_factor_required: false,
      two_factor_setup_required: true,
      staff: { ...staff, two_factor_enabled: false },
      token: "setup",
      token_type: "Bearer",
      expires_at: null,
    });
    vi.spyOn(staffAuthApi, "setupTwoFactor").mockReturnValue(new Promise(() => {}));
    app("/admin/login");
    await user.type(screen.getByLabelText("Work email"), "staff@bookly.test");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Staffpass123");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin/two-factor"));
  });
});

describe("StaffTwoFactorSetupPage", () => {
  it("shows the setup key and turns two-step verification on", async () => {
    const user = userEvent.setup();
    signIn({ ...staff, two_factor_enabled: false });
    vi.spyOn(staffAuthApi, "setupTwoFactor").mockResolvedValue({ secret: "ABCDEFGHIJKLMNOP", otpauth_uri: "otpauth://totp/Bookly:staff?secret=ABCDEFGHIJKLMNOP" });
    const confirm = vi.spyOn(staffAuthApi, "confirmTwoFactor").mockResolvedValue({ message: "ok", staff: { ...staff, two_factor_enabled: true } });
    vi.spyOn(staffApi, "summary").mockReturnValue(new Promise(() => {}));
    vi.spyOn(staffApi, "sales").mockReturnValue(new Promise(() => {}));
    app("/admin/two-factor");
    expect(await screen.findByText("ABCD EFGH IJKL MNOP")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Turn on and continue" }));
    expect(screen.getByText("Enter the 6-digit code from your authenticator app.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("textbox")[0]);
    await user.keyboard("123456");
    await user.click(screen.getByRole("button", { name: "Turn on and continue" }));
    expect(confirm).toHaveBeenCalledWith("123456");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent(/^\/admin$/));
    expect(getSession<StaffUser>("staff")?.user.two_factor_enabled).toBe(true);
  });
});

describe("dashboard", () => {
  const days: DailySales[] = [
    { date: "2026-10-01", orders_placed: 2, gross_revenue_usd: "20.00", refunds_usd: "0.00", net_revenue_usd: "20.00" },
    { date: "2026-10-02", orders_placed: 0, gross_revenue_usd: "35.50", refunds_usd: "5.00", net_revenue_usd: "30.50" },
  ];
  const summary: DashboardSummary = {
    period: { from: "2026-09-04", to: "2026-10-03", timezone: "Asia/Phnom_Penh" },
    revenue: { gross_usd: "55.50", refunds_usd: "5.00", net_usd: "50.50" },
    delivered_orders: 3,
    average_order_value_usd: "18.50",
    orders_placed: 4,
    orders_by_status: { pending: 1, delivered: 3 },
    new_customers: 2,
    best_sellers: [{ book_id: 6, title: "The Hound of the Baskervilles", copies_sold: 2, sales_usd: "21.98" }],
    open_returns: 1,
    low_stock: [{ book_variant_id: 61, book_id: 6, title: "The Hound of the Baskervilles", format: "paperback", sku: "BK006-PB", stock_quantity: 0, low_stock_threshold: 5 }],
  };

  it("leads with net revenue and lists low stock", async () => {
    signIn(admin);
    const summaryCall = vi.spyOn(staffApi, "summary").mockResolvedValue(summary);
    vi.spyOn(staffApi, "sales").mockResolvedValue(days);
    const user = userEvent.setup();
    app("/admin");
    expect(await screen.findByText("$50.50")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Low stock" })).getByText("Out of stock")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "7 days" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/admin?period=7d");
    await waitFor(() => expect(summaryCall).toHaveBeenLastCalledWith("7d"));
  });

  it("reads each day with the arrow keys, and has a table", () => {
    renderWithProviders(<SalesChart days={days} />);
    const chart = screen.getByRole("group", { name: /Net revenue by day/ });
    fireEvent.focus(chart);
    expect(screen.getByRole("status")).toHaveTextContent("$30.50");
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("$20.00");
    expect(screen.getByRole("status")).toHaveTextContent("2 new orders placed");
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });
});

describe("books", () => {
  it("creates a book and opens it to add formats", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(catalogApi, "categories").mockResolvedValue([{ id: 1, name: "Fiction", slug: "fiction" }]);
    vi.spyOn(catalogApi, "publishers").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "seriesList").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "authors").mockResolvedValue(page([{ id: 9, name: "Mark Twain" }]));
    const create = vi.spyOn(staffApi, "createBook").mockResolvedValue({ ...book, id: 30, title: "New Title", variants: [], is_visible: false });
    vi.spyOn(staffApi, "book").mockResolvedValue({ ...book, id: 30, title: "New Title", variants: [], is_visible: false });
    app("/admin/books/new");
    await user.click(screen.getByRole("button", { name: "Create book" }));
    expect(await screen.findByText("Enter the title.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Title"), "New Title");
    await user.type(screen.getByLabelText("Find an author to add"), "twain");
    await user.click(await screen.findByRole("button", { name: /Mark Twain/ }));
    await user.click(await screen.findByRole("checkbox", { name: "Fiction" }));
    await user.click(screen.getByRole("button", { name: "Create book" }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ title: "New Title", author_ids: [9], category_ids: [1], language: "English", publisher_id: null }));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin/books/30"));
    expect(await screen.findByText(/No formats yet/)).toBeInTheDocument();
  });

  it("hides deleting from staff who aren't admins", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "book").mockResolvedValue(book);
    vi.spyOn(catalogApi, "categories").mockResolvedValue([]);
    vi.spyOn(catalogApi, "publishers").mockResolvedValue(page([]));
    vi.spyOn(catalogApi, "seriesList").mockResolvedValue(page([]));
    app("/admin/books/6");
    expect(await screen.findByRole("button", { name: "Edit Paperback" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Paperback" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete book/ })).not.toBeInTheDocument();
  });
});

describe("lookups", () => {
  it("adds an author and explains why one in use can't be deleted", async () => {
    const user = userEvent.setup();
    signIn(admin);
    vi.spyOn(catalogApi, "authors").mockResolvedValue(page([{ id: 3, name: "Arthur Conan Doyle", bio: null, books_count: 5 }]));
    const create = vi.spyOn(staffApi, "createLookup").mockResolvedValue({ id: 10, name: "Ann Author" } as never);
    vi.spyOn(staffApi, "deleteLookup").mockRejectedValue(new ApiError({ kind: "conflict", status: 409, message: "This author is linked to 5 book(s). Remove them from those books first." }));
    app("/admin/authors");
    await user.click(await screen.findByRole("button", { name: "Add author" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Ann Author");
    await user.click(within(dialog).getByRole("button", { name: "Add author" }));
    expect(create).toHaveBeenCalledWith("authors", { name: "Ann Author", bio: null, photo_url: null });
    expect(await screen.findByText("Author added")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Arthur Conan Doyle" }));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete author" }));
    expect(await screen.findByText(/linked to 5 book/)).toBeInTheDocument();
  });
});
