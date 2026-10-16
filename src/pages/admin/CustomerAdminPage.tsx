import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArchiveRestore,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Clock3,
  Mail,
  Phone,
  RotateCcw,
  Trash2,
  UserX,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { opsApi, opsKeys, opsQueries, type StaffCustomer } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PasswordField, TextField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { ReopenDialog } from "@/features/admin/ReopenAccount";
import { useReopenCustomer } from "@/features/admin/useReopenCustomer";
import { useStaff } from "@/features/admin/staffSession";
import { CustomerNotesPanel } from "@/features/admin/customer/CustomerNotesPanel";
import { CustomerTagsEditor } from "@/features/admin/customer/CustomerTagsEditor";
import { orderDate, orderDateTime } from "@/features/orders/format";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const SIGN_IN: Record<string, string> = {
  password: "Password",
  google: "Google",
  facebook: "Facebook",
};

function CloseCustomerDialog({
  customer,
  open,
  onOpenChange,
  onClosed,
}: {
  customer: StaffCustomer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClosed: (saved: StaffCustomer) => void;
}) {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const closeMutation = useMutation({
    mutationFn: () =>
      opsApi.closeCustomer(customer.id, {
        password,
        code,
        confirm: confirm.trim(),
      }),
    onSuccess: (saved) => {
      toast.success(`${saved.name}'s account was closed`);
      onOpenChange(false);
      onClosed(saved);
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(
        apiError.field("password") ??
          apiError.field("code") ??
          apiError.field("confirm") ??
          apiError.message,
      );
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    closeMutation.mutate();
  };

  const resetForm = () => {
    setPassword("");
    setCode("");
    setConfirm("");
    setError(null);
  };

  const expectedConfirm = customer.email ?? customer.phone ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !closeMutation.isPending) {
          resetForm();
          onOpenChange(false);
        }
      }}
    >
      <DialogContent size="sm">
        <form onSubmit={handleSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Close {customer.name}'s account?</DialogTitle>
            <DialogDescription>
              The customer is signed out immediately and cannot sign in. The account can be reopened for 30 days. After 30 days, personal details (name, email, phone, addresses) are erased permanently. Orders and sales records are kept.
            </DialogDescription>
          </DialogHeader>

          {error ? <FormAlert title={error} /> : null}

          <PasswordField
            label="Your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <TextField
            label="6-digit authenticator code"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            hint="From your authenticator app"
            required
          />

          <TextField
            label={`Type ${expectedConfirm} to confirm`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            hint={`Type the customer's ${customer.email ? "email" : "phone number"} exactly.`}
            required
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={closeMutation.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              loading={closeMutation.isPending}
            >
              Close account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/*
 * /admin/customers/:id: contact details, how they sign in, what they've bought
 * (net of refunds), recent orders, and (admins) deactivate / reactivate, delete an
 * unfinished sign-up straight away, or reopen an account the customer closed (within its 30 days).
 */
export default function CustomerAdminPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const customer = useQuery({ ...opsQueries.customer(id), enabled: valid });
  const [confirm, setConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const reopen = useReopenCustomer(() => setConfirmReopen(false));
  const navigate = useNavigate();
  const remove = useMutation({
    mutationFn: () => opsApi.deleteCustomer(id),
    onSuccess: () => {
      const name = customer.data?.name ?? "The account";
      queryClient.removeQueries({ queryKey: opsKeys.customer(id) });
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      toast.success({
        title: `${name}'s sign-up was deleted`,
        description: "That email can be used to sign up again.",
      });
      navigate("/admin/customers?view=unverified", { replace: true });
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't delete the sign-up",
        description: ApiError.from(error).message,
      }),
    onSettled: () => setConfirmDelete(false),
  });
  const toggle = useMutation({
    mutationFn: (active: boolean) => opsApi.setCustomerActive(id, active),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: opsKeys.customer(id) });
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      toast.success(
        saved.is_active
          ? `${saved.name} can sign in again`
          : `${saved.name} is deactivated and signed out`,
      );
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't change the account",
        description: ApiError.from(error).message,
      }),
    onSettled: () => setConfirm(false),
  });
  const resendVerification = useMutation({
    mutationFn: () => opsApi.resendCustomerVerification(id),
    onSuccess: () => {
      toast.success("Verification email sent");
    },
    onError: (error) =>
      toast.error({
        title: "Couldn't send verification email",
        description: ApiError.from(error).message,
      }),
  });
  const back = (
    <Link
      to="/admin/customers"
      className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> All customers
    </Link>
  );

  if (
    !valid ||
    (customer.isError && ApiError.from(customer.error).kind === "not_found")
  )
    return (
      <NotFoundState
        what="customer"
        backTo="/admin/customers"
        backLabel="All customers"
      />
    );
  if (customer.isError)
    return (
      <ErrorState
        error={customer.error}
        onRetry={() => customer.refetch()}
        headingLevel="h1"
        showHomeLink={false}
      />
    );
  if (!customer.data)
    return (
      <SkeletonGroup
        label="Loading customer…"
        className="mx-auto grid w-full max-w-[1200px] gap-4"
      >
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </SkeletonGroup>
    );

  const c = customer.data;
  const closed = Boolean(c.closed_at);
  const verified = c.verified ?? c.email_verified;
  const s = c.stats;
  const orderCount = s
    ? Object.values(s.orders_by_status).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <AdminPage
      title={c.name}
      back={back}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          {closed ? (
            <Badge tone="neutral" shape="solid">
              <UserX aria-hidden="true" /> Closed
            </Badge>
          ) : null}
          {c.is_active ? null : (
            <Badge tone="danger" shape="outline">
              <Ban aria-hidden="true" /> Deactivated
            </Badge>
          )}
          {c.email_verified ? (
            <Badge tone="success" shape="tint">
              <BadgeCheck aria-hidden="true" /> Email verified
            </Badge>
          ) : null}
          {c.phone_verified ? (
            <Badge tone="success" shape="tint">
              <BadgeCheck aria-hidden="true" /> Phone verified
            </Badge>
          ) : null}
          {verified ? null : (
            <Badge tone="warning" shape="outline">
              Not verified yet
            </Badge>
          )}
          Customer since {orderDate(c.created_at)}
        </span>
      }
      actions={
        <span className="flex flex-wrap gap-2">
          {c.email && !c.email_verified && !closed ? (
            <Button
              variant="outline"
              onClick={() => resendVerification.mutate()}
              loading={resendVerification.isPending}
            >
              <Mail aria-hidden="true" /> Resend verification email
            </Button>
          ) : null}
          {isAdmin && closed ? (
            <Button variant="outline" onClick={() => setConfirmReopen(true)}>
              <ArchiveRestore aria-hidden="true" /> Reopen account
            </Button>
          ) : isAdmin ? (
            <>
              {verified ? null : (
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  className="border-destructive/50 text-destructive hover:bg-destructive-tint"
                >
                  <Trash2 aria-hidden="true" /> Delete now
                </Button>
              )}
              {c.is_active ? (
                <Button
                  variant="outline"
                  onClick={() => setConfirm(true)}
                  className="border-destructive/50 text-destructive hover:bg-destructive-tint"
                >
                  <Ban aria-hidden="true" /> Deactivate
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => toggle.mutate(true)}
                  loading={toggle.isPending}
                >
                  <RotateCcw aria-hidden="true" /> Reactivate
                </Button>
              )}
            </>
          ) : null}
        </span>
      }
    >
      {closed && c.closed_at && c.erase_at ? (
        <div role="note" className="flex gap-3 rounded-xl border border-border bg-surface-2 p-4 text-[15px] leading-6">
          <UserX className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Closed by the customer</strong> on <time dateTime={c.closed_at}>{orderDateTime(c.closed_at)}</time>. They're
            signed out and can't sign in. Their name, email, phone and addresses are erased on{" "}
            <time dateTime={c.erase_at}>{orderDateTime(c.erase_at)}</time>; orders stay.{" "}
            {isAdmin ? "If they ask to come back before then, reopen the account." : "If they ask to come back before then, an admin can reopen the account."}
          </p>
        </div>
      ) : null}
      {c.removal_at ? (
        <div
          role="note"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning-tint p-4 text-[15px] leading-6"
        >
          <div className="flex gap-3">
            <Clock3
              className="mt-0.5 size-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <p>
              <strong className="font-semibold">Unfinished sign-up.</strong>{" "}
              {c.name} hasn't entered the code we emailed, so they can't order
              yet. The account is removed on{" "}
              <time dateTime={c.removal_at}>{orderDateTime(c.removal_at)}</time>{" "}
              unless they finish. If they're stuck, they can sign up again with
              the same email to get a new code.
            </p>
          </div>
          {c.email && !c.email_verified && !closed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resendVerification.mutate()}
              loading={resendVerification.isPending}
            >
              <Mail aria-hidden="true" /> Resend verification email
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          {s ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {(() => {
                const statCards: Array<{ label: string; value: string | number; detail?: string }> = [];
                if (isAdmin && s.lifetime_spent_usd) {
                  statCards.push({
                    label: "Spent",
                    value: formatUsd(s.lifetime_spent_usd),
                    detail: "paid, less refunds",
                  });
                }
                statCards.push(
                  {
                    label: "Orders",
                    value: orderCount,
                    detail: s.last_order_at ? `last ${orderDate(s.last_order_at)}` : "none yet",
                  },
                  { label: "Returns", value: s.returns_count },
                  { label: "Reviews", value: s.reviews_count },
                );
                return statCards.map((t) => (
                  <div
                    key={t.label}
                    className="grid content-start gap-1 rounded-xl border border-border bg-card p-4"
                  >
                    <p className="text-sm text-muted-foreground">{t.label}</p>
                    <p className="text-[1.5rem] font-semibold leading-tight tabular-nums">
                      {t.value}
                    </p>
                    {t.detail ? (
                      <p className="text-sm text-muted-foreground">{t.detail}</p>
                    ) : null}
                  </div>
                ));
              })()}
            </div>
          ) : null}
          <section
            aria-labelledby="customer-orders"
            className="grid gap-3 rounded-xl border border-border bg-card p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="customer-orders"
                className="font-sans text-[1.0625rem] font-semibold tracking-normal"
              >
                Recent orders
              </h2>
              {orderCount ? (
                <Link
                  to={`/admin/orders?q=${encodeURIComponent(c.email ?? c.name)}`}
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  All their orders
                </Link>
              ) : null}
            </div>
            {c.recent_orders?.length ? (
              <ul className="divide-y divide-border">
                {c.recent_orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      to={`/admin/orders/${o.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="grid">
                        <span className="font-semibold tabular-nums">
                          {o.order_number}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {orderDate(o.placed_at)}
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <OrderStatusBadge status={o.status} />
                        {isAdmin && o.total_usd ? (
                          <span className="w-20 text-right font-semibold tabular-nums">
                            {formatUsd(o.total_usd)}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                No orders yet.
              </p>
            )}
          </section>
          <CustomerNotesPanel customerId={id} />
          {isAdmin && !closed ? (
            <section
              aria-labelledby="danger-zone"
              className="grid gap-3 rounded-xl border border-destructive/40 bg-card p-5"
            >
              <div>
                <h2
                  id="danger-zone"
                  className="font-sans text-[1.0625rem] font-semibold tracking-normal text-destructive"
                >
                  Danger zone
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Close this customer's account. This signs them out, revokes their tokens, and schedules their personal details for permanent erasure in 30 days.
                </p>
              </div>
              <div>
                <Button
                  variant="outline"
                  onClick={() => setConfirmClose(true)}
                  className="border-destructive/50 text-destructive hover:bg-destructive-tint"
                >
                  Close account
                </Button>
              </div>
            </section>
          ) : null}
        </div>
        <section
          aria-labelledby="customer-contact"
          className="grid content-start gap-2 rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="customer-contact"
            className="font-sans text-[1.0625rem] font-semibold tracking-normal"
          >
            Contact
          </h2>
          {c.email ? (
            <a
              href={`mailto:${c.email}`}
              className="inline-flex min-w-0 items-center gap-2 text-[15px] [overflow-wrap:anywhere] hover:text-primary"
            >
              <Mail className="size-4 text-muted-foreground" aria-hidden="true" />{" "}
              {c.email}
            </a>
          ) : (
            <p className="inline-flex items-center gap-2 text-[15px] text-muted-foreground">
              <Mail className="size-4" aria-hidden="true" /> No email (signed up with Facebook and a phone number)
            </p>
          )}
          {c.phone ? (
            <a
              href={`tel:${c.phone}`}
              className="inline-flex items-center gap-2 text-[15px] tabular-nums hover:text-primary"
            >
              <Phone
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />{" "}
              {c.phone}
            </a>
          ) : (
            <p className="text-[15px] text-muted-foreground">No phone number</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">
            Signs in with{" "}
            {c.login_methods.map((m) => SIGN_IN[m] ?? m).join(", ") ||
              "nothing yet"}
          </p>
        </section>
        <CustomerTagsEditor customerId={id} initialTags={c.tags} />
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Deactivate ${c.name}?`}
        description="They're signed out everywhere and can't sign in until an admin reactivates the account. Their orders and reviews stay."
        confirmLabel="Deactivate"
        loading={toggle.isPending}
        onConfirm={() => toggle.mutate(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${c.name}'s sign-up?`}
        description={`They never entered their code, so they have no orders. The account is deleted for good and ${c.email ?? "their phone number"} can be used to sign up again.`}
        confirmLabel="Delete"
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <ReopenDialog customer={confirmReopen ? c : null} onOpenChange={setConfirmReopen} loading={reopen.isPending} onConfirm={() => reopen.mutate(c)} />
      <CloseCustomerDialog
        customer={c}
        open={confirmClose}
        onOpenChange={setConfirmClose}
        onClosed={(saved) => {
          queryClient.setQueryData(opsKeys.customer(id), saved);
          void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
        }}
      />
    </AdminPage>
  );
}
