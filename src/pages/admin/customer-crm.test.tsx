import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import type { StaffUser } from "@/api/endpoints/staff";
import {
  opsApi,
  type CustomerNote,
  type CustomerTagSuggestion,
  type StaffCustomer,
} from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import CustomerAdminPage from "./CustomerAdminPage";
import CustomersAdminPage from "./CustomersAdminPage";

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

const sampleCustomer: StaffCustomer = {
  id: 42,
  name: "Alice Reader",
  email: "alice@example.com",
  phone: "+85512345678",
  email_verified: true,
  is_active: true,
  login_methods: ["password"],
  tags: ["VIP", "Book Club"],
  stats: {
    orders_by_status: { delivered: 5 },
    returns_count: 0,
    reviews_count: 3,
    lifetime_spent_usd: "189.50",
    last_order_at: "2026-10-10T12:00:00Z",
  },
  recent_orders: [
    {
      id: 101,
      order_number: "ORD-101",
      placed_at: "2026-10-10T12:00:00Z",
      status: "delivered",
      total_usd: "55.00",
      item_count: 2,
    },
  ],
  created_at: "2026-08-01T00:00:00Z",
  removal_at: null,
};

const sampleNotes: CustomerNote[] = [
  {
    id: 1,
    customer_id: 42,
    author: { id: 1, name: "Demo Admin" },
    body: "Prefers hardcovers, call before delivery.",
    created_at: "2026-10-11T09:00:00Z",
  },
];

const renderApp = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route path="/admin/customers" element={<CustomersAdminPage />} />
          <Route path="/admin/customers/:id" element={<CustomerAdminPage />} />
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route },
  );

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

describe("Customer CRM - Admin vs Staff visibility", () => {
  it("shows lifetime spent and order total to admin", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(sampleCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue(sampleNotes);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);

    renderApp("/admin/customers/42");

    expect(await screen.findByText("Spent")).toBeInTheDocument();
    expect(screen.getByText("$189.50")).toBeInTheDocument();
    expect(screen.getByText("ORD-101")).toBeInTheDocument();
    expect(screen.getByText("$55.00")).toBeInTheDocument();
  });

  it("hides lifetime spent and order total from regular staff", async () => {
    signIn(staff);
    // When staff requests customer, backend omits stats.lifetime_spent_usd and recent_orders[].total_usd
    const staffCustomer: StaffCustomer = {
      ...sampleCustomer,
      stats: {
        orders_by_status: { delivered: 5 },
        returns_count: 0,
        reviews_count: 3,
        last_order_at: "2026-10-10T12:00:00Z",
      },
      recent_orders: [
        {
          id: 101,
          order_number: "ORD-101",
          placed_at: "2026-10-10T12:00:00Z",
          status: "delivered",
          item_count: 2,
        },
      ],
    };

    vi.spyOn(opsApi, "customer").mockResolvedValue(staffCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue(sampleNotes);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);

    renderApp("/admin/customers/42");

    await screen.findByRole("heading", { name: "Alice Reader" });
    expect(screen.queryByText("Spent")).not.toBeInTheDocument();
    expect(screen.queryByText("$189.50")).not.toBeInTheDocument();
    expect(screen.getByText("ORD-101")).toBeInTheDocument();
    expect(screen.queryByText("$55.00")).not.toBeInTheDocument();
  });
});

describe("Customer CRM - Resend Verification", () => {
  it("shows resend verification button for unverified customers and triggers API", async () => {
    signIn(admin);
    const unverifiedCustomer: StaffCustomer = {
      ...sampleCustomer,
      email_verified: false,
    };

    vi.spyOn(opsApi, "customer").mockResolvedValue(unverifiedCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue([]);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);
    const resendSpy = vi.spyOn(opsApi, "resendCustomerVerification").mockResolvedValue({
      message: "Verification email resent successfully.",
    });

    renderApp("/admin/customers/42");

    const resendBtn = await screen.findByRole("button", { name: /Resend verification email/i });
    expect(resendBtn).toBeInTheDocument();

    await userEvent.click(resendBtn);
    await waitFor(() => expect(resendSpy).toHaveBeenCalledWith(42));
    expect(await screen.findByText("Verification email sent")).toBeInTheDocument();
  });

  it("does not show resend verification button for verified customers", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(sampleCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue([]);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);

    renderApp("/admin/customers/42");

    await screen.findByRole("heading", { name: "Alice Reader" });
    expect(screen.queryByRole("button", { name: /Resend verification email/i })).not.toBeInTheDocument();
  });
});

describe("Customer CRM - Notes Panel", () => {
  it("displays notes and allows adding a new note", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(sampleCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue(sampleNotes);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);
    const addNoteSpy = vi.spyOn(opsApi, "addCustomerNote").mockResolvedValue({
      id: 2,
      customer_id: 42,
      author: { id: 2, name: "Demo Staff" },
      body: "Customer called inquiring about preorder.",
      created_at: "2026-10-16T01:00:00Z",
    });

    renderApp("/admin/customers/42");

    expect(await screen.findByText("Staff notes")).toBeInTheDocument();
    expect(await screen.findByText("Prefers hardcovers, call before delivery.")).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Add an internal note about this customer…/i);
    await userEvent.type(input, "Customer called inquiring about preorder.");

    const addBtn = screen.getByRole("button", { name: /Add note/i });
    await userEvent.click(addBtn);

    await waitFor(() =>
      expect(addNoteSpy).toHaveBeenCalledWith(42, "Customer called inquiring about preorder."),
    );
  });

  it("allows deleting note with confirmation", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "customer").mockResolvedValue(sampleCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue(sampleNotes);
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue([]);
    const deleteNoteSpy = vi.spyOn(opsApi, "deleteCustomerNote").mockResolvedValue(undefined as never);

    renderApp("/admin/customers/42");

    const deleteBtn = await screen.findByRole("button", { name: "Delete note" });
    await userEvent.click(deleteBtn);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Delete this note?");

    const confirmBtn = within(dialog).getByRole("button", { name: "Delete" });
    await userEvent.click(confirmBtn);

    await waitFor(() => expect(deleteNoteSpy).toHaveBeenCalledWith(1));
  });
});

describe("Customer CRM - Tags Editor", () => {
  it("renders tags, allows adding tag and saving", async () => {
    signIn(staff);
    vi.spyOn(opsApi, "customer").mockResolvedValue(sampleCustomer);
    vi.spyOn(opsApi, "customerNotes").mockResolvedValue([]);
    const suggestions: CustomerTagSuggestion[] = [{ name: "Wholesale", count: 4, customer_count: 4 }];
    vi.spyOn(opsApi, "customerTagSuggestions").mockResolvedValue(suggestions);
    const updateTagsSpy = vi.spyOn(opsApi, "updateCustomerTags").mockResolvedValue({
      tags: ["VIP", "Book Club", "Wholesale"],
    });

    renderApp("/admin/customers/42");

    expect(await screen.findByText("#VIP")).toBeInTheDocument();
    expect(screen.getByText("#Book Club")).toBeInTheDocument();

    const tagInput = screen.getByPlaceholderText(/Add tag/i);
    await userEvent.type(tagInput, "Wholesale{enter}");

    expect(screen.getByText("#Wholesale")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: "Save tags" });
    await userEvent.click(saveBtn);

    await waitFor(() =>
      expect(updateTagsSpy).toHaveBeenCalledWith(42, ["VIP", "Book Club", "Wholesale"]),
    );
  });
});

describe("CustomersAdminPage - Tag filtering", () => {
  it("displays customer tags and applies tag filter in request", async () => {
    signIn(staff);
    const listSpy = vi.spyOn(opsApi, "customers").mockResolvedValue(
      page([sampleCustomer], { counts: { verified: 1, unverified: 0, closed: 0 } }),
    );

    renderApp("/admin/customers?tag=VIP");

    expect(await screen.findByRole("link", { name: "Alice Reader" })).toBeInTheDocument();
    expect(listSpy).toHaveBeenCalledWith(expect.objectContaining({ tag: "VIP" }));
    expect(screen.getByText(/Tag:\s*#VIP/)).toBeInTheDocument();
  });
});
