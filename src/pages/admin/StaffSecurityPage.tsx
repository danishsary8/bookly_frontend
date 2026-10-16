import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  History,
  KeyRound,
  Laptop,
  LogOut,
  Monitor,
  ShieldCheck,
  Smartphone,
  Trash2,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { staffApi, staffKeys, staffQueries, type StaffLoginHistoryItem, type StaffSession } from "@/api/endpoints/staff";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff, useStaffSignOut } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDateTime } from "@/features/orders/format";
import { toast } from "@/stores/toast";

function deviceIcon(device: string) {
  const d = device.toLowerCase();
  if (d.includes("iphone") || d.includes("android") || d.includes("mobile") || d.includes("ios")) {
    return <Smartphone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  }
  if (d.includes("mac") || d.includes("windows") || d.includes("linux")) {
    return <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
  }
  return <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />;
}

function loginStatusBadge(status: StaffLoginHistoryItem["status"]) {
  switch (status) {
    case "success":
      return (
        <Badge tone="success" shape="tint" className="gap-1 font-medium">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Success
        </Badge>
      );
    case "failed_password":
      return (
        <Badge tone="danger" shape="tint" className="gap-1 font-medium">
          <XCircle className="size-3.5" aria-hidden="true" />
          Wrong password
        </Badge>
      );
    case "failed_2fa":
      return (
        <Badge tone="danger" shape="tint" className="gap-1 font-medium">
          <AlertTriangle className="size-3.5" aria-hidden="true" />
          Invalid 2FA code
        </Badge>
      );
    case "deactivated":
      return (
        <Badge tone="neutral" shape="tint" className="gap-1 font-medium">
          <Ban className="size-3.5" aria-hidden="true" />
          Deactivated
        </Badge>
      );
    default:
      return (
        <Badge tone="neutral" shape="tint">
          {status}
        </Badge>
      );
  }
}

export default function StaffSecurityPage() {
  const session = useStaff();
  const user = session?.user;
  const signOut = useStaffSignOut();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { page, hrefFor } = useListParams();

  const sessionsQuery = useQuery(staffQueries.sessions());
  const historyQuery = useQuery(staffQueries.loginHistory({ page, per_page: 15 }));

  const [revokingSession, setRevokingSession] = useState<StaffSession | null>(null);
  const [confirmSignOutEverywhere, setConfirmSignOutEverywhere] = useState(false);

  const revokeSessionMutation = useMutation({
    mutationFn: (id: number) => staffApi.revokeSession(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.sessions() });
      toast.success("Session signed out successfully");
      setRevokingSession(null);
    },
    onError: () => toast.error({ title: "Could not sign out session" }),
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => staffApi.revokeOtherSessions(),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.sessions() });
      toast.success({
        title: "Signed out other sessions",
        description: `${res.revoked_count} other session${res.revoked_count === 1 ? "" : "s"} revoked.`,
      });
    },
    onError: () => toast.error({ title: "Could not sign out other sessions" }),
  });

  const revokeAllMutation = useMutation({
    mutationFn: () => staffApi.revokeAllSessions(),
    onSuccess: async () => {
      toast.success("All sessions signed out. Please sign in again.");
      await signOut();
      navigate("/admin/login", { replace: true });
    },
    onError: () => toast.error({ title: "Could not sign out of all sessions" }),
  });

  const sessions: StaffSession[] = sessionsQuery.data ?? [];
  const otherSessions = sessions.filter((s) => !s.is_current);
  const historyList = historyQuery.data?.data ?? [];
  const historyMeta = historyQuery.data?.meta;

  return (
    <AdminPage
      title="Security & Active Sessions"
      lead="View and manage active devices connected to your staff account, and review sign-in attempts."
    >
      <div className="grid gap-8">
        {/* Account Overview & 2FA Status */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-lapis-tint text-primary">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">Account Protection</h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" shape="tint" className="gap-1.5 font-medium">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Two-Step Verification Enforced
              </Badge>
              <Badge tone={user?.role === "admin" ? "info" : "neutral"} shape="tint">
                {user?.role === "admin" ? "Admin" : "Staff"}
              </Badge>
            </div>
          </div>
        </section>

        {/* Active Sessions */}
        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Active Sessions</h2>
              <p className="text-sm text-muted-foreground">Devices currently signed into your staff account.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeOthersMutation.mutate()}
                loading={revokeOthersMutation.isPending}
                disabled={otherSessions.length === 0}
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sign out other sessions
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmSignOutEverywhere(true)}
              >
                Sign out everywhere
              </Button>
            </div>
          </div>

          <ListState
            query={sessionsQuery}
            empty={{
              when: sessions.length === 0,
              icon: Laptop,
              title: "No active sessions found",
              description: "You have no active sessions recorded.",
            }}
          >
            <TableCard minWidth={600}>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>
                    Device
                  </th>
                  <th scope="col" className={th}>
                    IP Address
                  </th>
                  <th scope="col" className={th}>
                    Signed In
                  </th>
                  <th scope="col" className={th}>
                    Last Active
                  </th>
                  <th scope="col" className={`${th} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessions.map((s) => (
                  <tr key={s.id} className={s.is_current ? "bg-primary/5" : "hover:bg-surface-2/60"}>
                    <td className={`${td} font-medium`}>
                      <div className="flex items-center gap-2.5">
                        {deviceIcon(s.device)}
                        <span>{s.device}</span>
                        {s.is_current ? (
                          <Badge tone="info" shape="outline">
                            Current session
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className={`${td} text-sm text-muted-foreground`}>{s.ip_address ?? "—"}</td>
                    <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>
                      {orderDateTime(s.created_at)}
                    </td>
                    <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>
                      {s.is_current ? "Active now" : orderDateTime(s.last_used_at ?? s.created_at)}
                    </td>
                    <td className={`${td} text-right`}>
                      {s.is_current ? null : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokingSession(s)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          <span className="sr-only">Sign out</span>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </ListState>
        </section>

        {/* Login History */}
        <section className="grid gap-3">
          <div className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold">Sign-in History</h2>
              <p className="text-sm text-muted-foreground">Recent sign-in attempts for your account.</p>
            </div>
          </div>

          <ListState
            query={historyQuery}
            empty={{
              when: historyList.length === 0,
              icon: KeyRound,
              title: "No sign-in history",
              description: "No sign-in events have been recorded yet.",
            }}
          >
            <TableCard stale={historyQuery.isPlaceholderData} minWidth={650}>
              <thead className={thead}>
                <tr>
                  <th scope="col" className={th}>
                    Time
                  </th>
                  <th scope="col" className={th}>
                    Status
                  </th>
                  <th scope="col" className={th}>
                    Device / Browser
                  </th>
                  <th scope="col" className={th}>
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {historyList.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-2/60">
                    <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>
                      {orderDateTime(item.created_at)}
                    </td>
                    <td className={td}>{loginStatusBadge(item.status)}</td>
                    <td className={`${td} text-sm font-medium`}>
                      <div className="flex items-center gap-2">
                        {deviceIcon(item.device ?? item.user_agent ?? "")}
                        <span className="truncate max-w-xs">{item.device ?? item.user_agent ?? "Unknown"}</span>
                      </div>
                    </td>
                    <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>
                      {item.ip_address ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </ListState>
          <Pagination page={historyMeta?.current_page ?? 1} lastPage={historyMeta?.last_page ?? 1} hrefFor={hrefFor} />
        </section>
      </div>

      {/* Revoke Single Session Confirm */}
      <ConfirmDialog
        open={revokingSession !== null}
        onOpenChange={(open) => !open && setRevokingSession(null)}
        title="Sign out this session?"
        description={`This will immediately sign out ${revokingSession?.device ?? "the selected device"}. It will require signing in again to access the admin.`}
        confirmLabel="Sign out"
        loading={revokeSessionMutation.isPending}
        onConfirm={() => revokingSession && revokeSessionMutation.mutate(revokingSession.id)}
      />

      {/* Revoke All Sessions Confirm */}
      <ConfirmDialog
        open={confirmSignOutEverywhere}
        onOpenChange={(open) => !open && setConfirmSignOutEverywhere(false)}
        title="Sign out everywhere?"
        description="This will sign out all active sessions on all devices, including this one. You will be redirected to the sign-in page."
        confirmLabel="Sign out everywhere"
        loading={revokeAllMutation.isPending}
        onConfirm={() => revokeAllMutation.mutate()}
      />
    </AdminPage>
  );
}
