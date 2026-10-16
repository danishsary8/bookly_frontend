import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import {
  staffApi,
  type StaffLoginHistoryItem,
  type StaffSession,
  type StaffUser,
} from "@/api/endpoints/staff";
import { opsApi, type StaffMember } from "@/api/endpoints/staffOps";
import { clearSession, setSession } from "@/api/session";
import { Toaster } from "@/components/ui/toaster";
import { RequireAdminRole, RequireStaff } from "@/routes/adminGuards";
import { renderWithProviders } from "@/test/render";
import { dismissToast } from "@/stores/toast";
import MembersAdminPage from "./MembersAdminPage";
import StaffSecurityPage from "./StaffSecurityPage";

const adminUser: StaffUser = {
  id: 1,
  name: "Super Admin",
  email: "admin@bookly.test",
  role: "admin",
  two_factor_enabled: true,
  permissions: ["*"],
};

const staffMember: StaffMember = {
  id: 2,
  name: "Alice Editor",
  email: "alice@bookly.test",
  role: "staff",
  two_factor_enabled: true,
  is_active: true,
  permissions: ["orders:view", "orders:manage"],
  updated_at: "2026-10-15T10:00:00Z",
};

const sampleSessions: StaffSession[] = [
  {
    id: 101,
    device: "Chrome on Windows",
    ip_address: "192.168.1.10",
    created_at: "2026-10-16T08:00:00Z",
    last_used_at: "2026-10-16T09:30:00Z",
    is_current: true,
  },
  {
    id: 102,
    device: "Safari on iPhone",
    ip_address: "192.168.1.25",
    created_at: "2026-10-15T12:00:00Z",
    last_used_at: "2026-10-15T14:20:00Z",
    is_current: false,
  },
];

const sampleHistory: StaffLoginHistoryItem[] = [
  {
    id: 201,
    staff_user_id: 1,
    ip_address: "192.168.1.10",
    user_agent: "Mozilla/5.0 (X11; Linux x86_64)",
    device: "Edge on Linux",
    status: "success",
    created_at: "2026-10-16T08:00:00Z",
  },
  {
    id: 202,
    staff_user_id: 1,
    ip_address: "192.168.1.50",
    user_agent: "Mozilla/5.0 (Android 14; Mobile)",
    device: "Firefox on Android",
    status: "failed_password",
    created_at: "2026-10-16T07:45:00Z",
  },
];

const page = <T,>(data: T[], meta: object = {}) =>
  ({
    data,
    links: {},
    meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length, ...meta },
  }) as never;

function Where() {
  const { pathname, search } = useLocation();
  return <p data-testid="where">{pathname + search}</p>;
}

const renderStaffSecurity = (initialRoute = "/admin/security") =>
  renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/login" element={<p>Staff Sign In</p>} />
        <Route element={<RequireStaff />}>
          <Route path="/admin/security" element={<StaffSecurityPage />} />
          <Route element={<RequireAdminRole />}>
            <Route path="/admin/members" element={<MembersAdminPage />} />
          </Route>
        </Route>
      </Routes>
      <Where />
      <Toaster />
    </>,
    { route: initialRoute }
  );

describe("StaffSecurityPage", () => {
  afterEach(() => {
    clearSession("staff");
    dismissToast();
    vi.restoreAllMocks();
  });

  it("lists active sessions and shows current session badge", async () => {
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(staffApi, "sessions").mockResolvedValue(sampleSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page(sampleHistory));

    renderStaffSecurity("/admin/security");

    expect(await screen.findByRole("heading", { name: "Security & Active Sessions" })).toBeInTheDocument();
    expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText("Current session")).toBeInTheDocument();
    expect(screen.getByText("Safari on iPhone")).toBeInTheDocument();
  });

  it("can revoke another session after confirmation", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(staffApi, "sessions").mockResolvedValue(sampleSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page(sampleHistory));
    const revokeSessionSpy = vi.spyOn(staffApi, "revokeSession").mockResolvedValue({ message: "Session revoked." });

    renderStaffSecurity("/admin/security");

    expect(await screen.findByText("Safari on iPhone")).toBeInTheDocument();

    const signoutBtn = await screen.findByRole("button", { name: "Sign out" });
    await user.click(signoutBtn);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveTextContent("Sign out this session?");

    await user.click(within(dialog).getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(revokeSessionSpy).toHaveBeenCalledWith(102);
    });
  });

  it("can revoke other sessions in bulk", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(staffApi, "sessions").mockResolvedValue(sampleSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page(sampleHistory));
    const revokeOthersSpy = vi.spyOn(staffApi, "revokeOtherSessions").mockResolvedValue({
      message: "Other sessions revoked.",
      revoked_count: 1,
    });

    renderStaffSecurity("/admin/security");

    expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    const revokeOthersBtn = await screen.findByRole("button", { name: /sign out other sessions/i });
    expect(revokeOthersBtn).toBeEnabled();

    await user.click(revokeOthersBtn);

    await waitFor(() => {
      expect(revokeOthersSpy).toHaveBeenCalled();
    });
  });

  it("displays login history events with status badges", async () => {
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(staffApi, "sessions").mockResolvedValue(sampleSessions);
    vi.spyOn(staffApi, "loginHistory").mockResolvedValue(page(sampleHistory));

    renderStaffSecurity("/admin/security");

    expect(await screen.findByText("Edge on Linux")).toBeInTheDocument();
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("Wrong password")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.50")).toBeInTheDocument();
  });
});

describe("MembersAdminPage permissions & history", () => {
  afterEach(() => {
    clearSession("staff");
    dismissToast();
    vi.restoreAllMocks();
  });

  it("allows selecting granular permissions when editing a staff member", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(opsApi, "members").mockResolvedValue(page([staffMember]));
    const updateSpy = vi.spyOn(opsApi, "updateMember").mockResolvedValue({
      ...staffMember,
      permissions: ["orders:view", "orders:manage", "catalog:view"],
    });

    renderStaffSecurity("/admin/members");

    expect(await screen.findByText("Alice Editor")).toBeInTheDocument();

    const actionsBtn = screen.getByRole("button", { name: "Actions for Alice Editor" });
    await user.click(actionsBtn);

    const editBtn = await screen.findByRole("menuitem", { name: /edit name or role/i });
    await user.click(editBtn);

    const dialog = await screen.findByRole("dialog", { name: "Edit Alice Editor" });
    expect(dialog).toBeInTheDocument();

    // Checkbox for "View Catalog"
    const catalogViewCheck = within(dialog).getByRole("checkbox", { name: /view catalog/i });
    expect(catalogViewCheck).not.toBeChecked();

    await user.click(catalogViewCheck);
    expect(catalogViewCheck).toBeChecked();

    const saveBtn = within(dialog).getByRole("button", { name: "Save" });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          permissions: expect.arrayContaining(["orders:view", "orders:manage", "catalog:view"]),
        })
      );
    });
  });

  it("can view member login history modal", async () => {
    const user = userEvent.setup();
    setSession("staff", { token: "token-1", expiresAt: null, user: adminUser });
    vi.spyOn(opsApi, "members").mockResolvedValue(page([staffMember]));
    const memberHistorySpy = vi.spyOn(opsApi, "memberLoginHistory").mockResolvedValue(page(sampleHistory));

    renderStaffSecurity("/admin/members");

    expect(await screen.findByText("Alice Editor")).toBeInTheDocument();

    const actionsBtn = screen.getByRole("button", { name: "Actions for Alice Editor" });
    await user.click(actionsBtn);

    const historyBtn = await screen.findByRole("menuitem", { name: /view sign-in history/i });
    await user.click(historyBtn);

    const historyDialog = await screen.findByRole("dialog", { name: /sign-in history for alice editor/i });
    expect(historyDialog).toBeInTheDocument();

    expect(memberHistorySpy).toHaveBeenCalledWith(2, { page: 1, per_page: 10 });
    expect(within(historyDialog).getByText("192.168.1.50")).toBeInTheDocument();
  });
});
