import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  History,
  Laptop,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { staffApi, staffQueries, type StaffLoginHistoryItem, type StaffSession } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff, useStaffSignOut } from "@/features/admin/staffSession";
import { orderDate } from "@/features/orders/format";
import { toast } from "@/stores/toast";

function deviceIcon(device: string | null) {
  if (!device) return Globe;
  const d = device.toLowerCase();
  if (d.includes("iphone") || d.includes("android") || d.includes("mobile") || d.includes("ipad")) {
    return Smartphone;
  }
  return Laptop;
}

function statusBadge(status: StaffLoginHistoryItem["status"]) {
  switch (status) {
    case "success":
      return (
        <Badge tone="success" shape="tint" className="gap-1">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Success
        </Badge>
      );
    case "failed_password":
      return (
        <Badge tone="danger" shape="tint" className="gap-1">
          <XCircle className="size-3.5" aria-hidden="true" />
          Wrong password
        </Badge>
      );
    case "failed_2fa":
      return (
        <Badge tone="warning" shape="tint" className="gap-1">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          Invalid 2FA code
        </Badge>
      );
    case "deactivated":
      return (
        <Badge tone="danger" shape="outline" className="gap-1">
          <ShieldAlert className="size-3.5" aria-hidden="true" />
          Deactivated
        </Badge>
      );
    default:
      return <Badge tone="neutral">{status}</Badge>;
  }
}

export default function StaffSecurityPage() {
  const staff = useStaff()?.user;
  const queryClient = useQueryClient();
  const signOut = useStaffSignOut();
  const navigate = useNavigate();
  const [historyPage, setHistoryPage] = useState(1);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);

  const sessionsQuery = useQuery(staffQueries.sessions());
  const historyQuery = useQuery(staffQueries.loginHistory({ page: historyPage, per_page: 15 }));

  const sessions = sessionsQuery.data ?? [];
  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  const revokeOne = useMutation({
    mutationFn: (id: number) => staffApi.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "sessions"] });
      toast.success("Session revoked");
    },
    onError: () => toast.error("Couldn't revoke session"),
  });

  const revokeOthers = useMutation({
    mutationFn: () => staffApi.revokeOtherSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "sessions"] });
      toast.success("Other active sessions revoked");
    },
    onError: () => toast.error("Couldn't revoke other sessions"),
  });

  const revokeAll = useMutation({
    mutationFn: () => staffApi.revokeAllSessions(),
    onSuccess: async () => {
      toast.success("All sessions signed out");
      await signOut();
      navigate("/admin/login", { replace: true });
    },
    onError: () => toast.error("Couldn't sign out sessions"),
  });

  const historyList = historyQuery.data?.data ?? [];
  const historyMeta = historyQuery.data?.meta;

  return (
    <AdminPage
      title="Security & Sessions"
      lead="Manage active sessions, view authentication history, and check account privileges."
    >
      {/* Account Overview Card */}
      <section aria-labelledby="staff-account-title" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            <h2 id="staff-account-title" className="font-display text-xl font-bold tracking-tight">
              {staff?.name}
            </h2>
            <p className="text-sm text-muted-foreground">{staff?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={staff?.role === "admin" ? "info" : "neutral"} shape="tint">
              {staff?.role === "admin" ? "Admin" : "Staff Member"}
            </Badge>
            {staff?.two_factor_enabled ? (
              <Badge tone="success" shape="tint" className="gap-1">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Two-factor enabled
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="grid gap-2 border-t border-border pt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Permissions</p>
          <div className="flex flex-wrap gap-1.5">
            {staff?.role === "admin" ? (
              <Badge tone="neutral" shape="outline">
                All Permissions (Full Administrator Access)
              </Badge>
            ) : staff?.permissions && staff.permissions.length > 0 ? (
              staff.permissions.map((p) => (
                <Badge key={p} tone="neutral" shape="outline">
                  {p}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Default staff permissions</p>
            )}
          </div>
        </div>
      </section>

      {/* Active Sessions Card */}
      <section aria-labelledby="active-sessions-title" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="active-sessions-title" className="font-display text-xl font-bold tracking-tight">
              Active Sessions
            </h2>
            <p className="text-sm text-muted-foreground">
              Devices currently signed in to your account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={otherSessionsCount === 0 || revokeOthers.isPending}
              loading={revokeOthers.isPending}
              onClick={() => revokeOthers.mutate()}
            >
              Sign out other sessions
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={revokeAll.isPending}
              onClick={() => setConfirmRevokeAll(true)}
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out everywhere
            </Button>
          </div>
        </div>

        <ListState
          query={sessionsQuery}
          empty={{
            when: sessions.length === 0,
            icon: Laptop,
            title: "No active sessions",
            description: "No active sessions were found.",
          }}
        >
          <div className="grid gap-3">
            {sessions.map((session: StaffSession) => {
              const Icon = deviceIcon(session.device);
              return (
                <div
                  key={session.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="grid size-10 place-items-center rounded-lg bg-surface-2 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div className="grid gap-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-foreground">{session.device || "Unknown Device"}</span>
                        {session.is_current ? (
                          <Badge tone="success" shape="tint">
                            Current session
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {session.ip_address ? `IP: ${session.ip_address} • ` : ""}
                        Last active: {session.last_used_at ? orderDate(session.last_used_at) : "Recently"}
                      </p>
                    </div>
                  </div>

                  {!session.is_current ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      loading={revokeOne.isPending && revokeOne.variables === session.id}
                      onClick={() => revokeOne.mutate(session.id)}
                      aria-label={`Revoke session on ${session.device}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Revoke
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </ListState>
      </section>

      {/* Login History Section */}
      <section aria-labelledby="login-history-title" className="grid gap-4">
        <div>
          <h2 id="login-history-title" className="font-display text-xl font-bold tracking-tight">
            Recent Login History
          </h2>
          <p className="text-sm text-muted-foreground">
            Audit trail of recent successful and failed sign-in attempts for your account.
          </p>
        </div>

        <ListState
          query={historyQuery}
          empty={{
            when: historyList.length === 0,
            icon: History,
            title: "No login history yet",
            description: "Past login attempts will appear here.",
          }}
        >
          <TableCard minWidth={600}>
            <thead className={thead}>
              <tr>
                <th scope="col" className={th}>Status</th>
                <th scope="col" className={th}>Device</th>
                <th scope="col" className={th}>IP Address</th>
                <th scope="col" className={th}>Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {historyList.map((item: StaffLoginHistoryItem) => (
                <tr key={item.id} className="hover:bg-surface-2/60">
                  <td className={td}>{statusBadge(item.status)}</td>
                  <td className={`${td} font-medium`}>{item.device || "Unknown"}</td>
                  <td className={`${td} font-mono text-xs text-muted-foreground`}>{item.ip_address || "—"}</td>
                  <td className={`${td} text-muted-foreground text-sm`}>{orderDate(item.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </TableCard>
        </ListState>
        {historyMeta && historyMeta.last_page && historyMeta.last_page > 1 ? (
          <Pagination
            page={historyMeta.current_page ?? 1}
            lastPage={historyMeta.last_page}
            onPageChange={(p) => setHistoryPage(p)}
          />
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmRevokeAll}
        onOpenChange={(open) => !open && setConfirmRevokeAll(false)}
        title="Sign out of all sessions?"
        description="This will immediately revoke all tokens on all devices, including this current device. You will need to sign in again with your password and 2FA code."
        confirmLabel="Sign out everywhere"
        loading={revokeAll.isPending}
        onConfirm={() => revokeAll.mutate()}
      />
    </AdminPage>
  );
}
