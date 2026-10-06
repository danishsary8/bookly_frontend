import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Ban, Clock3, Mail, Phone, RotateCcw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { opsApi, opsKeys, opsQueries } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { useStaff } from "@/features/admin/staffSession";
import { orderDate, orderDateTime } from "@/features/orders/format";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

const SIGN_IN: Record<string, string> = { password: "Password", google: "Google", facebook: "Facebook" };

/*
 * /admin/customers/:id: contact details, how they sign in, what they've bought
 * (net of refunds), recent orders, and (admins) deactivate / reactivate.
 */
export default function CustomerAdminPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const session = useStaff();
  const isAdmin = session?.user.role === "admin";
  const queryClient = useQueryClient();
  const customer = useQuery({ ...opsQueries.customer(id), enabled: valid });
  const [confirm, setConfirm] = useState(false);
  const toggle = useMutation({
    mutationFn: (active: boolean) => opsApi.setCustomerActive(id, active),
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: opsKeys.customer(id) });
      void queryClient.invalidateQueries({ queryKey: ["staff", "customers"] });
      toast.success(saved.is_active ? `${saved.name} can sign in again` : `${saved.name} is deactivated and signed out`);
    },
    onError: (error) => toast.error({ title: "Couldn't change the account", description: ApiError.from(error).message }),
    onSettled: () => setConfirm(false),
  });
  const back = (
    <Link to="/admin/customers" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> All customers
    </Link>
  );

  if (!valid || (customer.isError && ApiError.from(customer.error).kind === "not_found")) return <NotFoundState what="customer" backTo="/admin/customers" backLabel="All customers" />;
  if (customer.isError) return <ErrorState error={customer.error} onRetry={() => customer.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!customer.data)
    return (
      <SkeletonGroup label="Loading customer…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </SkeletonGroup>
    );

  const c = customer.data;
  const s = c.stats;
  const orderCount = s ? Object.values(s.orders_by_status).reduce((a, b) => a + b, 0) : 0;

  return (
    <AdminPage
      title={c.name}
      back={back}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          {c.is_active ? null : (
            <Badge tone="danger" shape="outline">
              <Ban aria-hidden="true" /> Deactivated
            </Badge>
          )}
          {c.email_verified ? (
            <Badge tone="success" shape="tint">
              <BadgeCheck aria-hidden="true" /> Email verified
            </Badge>
          ) : (
            <Badge tone="warning" shape="outline">Email not verified</Badge>
          )}
          Customer since {orderDate(c.created_at)}
        </span>
      }
      actions={
        isAdmin ? (
          c.is_active ? (
            <Button variant="outline" onClick={() => setConfirm(true)} className="border-destructive/50 text-destructive hover:bg-destructive-tint">
              <Ban aria-hidden="true" /> Deactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={() => toggle.mutate(true)} loading={toggle.isPending}>
              <RotateCcw aria-hidden="true" /> Reactivate
            </Button>
          )
        ) : null
      }
    >
      {c.removal_at ? (
        <div role="note" className="flex gap-3 rounded-xl border border-warning/40 bg-warning-tint p-4 text-[15px] leading-6">
          <Clock3 className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Unfinished sign-up.</strong> {c.name} hasn't entered the code we emailed, so they can't order yet. The
            account is removed on <time dateTime={c.removal_at}>{orderDateTime(c.removal_at)}</time> unless they finish. If they're stuck, they can sign
            up again with the same email to get a new code.
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          {s ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: "Spent", value: formatUsd(s.lifetime_spent_usd), detail: "paid, less refunds" },
                { label: "Orders", value: orderCount, detail: s.last_order_at ? `last ${orderDate(s.last_order_at)}` : "none yet" },
                { label: "Returns", value: s.returns_count },
                { label: "Reviews", value: s.reviews_count },
              ].map((t) => (
                <div key={t.label} className="grid content-start gap-1 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">{t.label}</p>
                  <p className="text-[1.5rem] font-semibold leading-tight tabular-nums">{t.value}</p>
                  {t.detail ? <p className="text-sm text-muted-foreground">{t.detail}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          <section aria-labelledby="customer-orders" className="grid gap-3 rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="customer-orders" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
                Recent orders
              </h2>
              {orderCount ? (
                <Link to={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  All their orders
                </Link>
              ) : null}
            </div>
            {c.recent_orders?.length ? (
              <ul className="divide-y divide-border">
                {c.recent_orders.map((o) => (
                  <li key={o.id}>
                    <Link to={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-2.5 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="grid">
                        <span className="font-semibold tabular-nums">{o.order_number}</span>
                        <span className="text-sm text-muted-foreground">{orderDate(o.placed_at)}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <OrderStatusBadge status={o.status} />
                        <span className="w-20 text-right font-semibold tabular-nums">{formatUsd(o.total_usd)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] text-muted-foreground">No orders yet.</p>
            )}
          </section>
        </div>
        <section aria-labelledby="customer-contact" className="grid content-start gap-2 rounded-xl border border-border bg-card p-5">
          <h2 id="customer-contact" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
            Contact
          </h2>
          <a href={`mailto:${c.email}`} className="inline-flex min-w-0 items-center gap-2 text-[15px] [overflow-wrap:anywhere] hover:text-primary">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" /> {c.email}
          </a>
          {c.phone ? (
            <a href={`tel:${c.phone}`} className="inline-flex items-center gap-2 text-[15px] tabular-nums hover:text-primary">
              <Phone className="size-4 text-muted-foreground" aria-hidden="true" /> {c.phone}
            </a>
          ) : (
            <p className="text-[15px] text-muted-foreground">No phone number</p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">Signs in with {c.login_methods.map((m) => SIGN_IN[m] ?? m).join(", ") || "nothing yet"}</p>
        </section>
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
    </AdminPage>
  );
}
