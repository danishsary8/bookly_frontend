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

  it("explains an unfinished sign-up on its page", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(pending);
    app("/admin/customers/9");
    const note = await screen.findByRole("note");
    expect(note).toHaveTextContent("Unfinished sign-up.");
    expect(note).toHaveTextContent("unless they finish");
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
