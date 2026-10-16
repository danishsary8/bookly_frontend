import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  History,
  KeyRound,
  Laptop,
  MailPlus,
  Monitor,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { DEFAULT_STAFF_PERMISSIONS, type StaffLoginHistoryItem, type StaffRole } from "@/api/endpoints/staff";
import { opsApi, opsQueries, type StaffMember } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { SelectField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { AdminPage } from "@/features/admin/AdminPage";
import { ListState, SearchBox, Segmented, TableCard, td, th, thead } from "@/features/admin/listKit";
import { useStaff } from "@/features/admin/staffSession";
import { useListParams } from "@/features/admin/useListParams";
import { orderDate, orderDateTime } from "@/features/orders/format";
import { rangeSummary } from "@/lib/pagination";
import { toast } from "@/stores/toast";

const ROLES: Record<StaffRole, { label: string; detail: string }> = {
  staff: { label: "Staff", detail: "Orders, returns, reviews, coupons, customers and the catalogue." },
  admin: { label: "Admin", detail: "Everything staff can do, plus staff members, exchange rates, the audit log, exports and deleting." },
};

const AVAILABLE_PERMISSIONS: Array<{ key: string; label: string; detail: string }> = [
  { key: "orders:view", label: "View Orders", detail: "Browse and view details of customer orders and return requests." },
  { key: "orders:manage", label: "Manage Orders", detail: "Update order statuses, process refunds, and add staff notes." },
  { key: "catalog:view", label: "View Catalog", detail: "Browse books, variants, stock, and categories." },
  { key: "catalog:manage", label: "Manage Catalog", detail: "Create, edit, and restock catalog inventory." },
  { key: "customers:view", label: "View Customers", detail: "View customer profiles, tags, and orders." },
  { key: "customers:manage", label: "Manage Customers", detail: "Add customer notes, edit tags, and manage customer accounts." },
  { key: "reviews:manage", label: "Manage Reviews", detail: "Approve, hide, or moderate customer book reviews." },
];

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

const SHOW = [
  { value: "all", label: "All" },
  { value: "admin", label: "Admins" },
  { value: "staff", label: "Staff" },
  { value: "deactivated", label: "Deactivated" },
] as const;
type Show = (typeof SHOW)[number]["value"];

/** The API puts self / last-admin refusals on the `staff` field. */
const refusal = (error: unknown) => {
  const apiError = ApiError.from(error);
  return apiError.field("staff") ?? apiError.message;
};

const itemClass = "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-md px-3 text-[15px] text-foreground outline-none data-[highlighted]:bg-secondary";

type Values = { name: string; email: string; role: StaffRole; permissions: string[] };

/** Invite (member = null) or edit name, role, and permissions. */
function MemberDialog({ member, isSelf, onClose }: { member: StaffMember | null; isSelf: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [v, setV] = useState<Values>({
    name: member?.name ?? "",
    email: member?.email ?? "",
    role: member?.role ?? "staff",
    permissions: member?.permissions ? [...member.permissions] : [...DEFAULT_STAFF_PERMISSIONS],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values | "form", string>>>({});
  const set = (patch: Partial<Values>) => setV((prev) => ({ ...prev, ...patch }));

  const togglePermission = (perm: string) => {
    setV((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(perm)
        ? prev.permissions.filter((p) => p !== perm)
        : [...prev.permissions, perm],
    }));
  };

  const selectAllPermissions = () => {
    setV((prev) => ({ ...prev, permissions: AVAILABLE_PERMISSIONS.map((p) => p.key) }));
  };

  const clearAllPermissions = () => {
    setV((prev) => ({ ...prev, permissions: [] }));
  };

  const isCustomPermissions =
    v.role === "staff" &&
    (v.permissions.length !== DEFAULT_STAFF_PERMISSIONS.length ||
      !DEFAULT_STAFF_PERMISSIONS.every((p) => v.permissions.includes(p)));

  const save = useMutation({
    mutationFn: () =>
      member
        ? opsApi.updateMember(member.id, {
            name: v.name.trim(),
            role: v.role,
            permissions: v.role === "staff" ? v.permissions : undefined,
          })
        : opsApi.inviteMember({
            name: v.name.trim(),
            email: v.email.trim(),
            role: v.role,
            ...(isCustomPermissions ? { permissions: v.permissions } : {}),
          }),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "members"] });
      toast.success(
        member
          ? { title: `${saved.name} saved` }
          : { title: `Invitation sent to ${saved.email}`, description: "They get a 6-digit setup code, valid for 72 hours." }
      );
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      const next: typeof errors = {};
      for (const f of ["name", "email", "role"] as const) {
        const m = apiError.field(f);
        if (m) next[f] = m;
      }
      if (!Object.keys(next).length) next.form = refusal(err);
      setErrors(next);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const e: typeof errors = {};
    if (!v.name.trim()) e.name = "Enter their name.";
    if (!member && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter an email address like name@example.com.";
    setErrors(e);
    if (!Object.keys(e).length) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent size="md">
        <form onSubmit={submit} noValidate className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{member ? `Edit ${member.name}` : "Invite a staff member"}</DialogTitle>
            <DialogDescription>
              {member
                ? "Changing the role or permissions invalidates active sessions so new access applies at their next sign-in."
                : "We email them a 6-digit setup code. They open staff sign-in, choose “Forgot password?”, then “I already have a code”, and set a password and two-step verification."}
            </DialogDescription>
          </DialogHeader>
          {errors.form ? <FormAlert title={errors.form} /> : null}
          <TextField label="Name" value={v.name} onChange={(e) => set({ name: e.target.value })} error={errors.name} autoComplete="off" maxLength={150} />
          {member ? null : <TextField label="Email" type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} error={errors.email} autoComplete="off" maxLength={190} />}
          <SelectField
            label="Role"
            value={v.role}
            onChange={(e) => set({ role: e.target.value as StaffRole })}
            error={errors.role}
            disabled={isSelf}
            hint={isSelf ? "You can't change your own role." : ROLES[v.role].detail}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </SelectField>

          {v.role === "staff" ? (
            <div className="grid gap-3 rounded-lg border border-border p-4 bg-surface-2/40">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Permissions</h3>
                  <p className="text-xs text-muted-foreground">Select what this staff member can view and manage.</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllPermissions}
                    className="font-medium text-primary hover:underline outline-none"
                  >
                    Select all
                  </button>
                  <span className="text-muted-foreground">·</span>
                  <button
                    type="button"
                    onClick={clearAllPermissions}
                    className="font-medium text-muted-foreground hover:text-foreground outline-none"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="grid gap-2.5">
                {AVAILABLE_PERMISSIONS.map((perm) => {
                  const checked = v.permissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className="flex items-start gap-3 rounded-md p-2 hover:bg-secondary/60 cursor-pointer select-none transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePermission(perm.key)}
                        className="mt-0.5 size-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="grid gap-0.5">
                        <span className="text-sm font-medium leading-none">{perm.label}</span>
                        <span className="text-xs text-muted-foreground">{perm.detail}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-info/30 bg-info/5 p-3.5 text-xs text-muted-foreground">
              Admins automatically have unrestricted access to all operations, settings, exchange rates, audit logs, and member management.
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={save.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" loading={save.isPending}>
              {member ? "Save" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberLoginHistoryDialog({ member, onClose }: { member: StaffMember; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const historyQuery = useQuery(opsQueries.memberLoginHistory(member.id, { page, per_page: 10 }));
  const historyList = historyQuery.data?.data ?? [];
  const meta = historyQuery.data?.meta;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-5 text-muted-foreground" aria-hidden="true" />
            Sign-in history for {member.name}
          </DialogTitle>
          <DialogDescription>
            Recent sign-in attempts, devices, and IP addresses for {member.email}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <ListState
            query={historyQuery}
            empty={{
              when: historyList.length === 0,
              icon: KeyRound,
              title: "No sign-in history",
              description: "No sign-in attempts recorded for this member yet.",
            }}
          >
            <TableCard stale={historyQuery.isPlaceholderData} minWidth={550}>
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
                        <span className="truncate max-w-[200px]">{item.device ?? item.user_agent ?? "Unknown"}</span>
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

          {meta && (meta.last_page ?? 1) > 1 ? (
            <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
              <span>
                Page {meta.current_page} of {meta.last_page ?? 1} ({meta.total} total)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (meta.last_page ?? 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Confirm = { kind: "deactivate" | "reset2fa"; member: StaffMember };

function MemberActions({
  member,
  isSelf,
  onEdit,
  onHistory,
  onConfirm,
}: {
  member: StaffMember;
  isSelf: boolean;
  onEdit: () => void;
  onHistory: () => void;
  onConfirm: (c: Confirm) => void;
}) {
  const queryClient = useQueryClient();
  const activate = useMutation({
    mutationFn: () => opsApi.setMemberActive(member.id, true),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "members"] });
      toast.success(`${saved.name} can sign in again`);
    },
    onError: (error) => toast.error({ title: "Couldn't reactivate", description: refusal(error) }),
  });
  const resend = useMutation({
    mutationFn: () => opsApi.resendInvitation(member.id),
    onSuccess: () => toast.success({ title: "New setup code sent", description: `To ${member.email}. Earlier codes stop working.` }),
    onError: (error) => toast.error({ title: "Couldn't send the code", description: refusal(error) }),
  });
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${member.name}`} loading={activate.isPending || resend.isPending}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} className="ui-pop z-(--z-popover) w-64 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-overlay">
          <DropdownMenu.Item className={itemClass} onSelect={onEdit}>
            <Pencil className="size-[18px] text-muted-foreground" aria-hidden="true" /> Edit name or role
          </DropdownMenu.Item>
          <DropdownMenu.Item className={itemClass} onSelect={onHistory}>
            <History className="size-[18px] text-muted-foreground" aria-hidden="true" /> View sign-in history
          </DropdownMenu.Item>
          {member.is_active && !member.two_factor_enabled ? (
            <DropdownMenu.Item className={itemClass} onSelect={() => resend.mutate()}>
              <MailPlus className="size-[18px] text-muted-foreground" aria-hidden="true" /> Send a new setup code
            </DropdownMenu.Item>
          ) : null}
          {isSelf ? null : (
            <>
              {member.two_factor_enabled ? (
                <DropdownMenu.Item className={itemClass} onSelect={() => onConfirm({ kind: "reset2fa", member })}>
                  <KeyRound className="size-[18px] text-muted-foreground" aria-hidden="true" /> Reset two-step verification
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              {member.is_active ? (
                <DropdownMenu.Item className={`${itemClass} text-destructive`} onSelect={() => onConfirm({ kind: "deactivate", member })}>
                  <Ban className="size-[18px]" aria-hidden="true" /> Deactivate
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item className={itemClass} onSelect={() => activate.mutate()}>
                  <RotateCcw className="size-[18px] text-muted-foreground" aria-hidden="true" /> Reactivate
                </DropdownMenu.Item>
              )}
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/*
 * /admin/members (admins only): invite staff, change name or role, deactivate,
 * reset two-step verification after a lost phone, resend the setup code. The
 * API refuses changes that would lock the shop out (yourself, the last admin);
 * those messages are shown as they come.
 */
export default function MembersAdminPage() {
  const me = useStaff()?.user;
  const queryClient = useQueryClient();
  const { get, page, set, hrefFor } = useListParams();
  const q = get("q");
  const show: Show = SHOW.find((s) => s.value === get("show"))?.value ?? "all";
  const members = useQuery(
    opsQueries.members({ q: q || undefined, role: show === "admin" || show === "staff" ? show : undefined, active: show === "deactivated" ? false : null, page, per_page: 25 }),
  );
  const meta = members.data?.meta;
  const list = members.data?.data ?? [];
  const [editing, setEditing] = useState<StaffMember | "new" | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [historyMember, setHistoryMember] = useState<StaffMember | null>(null);
  const run = useMutation({
    mutationFn: (c: Confirm) => (c.kind === "deactivate" ? opsApi.setMemberActive(c.member.id, false) : opsApi.resetMemberTwoFactor(c.member.id)),
    onSuccess: (saved, c) => {
      void queryClient.invalidateQueries({ queryKey: ["staff", "members"] });
      toast.success(c.kind === "deactivate" ? `${saved.name} is deactivated and signed out` : { title: "Two-step verification reset", description: `${saved.name} sets it up again at their next sign-in.` });
    },
    onError: (error) => toast.error({ title: "Couldn't change the account", description: refusal(error) }),
    onSettled: () => setConfirm(null),
  });

  return (
    <AdminPage
      title="Staff members"
      lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "member" : "members") : "Who can sign in to the admin."}
      actions={
        <Button onClick={() => setEditing("new")}>
          <UserPlus aria-hidden="true" /> Invite member
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <SearchBox label="Search staff members" value={q} placeholder="Name or email" onSearch={(v) => set({ q: v || undefined })} />
        <Segmented label="Show" value={show} options={[...SHOW]} onChange={(v) => set({ show: v === "all" ? undefined : v })} />
      </div>
      <ListState query={members} empty={{ when: list.length === 0, icon: UsersRound, title: "No staff members match", description: "Try another filter or search." }}>
        <TableCard stale={members.isPlaceholderData} minWidth={720}>
          <thead className={thead}>
            <tr>
              <th scope="col" className={th}>Member</th>
              <th scope="col" className={th}>Role</th>
              <th scope="col" className={th}>Two-step</th>
              <th scope="col" className={th}>Added</th>
              <th scope="col" className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {list.map((m) => {
              const isSelf = m.id === me?.id;
              return (
                <tr key={m.id} className={m.is_active ? "hover:bg-surface-2/60" : "bg-surface-2/60"}>
                  <th scope="row" className={`${td} font-normal`}>
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {m.name}
                      {isSelf ? (
                        <Badge tone="neutral" shape="outline">
                          You
                        </Badge>
                      ) : null}
                      {m.is_active ? null : (
                        <Badge tone="danger" shape="outline">
                          <Ban aria-hidden="true" /> Deactivated
                        </Badge>
                      )}
                    </span>
                    <span className="block text-sm text-muted-foreground">{m.email}</span>
                  </th>
                  <td className={td}>
                    <Badge tone={m.role === "admin" ? "info" : "neutral"} shape="tint">
                      {ROLES[m.role].label}
                    </Badge>
                  </td>
                  <td className={`${td} whitespace-nowrap text-sm`}>
                    {m.two_factor_enabled ? (
                      <span className="inline-flex items-center gap-1.5 text-success">
                        <ShieldCheck className="size-4" aria-hidden="true" /> On
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <ShieldOff className="size-4" aria-hidden="true" /> Not set up
                      </span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap text-sm text-muted-foreground`}>{orderDate(m.created_at)}</td>
                  <td className={`${td} text-right`}>
                    <MemberActions
                      member={m}
                      isSelf={isSelf}
                      onEdit={() => setEditing(m)}
                      onHistory={() => setHistoryMember(m)}
                      onConfirm={setConfirm}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      </ListState>
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} />
      {editing ? <MemberDialog key={editing === "new" ? "new" : editing.id} member={editing === "new" ? null : editing} isSelf={editing !== "new" && editing.id === me?.id} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "deactivate" ? `Deactivate ${confirm.member.name}?` : `Reset two-step verification for ${confirm?.member.name}?`}
        description={
          confirm?.kind === "deactivate"
            ? "They're signed out everywhere and can't sign in until an admin reactivates them. Their past changes stay in the audit log."
            : "For a lost or replaced phone. They're signed out and must scan a new QR code at their next sign-in. Check it's really them first."
        }
        confirmLabel={confirm?.kind === "deactivate" ? "Deactivate" : "Reset"}
        loading={run.isPending}
        onConfirm={() => confirm && run.mutate(confirm)}
      />
      {historyMember ? (
        <MemberLoginHistoryDialog
          member={historyMember}
          onClose={() => setHistoryMember(null)}
        />
      ) : null}
    </AdminPage>
  );
}
