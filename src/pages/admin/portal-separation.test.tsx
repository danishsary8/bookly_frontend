import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { staffAuthApi, type StaffUser } from "@/api/endpoints/staff";
import { ApiError } from "@/api/errors";
import { clearSession, getSession, setSession } from "@/api/session";
import { AdminShell } from "@/features/admin/AdminShell";
import { portalNext, rewriteAdminPath } from "@/features/admin/portal";
import { staffDailySalesPrintPath, staffPrintPath } from "@/features/orders/documents/printLinks";
import { cleanEvent } from "@/lib/analyticsEvent";
import { RequirePortal, RequireStaffSetup, StaffGuestOnly } from "@/routes/adminGuards";
import { dismissToast } from "@/stores/toast";
import { renderWithProviders } from "@/test/render";
import StaffLoginPage from "./auth/StaffLoginPage";

const adminUser: StaffUser = { id: 1, name: "Demo Admin", email: "admin@bookly.test", role: "admin", two_factor_enabled: true };
const staffUser: StaffUser = { id: 2, name: "Demo Staff", email: "staff@bookly.test", role: "staff", two_factor_enabled: true };
const signIn = (user: StaffUser) => setSession("staff", { token: "tok", expiresAt: null, user });

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const renderPortals = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route element={<StaffGuestOnly portal="admin" />}>
          <Route path="/admin/login" element={<StaffLoginPage portal="admin" />} />
        </Route>
        <Route element={<RequireStaffSetup portal="admin" />}>
          <Route path="/admin/two-factor" element={<p>Admin 2FA setup</p>} />
        </Route>
        <Route element={<RequirePortal portal="admin" />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<p>Admin home</p>} />
            <Route path="orders" element={<p>Admin orders</p>} />
            <Route path="reports" element={<p>Admin reports</p>} />
          </Route>
        </Route>

        <Route element={<StaffGuestOnly portal="staff" />}>
          <Route path="/staff/login" element={<StaffLoginPage portal="staff" />} />
        </Route>
        <Route element={<RequireStaffSetup portal="staff" />}>
          <Route path="/staff/two-factor" element={<p>Staff 2FA setup</p>} />
        </Route>
        <Route element={<RequirePortal portal="staff" />}>
          <Route path="/staff" element={<AdminShell />}>
            <Route index element={<p>Staff home</p>} />
            <Route path="orders" element={<p>Staff orders</p>} />
          </Route>
        </Route>
      </Routes>
      <Where />
    </>,
    { route },
  );

afterEach(() => {
  vi.restoreAllMocks();
  dismissToast();
  clearSession("staff");
});

// Sidebar groups start folded; these tests read links from every group.
const openAllNavGroups = () => localStorage.setItem("bookly.admin.navGroups", JSON.stringify(Object.fromEntries(["Overview", "Orders", "Customer care", "Marketing", "Catalogue", "Admin"].map((g) => [g, false]))));
beforeEach(openAllNavGroups);

describe("portal helpers", () => {
  it("scopes portalNext strictly to each portal", () => {
    expect(portalNext("staff", "/staff/orders?status=pending")).toBe("/staff/orders?status=pending");
    expect(portalNext("staff", "/admin/orders")).toBe("/staff");
    expect(portalNext("staff", "/staff/login")).toBe("/staff");
    expect(portalNext("admin", "/staff/orders")).toBe("/admin");
    expect(portalNext("admin", "/admin/reports")).toBe("/admin/reports");
  });

  it("rewrites backend /admin paths for the staff portal", () => {
    expect(rewriteAdminPath("/admin/orders/42", "staff")).toBe("/staff/orders/42");
    expect(rewriteAdminPath("/admin", "staff")).toBe("/staff");
    expect(rewriteAdminPath("/admin/orders/42", "admin")).toBe("/admin/orders/42");
    expect(rewriteAdminPath("/books/7", "staff")).toBe("/books/7");
  });

  it("builds print paths for both portals and excludes /staff from analytics", () => {
    expect(staffPrintPath("invoice", [10, 11], true, "staff")).toBe("/staff/print?doc=invoice&ids=10,11&autoprint=1");
    expect(staffDailySalesPrintPath({ from: "2026-11-23" }, "staff")).toBe("/staff/print/daily-sales?from=2026-11-23");
    expect(cleanEvent({ type: "pageview", url: "https://bookly.test/staff/orders" })).toBeNull();
    expect(cleanEvent({ type: "pageview", url: "https://bookly.test/staff" })).toBeNull();
    expect(cleanEvent({ type: "pageview", url: "https://bookly.test/admin/orders" })).toBeNull();
    expect(cleanEvent({ type: "pageview", url: "https://bookly.test/books/1" })).not.toBeNull();
  });
});

describe("strict /staff and /admin route separation", () => {
  it("sends a signed-out visitor on /staff/orders to /staff/login (never /admin/login)", () => {
    renderPortals("/staff/orders?status=pending");
    expect(screen.getByTestId("where")).toHaveTextContent("/staff/login?next=%2Fstaff%2Forders%3Fstatus%3Dpending");
    expect(screen.getByRole("heading", { name: "Staff sign in" })).toBeInTheDocument();
  });

  it("redirects a signed-in staff member away from /admin/* to /staff", () => {
    signIn(staffUser);
    renderPortals("/admin/reports");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/staff$/);
    expect(screen.getByText("Staff home")).toBeInTheDocument();
  });

  it("redirects a signed-in admin away from /staff/* to /admin", () => {
    signIn(adminUser);
    renderPortals("/staff/orders");
    expect(screen.getByTestId("where")).toHaveTextContent(/^\/admin$/);
    expect(screen.getByText("Admin home")).toBeInTheDocument();
  });

  it("renders Staff badge and /staff/* sidebar links on /staff, and Admin badge and /admin/* links on /admin", () => {
    signIn(staffUser);
    const { unmount } = renderPortals("/staff");
    const staffNav = screen.getByRole("navigation", { name: "Staff" });
    expect(staffNav.querySelector('a[href="/staff/orders"]')).not.toBeNull();
    expect(staffNav.querySelector('a[href="/admin/orders"]')).toBeNull();
    expect(staffNav.querySelector('a[href="/staff/reports"]')).toBeNull();
    unmount();

    clearSession("staff");
    signIn(adminUser);
    renderPortals("/admin");
    const adminNav = screen.getByRole("navigation", { name: "Admin" });
    expect(adminNav.querySelector('a[href="/admin/orders"]')).not.toBeNull();
    expect(adminNav.querySelector('a[href="/admin/reports"]')).not.toBeNull();
    expect(adminNav.querySelector('a[href="/staff/orders"]')).toBeNull();
  });

  it("rejects a staff account on /admin/login with a direct link to /staff/login", async () => {
    const user = userEvent.setup();
    const loginSpy = vi.spyOn(staffAuthApi, "login").mockRejectedValue(
      new ApiError({
        kind: "forbidden",
        status: 403,
        message: "This is a staff account. Please sign in at the Staff portal instead.",
        data: { code: "wrong_portal", expected_portal: "staff" },
      }),
    );

    renderPortals("/admin/login");
    expect(screen.getByRole("heading", { name: "Admin sign in" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Work email"), "staff@bookly.test");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Staffpass123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(loginSpy).toHaveBeenCalledWith("staff@bookly.test", "Staffpass123", "admin");
    expect(await screen.findByText(/This is a staff account/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Go to Staff sign in →/ });
    expect(link).toHaveAttribute("href", "/staff/login");
    expect(getSession("staff")).toBeNull();
  });

  it("rejects an admin account on /staff/login and lets a staff account sign in to /staff", async () => {
    const user = userEvent.setup();
    const loginSpy = vi
      .spyOn(staffAuthApi, "login")
      .mockRejectedValueOnce(
        new ApiError({
          kind: "forbidden",
          status: 403,
          message: "This is an administrator account. Please sign in at the Admin portal instead.",
          data: { code: "wrong_portal", expected_portal: "admin" },
        }),
      )
      .mockResolvedValueOnce({ two_factor_required: true, challenge_token: "c-staff", expires_in: 300 });
    vi.spyOn(staffAuthApi, "challenge").mockResolvedValue({
      staff: staffUser,
      token: "staff-tok",
      token_type: "Bearer",
      expires_at: null,
    });

    renderPortals("/staff/login?next=%2Fstaff%2Forders");
    await user.type(screen.getByLabelText("Work email"), "admin@bookly.test");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Adminpass123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(loginSpy).toHaveBeenNthCalledWith(1, "admin@bookly.test", "Adminpass123", "staff");
    expect(await screen.findByText(/This is an administrator account/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Admin sign in →/ })).toHaveAttribute("href", "/admin/login");

    // Now sign in as a real staff account on /staff/login
    const emailInput = screen.getByLabelText("Work email");
    await user.clear(emailInput);
    await user.type(emailInput, "staff@bookly.test");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "Staffpass123");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("heading", { name: "Enter your code" })).toBeInTheDocument();
    await user.keyboard("123456");
    await user.click(screen.getByRole("button", { name: "Verify and sign in" }));

    await waitFor(() => expect(screen.getByTestId("where")).toHaveTextContent("/staff/orders"));
    expect(getSession<StaffUser>("staff")?.user.role).toBe("staff");
  });
});
