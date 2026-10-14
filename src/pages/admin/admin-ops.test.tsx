import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { staffAuthApi, type StaffUser } from "@/api/endpoints/staff";
import { opsApi, type AuditEntry, type Coupon, type StaffOrder, type StaffCustomer, type StaffMember, type StaffReturn, type StaffReview } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireAdminRole, RequireStaff } from "@/routes/adminGuards";
import LegacyAdminRedirect from "@/routes/LegacyAdminRedirect";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import StaffResetPasswordPage from "./auth/StaffResetPasswordPage";
import AuditLogPage from "./AuditLogPage";
import CouponsAdminPage from "./CouponsAdminPage";
import CustomerAdminPage from "./CustomerAdminPage";
import CustomersAdminPage from "./CustomersAdminPage";
import ExchangeRatesPage from "./ExchangeRatesPage";
import MembersAdminPage from "./MembersAdminPage";
import OrderAdminPage from "./OrderAdminPage";
import OrdersAdminPage from "./OrdersAdminPage";
import ReturnAdminPage from "./ReturnAdminPage";
import ReviewsAdminPage from "./ReviewsAdminPage";

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staff: StaffUser = { ...admin, id: 2, name: "Demo Staff", email: "staff@bookly.test", role: "staff" };
const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[], meta: object = {}) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length, ...meta } }) as never;
const validation = (errors: Record<string, string[]>) =>
  new ApiError({ kind: "validation", status: 422, message: Object.values(errors)[0][0], fieldErrors: errors });

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/reset-password" element={<StaffResetPasswordPage />} />
        <Route path="/superadmin/*" element={<LegacyAdminRedirect />} />
        <Route element={<RequireStaff />}>
          <Route path="/admin" element={<p>Dashboard</p>} />
          <Route path="/admin/orders" element={<OrdersAdminPage />} />
          <Route path="/admin/orders/:id" element={<OrderAdminPage />} />
          <Route path="/admin/returns/:id" element={<ReturnAdminPage />} />
          <Route path="/admin/reviews" element={<ReviewsAdminPage />} />
          <Route path="/admin/coupons" element={<CouponsAdminPage />} />
          <Route path="/admin/customers" element={<CustomersAdminPage />} />
          <Route path="/admin/customers/:id" element={<CustomerAdminPage />} />
          <Route element={<RequireAdminRole />}>
            <Route path="/admin/members" element={<MembersAdminPage />} />
            <Route path="/admin/exchange-rates" element={<ExchangeRatesPage />} />
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
          </Route>
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

describe("routes", () => {
  it("sends old /superadmin links to the matching admin screen (via sign-in)", () => {
    app("/superadmin/promotions");
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/login?next=%2Fadmin%2Fcoupons");
  });

  it("keeps staff who aren't admins out of admin-only screens", () => {
    signIn(staff);
    app("/admin/members");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/admin$/);
  });
});

describe("orders", () => {
  const order = {
    id: 7,
    order_number: "ORD-7",
    status: "processing",
    payment_method: "cod",
    payment_status: "pending",
    placed_at: "2026-10-01T08:00:00Z",
    item_count: 1,
    items: [{ id: 70, book_id: 3, title: "Emma", format: "paperback", quantity: 1, unit_price_usd: "9.99", subtotal_usd: "9.99" }],
    subtotal_usd: "9.99",
    discount_usd: "0.00",
    shipping_fee_usd: "2.00",
    tax_usd: "0.00",
    total_usd: "11.99",
    total_khr: "49159",
    shipping_address: { recipient_name: "Sok Dara", phone: "012345678", address_line1: "House 12, St 240", city: "Phnom Penh", country: "Cambodia" },
    can_cancel: false,
    customer: { id: 4, name: "Sok Dara", email: "dara@example.com" },
    status_history: [{ status: "processing", note: null, changed_by: { id: 2, name: "Demo Staff" }, created_at: "2026-10-01T09:00:00Z" }],
    allowed_next_statuses: ["shipped", "cancelled"],
  } as unknown as StaffOrder;

  it("offers only the next steps the API allows, and sends the note", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "order").mockResolvedValue(order);
    const set = vi.spyOn(opsApi, "setOrderStatus").mockResolvedValue({ ...order, status: "shipped", allowed_next_statuses: ["delivered"] } as StaffOrder);
    app("/admin/orders/7");
    expect(await screen.findByRole("button", { name: "Mark as shipped" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel order" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as delivered" })).not.toBeInTheDocument();
    expect(screen.getByText(/by Demo Staff/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark as shipped" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText(/Note for the timeline/), "Via J&T");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark as shipped" }));
    await waitFor(() => expect(set).toHaveBeenCalledWith(7, "shipped", "Via J&T"));
  });

  it("opens the packing slip and invoice in a new tab, but no packing slip for a cancelled order", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "order").mockResolvedValueOnce(order).mockResolvedValueOnce({ ...order, id: 8, status: "cancelled", allowed_next_statuses: [] } as StaffOrder);
    const first = app("/admin/orders/7");
    const slip = await screen.findByRole("link", { name: "Packing slip" });
    expect(slip).toHaveAttribute("href", "/admin/print?doc=packing-slip&ids=7&autoprint=1");
    expect(slip).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "Invoice" })).toHaveAttribute("href", "/admin/print?doc=invoice&ids=7&autoprint=1");
    first.unmount();

    app("/admin/orders/8");
    expect(await screen.findByRole("link", { name: "Invoice" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Packing slip" })).not.toBeInTheDocument();
  });

  it("shows the customer note when present", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "order").mockResolvedValue({
      ...order,
      delivery_note: "Please handle with care",
    } as unknown as StaffOrder);
    app("/admin/orders/7");
    expect(await screen.findByRole("heading", { name: "Customer note" })).toBeInTheDocument();
    expect(screen.getByText("Please handle with care")).toBeInTheDocument();
  });

  it("edits, saves, cancels, and handles errors on staff note", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "order").mockResolvedValue({
      ...order,
      staff_note: "Initial internal note",
    } as unknown as StaffOrder);
    const setNote = vi.spyOn(opsApi, "setStaffNote").mockResolvedValue({
      ...order,
      staff_note: "Updated note",
    } as unknown as StaffOrder);

    app("/admin/orders/7");
    expect(await screen.findByText("Initial internal note")).toBeInTheDocument();

    // Cancel edit
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    const input = screen.getByLabelText("Internal note");
    await userEvent.clear(input);
    await userEvent.type(input, "Discarded note");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Initial internal note")).toBeInTheDocument();

    // Error handling
    setNote.mockRejectedValueOnce(validation({ staff_note: ["Staff note must not exceed 1000 characters."] }));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Staff note must not exceed 1000 characters.")).toBeInTheDocument();

    // Successful save
    setNote.mockResolvedValueOnce({ ...order, staff_note: "Updated note" } as unknown as StaffOrder);
    await userEvent.clear(screen.getByLabelText("Internal note"));
    await userEvent.type(screen.getByLabelText("Internal note"), "Updated note");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(setNote).toHaveBeenCalledWith(7, "Updated note"));
    expect(await screen.findByText("Staff note saved")).toBeInTheDocument();
    expect(screen.getByText("Updated note")).toBeInTheDocument();
  });

  it("prints the ticked orders together, in the order they were ticked", async () => {
    signIn(staff);
    const other = { ...order, id: 8, order_number: "ORD-8" } as StaffOrder;
    const third = { ...order, id: 9, order_number: "ORD-9" } as StaffOrder;
    vi.spyOn(opsApi, "orders").mockResolvedValue(page([order, other, third]));
    app("/admin/orders");
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select order ORD-9" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select order ORD-7" }));
    const bar = screen.getByRole("region", { name: "Selected orders" });
    expect(bar).toHaveTextContent("2 selected");
    expect(within(bar).getByRole("link", { name: "Print packing slips" })).toHaveAttribute("href", "/admin/print?doc=packing-slip&ids=9,7&autoprint=1");
    expect(within(bar).getByRole("link", { name: "Print invoices" })).toHaveAttribute("href", "/admin/print?doc=invoice&ids=9,7&autoprint=1");
    expect(screen.getByRole("checkbox", { name: "Select every order on this page" })).toHaveAttribute("data-state", "indeterminate");

    await userEvent.click(screen.getByRole("checkbox", { name: "Select every order on this page" }));
    expect(bar).toHaveTextContent("3 selected");
    expect(within(bar).getByRole("link", { name: "Print packing slips" })).toHaveAttribute("href", "/admin/print?doc=packing-slip&ids=9,7,8&autoprint=1");
    await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("region", { name: "Selected orders" })).not.toBeInTheDocument();
  });

  it("changes the status of the ticked orders together and unticks them", async () => {
    signIn(staff);
    const other = { ...order, id: 8, order_number: "ORD-8" } as StaffOrder;
    vi.spyOn(opsApi, "orders").mockResolvedValue(page([order, other]));
    const bulk = vi.spyOn(opsApi, "bulkOrderStatus").mockResolvedValue({
      status: "shipped",
      updated: [
        { id: 8, order_number: "ORD-8", status: "shipped" },
        { id: 7, order_number: "ORD-7", status: "shipped" },
      ],
      failed: [],
    });
    app("/admin/orders");
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select order ORD-8" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select order ORD-7" }));
    await userEvent.click(within(screen.getByRole("region", { name: "Selected orders" })).getByRole("button", { name: "Change status" }));
    const dialog = screen.getByRole("dialog", { name: "Change status: 2 orders" });
    expect(within(dialog).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual(["Start processing", "Mark as shipped", "Mark as delivered"]);
    await userEvent.click(within(dialog).getByRole("radio", { name: "Mark as shipped" }));
    await userEvent.type(within(dialog).getByLabelText(/Note for each timeline/), "Via J&T");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark as shipped: 2 orders" }));
    await waitFor(() => expect(bulk).toHaveBeenCalledWith([8, 7], "shipped", "Via J&T"));
    expect(await screen.findByText("2 orders updated")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("region", { name: "Selected orders" })).not.toBeInTheDocument();
  });

  it("lists the orders that could not move and keeps them ticked", async () => {
    signIn(staff);
    const other = { ...order, id: 8, order_number: "ORD-8", status: "pending" } as StaffOrder;
    vi.spyOn(opsApi, "orders").mockResolvedValue(page([order, other]));
    vi.spyOn(opsApi, "bulkOrderStatus").mockResolvedValue({
      status: "shipped",
      updated: [{ id: 7, order_number: "ORD-7", status: "shipped" }],
      failed: [{ id: 8, order_number: "ORD-8", reason: "An order cannot move from pending to shipped." }],
    });
    app("/admin/orders");
    await userEvent.click(await screen.findByRole("checkbox", { name: "Select every order on this page" }));
    await userEvent.click(screen.getByRole("button", { name: "Change status" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("radio", { name: "Mark as shipped" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Mark as shipped: 2 orders" }));
    const result = await screen.findByRole("dialog", { name: "1 order updated" });
    expect(within(result).getByRole("list", { name: "Not changed" })).toHaveTextContent("ORD-8An order cannot move from pending to shipped.");
    await userEvent.click(within(result).getByRole("button", { name: "Done" }));
    expect(screen.getByRole("region", { name: "Selected orders" })).toHaveTextContent("1 selected");
    expect(screen.getByRole("checkbox", { name: "Select order ORD-8" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select order ORD-7" })).not.toBeChecked();
  });

  it("shows the CSV export to admins only", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "orders").mockResolvedValue(page([order]));
    app("/admin/orders");
    expect(await screen.findByRole("link", { name: "ORD-7" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export CSV" })).not.toBeInTheDocument();
  });
});

describe("returns", () => {
  const item = {
    id: 7,
    order_id: 12,
    order_number: "BK-0012",
    status: "requested",
    reason: "Pages missing",
    requested_at: "2026-10-01T00:00:00Z",
    resolved_at: null,
    refund_amount_usd: "12.50",
    is_refund_final: false,
    staff_note: null,
    items: [{ id: 1, title: "Emma", format: "paperback", quantity: 1, unit_price_usd: "12.50", reason: null }],
    customer: { id: 4, name: "Sokha Chan", email: "sokha@example.com" },
  } as unknown as StaffReturn;

  it("won't refuse a return without a reason the customer can read", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "return").mockResolvedValue(item);
    const reject = vi.spyOn(opsApi, "rejectReturn").mockResolvedValue({ ...item, status: "rejected", staff_note: "Outside 30 days" } as StaffReturn);
    app("/admin/returns/7");
    await userEvent.click(await screen.findByRole("button", { name: "Don't accept" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Don't accept" }));
    expect(within(dialog).getByText("Write the reason the customer will see.")).toBeInTheDocument();
    expect(reject).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "Outside 30 days");
    await userEvent.click(within(dialog).getByRole("button", { name: "Don't accept" }));
    await waitFor(() => expect(reject).toHaveBeenCalledWith(7, "Outside 30 days"));
  });
});

describe("reviews", () => {
  it("hides a review from the shop", async () => {
    signIn(staff);
    const review: StaffReview = { id: 3, book: { id: 6, title: "Emma" }, customer: { id: 4, name: "Sokha", email: null }, rating: 1, comment: "Spam link", is_visible: true, created_at: "2026-10-01T00:00:00Z" };
    vi.spyOn(opsApi, "reviews").mockResolvedValue(page([review]));
    const hide = vi.spyOn(opsApi, "hideReview").mockResolvedValue({ ...review, is_visible: false });
    app("/admin/reviews");
    await userEvent.click(await screen.findByRole("button", { name: "Hide" }));
    await waitFor(() => expect(hide).toHaveBeenCalledWith(3));
    expect(await screen.findByText("Review hidden from the shop")).toBeInTheDocument();
  });
});

describe("coupons", () => {
  const coupon: Coupon = { id: 1, code: "WELCOME10", type: "percentage", value: "10", min_order_amount: "20", max_uses: null, used_count: 3, starts_at: null, expires_at: null, is_active: true };

  it("checks the code and percentage before saving", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "coupons").mockResolvedValue(page([coupon]));
    const create = vi.spyOn(opsApi, "createCoupon");
    app("/admin/coupons");
    await userEvent.click(await screen.findByRole("button", { name: "New coupon" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.type(within(dialog).getByLabelText("Code"), "x");
    await userEvent.type(within(dialog).getByLabelText("Percent off"), "150");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create coupon" }));
    expect(within(dialog).getByText(/Use 3 to 50 letters/)).toBeInTheDocument();
    expect(within(dialog).getByText("A percentage can't be more than 100.")).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it("only lets admins delete", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "coupons").mockResolvedValue(page([coupon]));
    app("/admin/coupons");
    expect(await screen.findByRole("button", { name: "Edit WELCOME10" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete WELCOME10" })).not.toBeInTheDocument();
  });
});

describe("customer", () => {
  const customer: StaffCustomer = {
    id: 4,
    name: "Sokha Chan",
    email: "sokha@example.com",
    phone: null,
    email_verified: true,
    is_active: true,
    login_methods: ["password"],
    stats: { orders_by_status: { delivered: 2 }, returns_count: 0, reviews_count: 1, lifetime_spent_usd: "40.00", last_order_at: "2026-10-01T00:00:00Z" },
    recent_orders: [],
    created_at: "2026-09-01T00:00:00Z",
    removal_at: null,
  };
  const pending: StaffCustomer = {
    ...customer,
    id: 9,
    name: "Vanna Ly",
    email: "vanna@example.com",
    email_verified: false,
    login_methods: ["password"],
    created_at: new Date(Date.now() - 20 * 3_600_000).toISOString(),
    removal_at: new Date(Date.now() + 28 * 3_600_000).toISOString(),
  };

  it("opens on verified customers, with a second tab for unfinished sign-ups", async () => {
    signIn(staff);
    const list = vi.spyOn(opsApi, "customers").mockImplementation(async (f = {}) =>
      f.verified === false ? page([pending], { counts: { verified: 1, unverified: 1 } }) : page([customer], { counts: { verified: 1, unverified: 1 } }),
    );
    app("/admin/customers?q=a");
    const tabs = await screen.findByRole("navigation", { name: "Customer accounts" });
    expect(await screen.findByRole("link", { name: "Sokha Chan" })).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ verified: true, q: "a" }));
    expect(within(tabs).getByRole("link", { name: /Verified/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Password")).toBeInTheDocument();

    await userEvent.click(within(tabs).getByRole("link", { name: /Not verified yet\s*1/ }));
    expect(await screen.findByRole("link", { name: "Vanna Ly" })).toBeInTheDocument();
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/customers?q=a&view=unverified");
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ verified: false, q: "a" }));
    expect(screen.getByText("Removed in 1 day")).toBeInTheDocument();
    expect(screen.getByText(/removed 48 hours after signing up/)).toBeInTheDocument();
  });

  it("lets an admin delete an unfinished sign-up from the list after confirming", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customers").mockResolvedValue(page([pending], { counts: { verified: 1, unverified: 1 } }));
    const remove = vi.spyOn(opsApi, "deleteCustomer").mockResolvedValue(undefined as never);
    app("/admin/customers?view=unverified");
    await userEvent.click(await screen.findByRole("button", { name: "Delete Vanna Ly's sign-up" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("vanna@example.com can be used to sign up again");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(9));
    expect(await screen.findByText("Vanna Ly's sign-up was deleted")).toBeInTheDocument();
  });

  it("shows staff no delete buttons, and admins none for verified customers", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customers").mockResolvedValue(page([pending], { counts: { verified: 1, unverified: 1 } }));
    app("/admin/customers?view=unverified");
    expect(await screen.findByRole("link", { name: "Vanna Ly" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("deletes from the customer page and goes back to the list", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(pending);
    vi.spyOn(opsApi, "customers").mockResolvedValue(page([], { counts: { verified: 1, unverified: 0 } }));
    const remove = vi.spyOn(opsApi, "deleteCustomer").mockResolvedValue(undefined as never);
    app("/admin/customers/9");
    await userEvent.click(await screen.findByRole("button", { name: "Delete now" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith(9));
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin/customers?view=unverified"));
  });

  it("explains an unfinished sign-up on its page", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(pending);
    app("/admin/customers/9");
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Unfinished sign-up.");
    expect(note).toHaveTextContent("unless they finish");
  });

  const closedOne: StaffCustomer = {
    ...customer,
    id: 12,
    name: "Dara Keo",
    email: "dara@example.com",
    closed_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    erase_at: new Date(Date.now() + 27 * 86_400_000).toISOString(),
  };

  it("lists closed accounts in their own tab, and an admin reopens one after confirming", async () => {
    signIn(admin);
    const list = vi.spyOn(opsApi, "customers").mockImplementation(async (f = {}) =>
      f.closed ? page([closedOne], { counts: { verified: 1, unverified: 0, closed: 1 } }) : page([customer], { counts: { verified: 1, unverified: 0, closed: 1 } }),
    );
    const reopen = vi.spyOn(opsApi, "reopenCustomer").mockResolvedValue({ ...closedOne, closed_at: null, erase_at: null });
    app("/admin/customers");
    const tabs = await screen.findByRole("navigation", { name: "Customer accounts" });
    expect(await screen.findByRole("link", { name: "Sokha Chan" })).toBeInTheDocument();
    await userEvent.click(within(tabs).getByRole("link", { name: /Closed\s*1/ }));

    expect(await screen.findByRole("link", { name: "Dara Keo" })).toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ closed: true }));
    expect(screen.getByText("Erased in 27 days")).toBeInTheDocument();
    expect(screen.getByText(/erased 30 days after closing/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Show" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reopen Dara Keo's account" }));
    const dialog = screen.getByRole("alertdialog", { name: "Reopen Dara Keo's account?" });
    expect(dialog).toHaveTextContent("recorded in the audit log");
    await userEvent.click(within(dialog).getByRole("button", { name: "Reopen account" }));
    await waitFor(() => expect(reopen).toHaveBeenCalledWith(12));
    expect(await screen.findByText("Dara Keo's account is open again")).toBeInTheDocument();
  });

  it("shows staff closed accounts without the reopen button", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customers").mockResolvedValue(page([closedOne], { counts: { verified: 1, unverified: 0, closed: 1 } }));
    app("/admin/customers?view=closed");
    expect(await screen.findByRole("link", { name: "Dara Keo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reopen/ })).not.toBeInTheDocument();
  });

  it("explains a closed account on its page and lets an admin reopen it", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(closedOne);
    const reopen = vi.spyOn(opsApi, "reopenCustomer").mockResolvedValue({ ...closedOne, closed_at: null, erase_at: null });
    app("/admin/customers/12");
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Closed by the customer");
    expect(note).toHaveTextContent("orders stay");
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reopen account" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Reopen account" }));
    await waitFor(() => expect(reopen).toHaveBeenCalledWith(12));
  });

  it("shows staff the account without the deactivate button", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(customer);
    app("/admin/customers/4");
    expect(await screen.findByRole("heading", { level: 1, name: "Sokha Chan" })).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Deactivate" })).not.toBeInTheDocument();
  });

  it("lets an admin deactivate after confirming", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(customer);
    const toggle = vi.spyOn(opsApi, "setCustomerActive").mockResolvedValue({ ...customer, is_active: false });
    app("/admin/customers/4");
    await userEvent.click(await screen.findByRole("button", { name: "Deactivate" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(toggle).toHaveBeenCalledWith(4, false));
  });

  it("danger zone: only admins can close a customer account, showing dialog with validation and error", async () => {
    // 1. Staff does not see danger zone or close button
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(customer);
    const first = app("/admin/customers/4");
    expect(await screen.findByRole("heading", { level: 1, name: "Sokha Chan" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Danger zone" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close account" })).not.toBeInTheDocument();
    first.unmount();

    // 2. Admin sees danger zone and can open dialog
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(customer);
    const closeApi = vi.spyOn(opsApi, "closeCustomer");
    app("/admin/customers/4");
    expect(await screen.findByRole("heading", { name: "Danger zone" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close account" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Close Sokha Chan's account?" })).toBeInTheDocument();
    expect(dialog).toHaveTextContent("reopened for 30 days");
    expect(dialog).toHaveTextContent("personal details (name, email, phone, addresses) are erased");

    // 3. API Error handling
    closeApi.mockRejectedValueOnce(
      validation({ password: ["That password is incorrect."] }),
    );
    await userEvent.type(within(dialog).getByLabelText("Your password"), "WrongPassword");
    await userEvent.type(within(dialog).getByLabelText("6-digit authenticator code"), "123456");
    await userEvent.type(within(dialog).getByLabelText(/Type sokha@example.com to confirm/), "sokha@example.com");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close account" }));

    expect(await within(dialog).findByText("That password is incorrect.")).toBeInTheDocument();

    // 4. Successful close
    const closedCustomer: StaffCustomer = {
      ...customer,
      closed_at: "2026-10-14T10:00:00Z",
      erase_at: "2026-11-13T10:00:00Z",
    };
    closeApi.mockResolvedValueOnce(closedCustomer);

    await userEvent.clear(within(dialog).getByLabelText("Your password"));
    await userEvent.type(within(dialog).getByLabelText("Your password"), "CorrectPassword");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close account" }));

    await waitFor(() =>
      expect(closeApi).toHaveBeenCalledWith(4, {
        password: "CorrectPassword",
        code: "123456",
        confirm: "sokha@example.com",
      }),
    );

    // Toast shown
    expect(await screen.findByText("Sokha Chan's account was closed")).toBeInTheDocument();

    // Closed banner and reopen button appear, Danger zone disappears
    expect(await screen.findByRole("button", { name: "Reopen account" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Danger zone" })).not.toBeInTheDocument();
  });
});

describe("staff members", () => {
  const me: StaffMember = { ...admin, is_active: true, created_at: "2026-08-01T00:00:00Z", updated_at: "2026-08-01T00:00:00Z" } as StaffMember;
  const other: StaffMember = { ...me, id: 5, name: "Dara Kim", email: "dara@bookly.test", role: "staff", two_factor_enabled: false };

  it("invites a member after checking the form", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "members").mockResolvedValue(page([me]));
    const invite = vi.spyOn(opsApi, "inviteMember").mockResolvedValue(other);
    app("/admin/members");
    await userEvent.click(await screen.findByRole("button", { name: "Invite member" }));
    const dialog = screen.getByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send invitation" }));
    expect(within(dialog).getByText("Enter their name.")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Name"), "Dara Kim");
    await userEvent.type(within(dialog).getByLabelText("Email"), "dara@bookly.test");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send invitation" }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith({ name: "Dara Kim", email: "dara@bookly.test", role: "staff" }));
    expect(await screen.findByText("Invitation sent to dara@bookly.test")).toBeInTheDocument();
  });

  it("doesn't offer to deactivate yourself, and shows the API's last-admin rule", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "members").mockResolvedValue(page([me, other]));
    vi.spyOn(opsApi, "updateMember").mockRejectedValue(validation({ staff: ["The last active admin cannot be demoted."] }));
    app("/admin/members");
    await userEvent.click(await screen.findByRole("button", { name: "Actions for Demo Admin" }));
    expect(screen.getByRole("menuitem", { name: "Edit name or role" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Deactivate" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit name or role" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Role")).toBeDisabled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByText("The last active admin cannot be demoted.")).toBeInTheDocument();
  });
});

describe("exchange rate", () => {
  it("checks the number, shows the change and saves it", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "rates").mockResolvedValue({
      data: [{ id: 1, rate: "4100.000000", effective_at: "2026-08-01T00:00:00Z", is_current: true, created_at: "2026-08-01T00:00:00Z" }],
      meta: { current_page: 1, last_page: 1, total: 1, current_rate: "4100.000000" },
    } as never);
    const add = vi.spyOn(opsApi, "addRate").mockResolvedValue({ id: 2, rate: "4141", effective_at: "2026-10-05T00:00:00Z", is_current: true, created_at: "2026-10-05T00:00:00Z" });
    app("/admin/exchange-rates");
    expect(await screen.findByRole("heading", { name: "Current rate" })).toBeInTheDocument();
    const field = screen.getByLabelText("Riel per US dollar");
    await userEvent.type(field, "abc");
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    expect(screen.getByText(/Use a positive number/)).toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.type(field, "4141");
    expect(screen.getByText("+1.00% from the current rate")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save rate" }));
    await waitFor(() => expect(add).toHaveBeenCalledWith("4141", undefined));
    expect(await screen.findByText("New rate in use")).toBeInTheDocument();
  });
});

describe("audit log", () => {
  it("says who changed what, with the fields before and after", async () => {
    signIn(admin);
    const entry: AuditEntry = {
      id: 9,
      staff: { id: 1, name: "Demo Admin", email: "admin@bookly.test" },
      action: "order.status_changed",
      entity_type: "order",
      entity_id: 12,
      before: { status: "processing", id: 12 },
      after: { status: "shipped", id: 12 },
      created_at: "2026-10-05T09:00:00Z",
    };
    vi.spyOn(opsApi, "members").mockResolvedValue(page([]));
    vi.spyOn(opsApi, "audit").mockResolvedValue(page([entry], { per_page: 30, entity_types: ["order"] }));
    app("/admin/audit-log");
    const item = await screen.findByRole("listitem");
    expect(item).toHaveTextContent("Demo Admin changed the status of Order #12");
    expect(within(item).getByRole("link", { name: "Order #12" })).toHaveAttribute("href", "/admin/orders/12");
    await userEvent.click(within(item).getByText("1 field"));
    const row = within(item).getByRole("row", { name: /status/ });
    expect(row).toHaveTextContent("processing");
    expect(row).toHaveTextContent("shipped");
  });
});

describe("staff reset page", () => {
  it("lets a new member use the code from their invitation without sending another", async () => {
    const send = vi.spyOn(staffAuthApi, "forgotPassword");
    const reset = vi.spyOn(staffAuthApi, "resetPassword").mockResolvedValue({ message: "ok" } as never);
    app("/admin/reset-password");
    await userEvent.type(screen.getByLabelText("Work email"), "dara@bookly.test");
    await userEvent.click(screen.getByRole("button", { name: "I already have a code" }));
    expect(await screen.findByRole("heading", { name: "Choose your password" })).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
    await userEvent.keyboard("123456");
    await userEvent.type(screen.getByLabelText("New password"), "Welcome-Team-2026");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Welcome-Team-2026");
    await userEvent.click(screen.getByRole("button", { name: "Save password" }));
    await waitFor(() => expect(reset).toHaveBeenCalledWith({ email: "dara@bookly.test", code: "123456", password: "Welcome-Team-2026", password_confirmation: "Welcome-Team-2026" }));
  });
});
