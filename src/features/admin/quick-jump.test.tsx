import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { api } from "@/api/client";
import { staffApi, type StaffUser } from "@/api/endpoints/staff";
import { opsApi } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { clearSession, setSession } from "@/api/session";
import { RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { AdminShell } from "./AdminShell";

/* Menu badges and "Search or jump to… Ctrl K" (BI design 2026-11-01, branch 3; owner 5A). */

const admin: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const page = <T,>(data: T[]) => ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 5, total: data.length, from: 1, to: data.length } }) as never;

function Where() {
  const { pathname } = useLocation();
  return <p data-testid="where">{pathname}</p>;
}

const app = () =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<RequireStaff />}>
          <Route element={<AdminShell />}>
            <Route path="/admin" element={<p>Dashboard page</p>} />
            <Route path="/admin/*" element={<p>Other page</p>} />
          </Route>
        </Route>
      </Routes>
      <Where />
    </>,
    { route: "/admin" },
  );

/** The shell also asks for notifications and new orders; answer those with nothing. */
const counts = (answer: unknown) => {
  const real = api.get.bind(api);
  return vi.spyOn(api, "get").mockImplementation(((url: string, config?: unknown) => {
    if (url === "/staff/dashboard/counts") return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    if (url.startsWith("/staff/notifications") || url.startsWith("/staff/orders")) return Promise.resolve({ data: [], meta: { unread: 0 } });
    return real(url, config as never);
  }) as never);
};

beforeEach(() => setSession("staff", { token: "t", expiresAt: null, user: admin }));
afterEach(() => {
  vi.restoreAllMocks();
  clearSession("staff");
});

describe("menu badges", () => {
  it("shows pending orders, open returns and low stock next to their menu items", async () => {
    counts({ data: { pending_orders: 3, open_returns: 1, low_stock: 120 } });
    app();
    const nav = screen.getAllByRole("navigation", { name: "Admin" })[0];
    expect(await within(nav).findByRole("link", { name: /^Orders\s*,\s*3 pending orders$/ })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^Returns\s*,\s*1 open return$/ })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: /^Stock\s*,\s*120 low on stock$/ })).toHaveTextContent("99+");
  });

  it("shows no badge for zero, and none at all on an API without counts", async () => {
    counts(new ApiError({ kind: "not_found", status: 404, message: "Not found." }));
    app();
    const nav = screen.getAllByRole("navigation", { name: "Admin" })[0];
    expect(await within(nav).findByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Returns" })).toBeInTheDocument();
  });
});

describe("quick jump", () => {
  it("opens with Ctrl K, filters pages, and Enter goes to the page", async () => {
    const user = userEvent.setup();
    counts({ data: { pending_orders: 0, open_returns: 0, low_stock: 0 } });
    app();
    await screen.findByText("Dashboard page");
    await user.keyboard("{Control>}k{/Control}");
    const box = await screen.findByRole("combobox", { name: "Search or jump to" });
    await user.type(box, "coup");
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(1);
    await user.keyboard("{Enter}");
    expect(screen.getByTestId("where")).toHaveTextContent("/admin/coupons");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("finds orders, books and customers from 2 letters and moves with the arrow keys", async () => {
    const user = userEvent.setup();
    counts({ data: { pending_orders: 0, open_returns: 0, low_stock: 0 } });
    vi.spyOn(opsApi, "orders").mockResolvedValue(page([{ id: 42, order_number: "ORD-20261101-ABCDE", customer: { id: 7, name: "Sok Dara", email: null } }]));
    vi.spyOn(staffApi, "books").mockResolvedValue(page([{ id: 5, title: "The Sign of the Four" }]));
    vi.spyOn(opsApi, "customers").mockResolvedValue(page([{ id: 7, name: "Sok Dara", email: "dara@example.com", phone: null }]));
    app();
    await user.click(await screen.findByRole("button", { name: /Search or jump to/ }));
    await user.type(screen.getByRole("combobox"), "zz");
    const list = screen.getByRole("listbox");
    expect(await within(list).findByRole("option", { name: /ORD-20261101-ABCDE Sok Dara Orders/ })).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: /The Sign of the Four Books/ })).toBeInTheDocument();
    expect(within(list).getByRole("option", { name: /Sok Dara dara@example.com Customers/ })).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/admin/books/5"));
  });
});
