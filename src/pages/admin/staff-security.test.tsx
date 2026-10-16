import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { staffApi, type StaffLoginHistoryItem, type StaffSession, type StaffUser } from "@/api/endpoints/staff";
import { opsApi, type StaffMember } from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireAdminRole, RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import MembersAdminPage from "./MembersAdminPage";
import StaffSecurityPage from "./StaffSecurityPage";

const staff: StaffUser = {
  id: 2,
  name: "Demo Staff",
  email: "staff@bookly.test",
  role: "staff",
  two_factor_enabled: true,
  permissions: ["orders:view", "orders:manage"],
};

const admin: StaffUser = {
  id: 1,
  name: "Demo Admin",
  email: "admin@bookly.test",
  role: "admin",
  two_factor_enabled: true,
};

const signIn = (user: StaffUser) => setSession("staff", { token: "t", expiresAt: null, user });
const page = <T,>(data: T[], meta: object = {}) =>
  ({ data, links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length, ...meta } }) as never;

const mockSessions: StaffSession[] = [
  {
    id: 10,
    device: "Chrome on Windows",
    ip_address: "127.0.0.1",
    last_used_at: "2026-10-16T09:00:00Z",
    created_at: "2026-10-16T08:00:00Z",
    is_current: true,
  },
  {
    id: 11,
    device: "Safari on iOS",
    ip_address: "192.168.1.5",
    last_used_at: "2026-10-15T12:00:00Z",
    created_at: "2026-10-15T11:00:00Z",
    is_current: false,
  },
];

const mockLoginHistory: StaffLoginHistoryItem[] = [
  {
    id: 101,
    staff_user_id: 2,
    device: "Chrome on Windows",
    ip_address: "127.0.0.1",
    user_agent: "Mozilla/5.0",
    status: "success",
    created_at: "2026-10-16T09:00:00Z",
  },
  {
    id: 100,
    staff_user_id: 2,
    device: "Firefox on macOS",
    ip_address: "10.0.0.1",
    user_agent: "Mozilla/5.0",
    status: "failed_password",
    created_at: "2026-10-16T08:55:00Z",
  },
];

const app = (route: string) =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/login" element={<p>Staff Login Page</p>} />
        <Route element={<RequireStaff />}>
          <Route path="/admin/security" element={<StaffSecurityPage />} />
          <Route element={<RequireAdminRole />}>
            <Route path="/admin/members" element={<MembersAdminPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>,
    { route },
  );

describe("Staff Security and Sessions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearSession("staff");
  });

  it("renders active sessions, permissions chips, and login history", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "sessions").mockResolvedValue(mockSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page(mockLoginHistory));

    app("/admin/security");

    // Profile card with permissions
    expect(await screen.findByRole("heading", { name: "Demo Staff" })).toBeInTheDocument();
    expect(screen.getByText("orders:view")).toBeInTheDocument();
    expect(screen.getByText("orders:manage")).toBeInTheDocument();

    // Active sessions
    expect(await screen.findByText("Safari on iOS")).toBeInTheDocument();
    expect(screen.getByText("Current session")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revoke session on Safari on iOS/i })).toBeInTheDocument();

    // Login history
    expect(await screen.findByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Wrong password")).toBeInTheDocument();
  });

  it("can revoke another session", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "sessions").mockResolvedValue(mockSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page([]));
    const revokeOne = vi.spyOn(staffApi, "revokeSession").mockResolvedValue({ message: "Session revoked." });

    app("/admin/security");

    const revokeBtn = await screen.findByRole("button", { name: /Revoke session on Safari on iOS/i });
    await userEvent.click(revokeBtn);

    await waitFor(() => expect(revokeOne).toHaveBeenCalledWith(11));
    expect(await screen.findByText("Session revoked")).toBeInTheDocument();
  });

  it("can revoke all other sessions", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "sessions").mockResolvedValue(mockSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page([]));
    const revokeOthers = vi.spyOn(staffApi, "revokeOtherSessions").mockResolvedValue({ message: "Other sessions revoked." });

    app("/admin/security");

    const btn = await screen.findByRole("button", { name: "Sign out other sessions" });
    await userEvent.click(btn);

    await waitFor(() => expect(revokeOthers).toHaveBeenCalled());
    expect(await screen.findByText("Other active sessions revoked")).toBeInTheDocument();
  });

  it("can sign out everywhere with confirmation", async () => {
    signIn(staff);
    vi.spyOn(staffApi, "sessions").mockResolvedValue(mockSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page([]));
    const revokeAll = vi.spyOn(staffApi, "revokeAllSessions").mockResolvedValue({ message: "All sessions revoked." });

    app("/admin/security");

    const btn = await screen.findByRole("button", { name: /Sign out everywhere/i });
    await userEvent.click(btn);

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/Sign out of all sessions\?/i)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Sign out everywhere" }));

    await waitFor(() => expect(revokeAll).toHaveBeenCalled());
    expect(await screen.findByText("Staff Login Page")).toBeInTheDocument();
  });
});

describe("Admin Member Permissions & Login History", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearSession("staff");
  });

  const memberStaff: StaffMember = {
    ...staff,
    is_active: true,
    permissions: ["orders:view", "orders:manage"],
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  };

  it("admin can view member login history dialog", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "members").mockResolvedValue(page([memberStaff]));
    const historySpy = vi.spyOn(opsApi, "memberLoginHistory").mockResolvedValue(page(mockLoginHistory));

    app("/admin/members");

    await userEvent.click(await screen.findByRole("button", { name: "Actions for Demo Staff" }));
    const historyItem = screen.getByRole("menuitem", { name: "View login history" });
    await userEvent.click(historyItem);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Login History: Demo Staff")).toBeInTheDocument();
    await waitFor(() => expect(historySpy).toHaveBeenCalledWith(2, { page: 1, per_page: 15 }));
    expect(within(dialog).getByText("Chrome on Windows")).toBeInTheDocument();
  });

  it("admin can edit member granular permissions", async () => {
    signIn(admin);
    vi.spyOn(opsApi, "members").mockResolvedValue(page([memberStaff]));
    const updateSpy = vi.spyOn(opsApi, "updateMember").mockResolvedValue({
      ...memberStaff,
      permissions: ["orders:view"],
    });

    app("/admin/members");

    await userEvent.click(await screen.findByRole("button", { name: "Actions for Demo Staff" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit name or role" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Granular Permissions")).toBeInTheDocument();

    // Toggle off "orders:manage"
    const manageCheckbox = within(dialog).getByLabelText(/Manage order statuses & notes/i);
    await userEvent.click(manageCheckbox);

    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateSpy).toHaveBeenCalledWith(2, {
        name: "Demo Staff",
        role: "staff",
        permissions: ["orders:view"],
      }),
    );
  });
});
