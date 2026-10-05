import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, CheckCircle2, Mail, PackageCheck, Phone, Truck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { opsApi, opsKeys, opsQueries, type StaffOrder } from "@/api/endpoints/staffOps";
import { ApiError } from "@/api/errors";
import type { OrderStatus } from "@/api/types";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { TextAreaField } from "@/components/form/Field";
import { FormAlert } from "@/components/form/FormAlert";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { DeliveryAddressCard, OrderItemsCard } from "@/features/orders/OrderSummary";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import { orderDateTime } from "@/features/orders/format";
import { toast } from "@/stores/toast";

/** What each staff step is called on its button, what it does, and the toast after it. */
const STEPS: Partial<Record<OrderStatus, { label: string; Icon: typeof Truck; detail: string; done: string; destructive?: boolean }>> = {
  processing: { label: "Start processing", Icon: PackageCheck, detail: "The order is confirmed and being packed. The customer can no longer cancel it.", done: "Order is being processed" },
  shipped: { label: "Mark as shipped", Icon: Truck, detail: "The order is with the courier.", done: "Order marked as shipped" },
  delivered: { label: "Mark as delivered", Icon: CheckCircle2, detail: "The customer has the books and paid the courier: the cash payment is recorded as received.", done: "Order marked as delivered" },
  cancelled: { label: "Cancel order", Icon: Ban, detail: "The books go back into stock and any coupon use is given back to the customer.", done: "Order cancelled", destructive: true },
};

function StatusDialog({ order, to, onClose }: { order: StaffOrder; to: OrderStatus; onClose: () => void }) {
  const queryClient = useQueryClient();
  const step = STEPS[to]!;
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const change = useMutation({
    mutationFn: () => opsApi.setOrderStatus(order.id!, to, note.trim() || undefined),
    onSuccess: (saved) => {
      queryClient.setQueryData(opsKeys.order(order.id!), saved);
      void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      toast.success({ title: step.done, description: order.order_number });
      onClose();
    },
    onError: (err) => {
      const apiError = ApiError.from(err);
      setError(apiError.field("status") ?? apiError.field("note") ?? apiError.message);
      void queryClient.invalidateQueries({ queryKey: opsKeys.order(order.id!) });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    change.mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !change.isPending && onClose()}>
      <DialogContent size="sm">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>
              {step.label}: {order.order_number}
            </DialogTitle>
            <DialogDescription>{step.detail}</DialogDescription>
          </DialogHeader>
          {error ? <FormAlert title={error} /> : null}
          <TextAreaField label="Note for the timeline" optional hint="The customer sees this on their order. Up to 500 characters." maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={change.isPending}>
                Back
              </Button>
            </DialogClose>
            <Button type="submit" variant={step.destructive ? "destructive" : "default"} loading={change.isPending}>
              {step.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/*
 * /admin/orders/:id: one order for staff: lines and totals, the customer, delivery
 * address, payment, the timeline (with who changed what), and the next steps the
 * API allows (processing → shipped → delivered, or cancel before shipping).
 */
export default function OrderAdminPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const order = useQuery({ ...opsQueries.order(id), enabled: valid });
  const [step, setStep] = useState<OrderStatus | null>(null);

  const back = (
    <Link to="/admin/orders" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
      <ArrowLeft className="size-4" aria-hidden="true" /> All orders
    </Link>
  );

  if (!valid || (order.isError && ApiError.from(order.error).kind === "not_found")) return <NotFoundState what="order" backTo="/admin/orders" backLabel="All orders" />;
  if (order.isError) return <ErrorState error={order.error} onRetry={() => order.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!order.data)
    return (
      <SkeletonGroup label="Loading order…" className="mx-auto grid w-full max-w-[1200px] gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80 rounded-xl" />
      </SkeletonGroup>
    );

  const o = order.data;
  const next = o.allowed_next_statuses.filter((s) => STEPS[s]);
  const forward = next.filter((s) => !STEPS[s]!.destructive);
  const cancel = next.find((s) => STEPS[s]!.destructive);

  return (
    <AdminPage
      title={`Order ${o.order_number}`}
      back={back}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={o.status} /> Placed {orderDateTime(o.placed_at)}
        </span>
      }
      actions={
        <>
          {forward.map((s) => {
            const { label, Icon } = STEPS[s]!;
            return (
              <Button key={s} onClick={() => setStep(s)}>
                <Icon aria-hidden="true" /> {label}
              </Button>
            );
          })}
          {cancel ? (
            <Button variant="outline" onClick={() => setStep(cancel)} className="border-destructive/50 text-destructive hover:bg-destructive-tint">
              <Ban aria-hidden="true" /> Cancel order
            </Button>
          ) : null}
        </>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          <OrderItemsCard order={o as never} totalLabel={o.payment_status === "succeeded" ? "Total paid" : "Total to collect"} />
          <OrderTimeline history={o.status_history ?? []} />
        </div>
        <div className="grid content-start gap-6">
          {o.customer ? (
            <section aria-labelledby="order-customer" className="grid gap-2 rounded-xl border border-border bg-card p-5">
              <h2 id="order-customer" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
                Customer
              </h2>
              <Link to={`/admin/customers/${o.customer.id}`} className="font-semibold text-primary underline-offset-4 hover:underline">
                {o.customer.name}
              </Link>
              <a href={`mailto:${o.customer.email}`} className="inline-flex items-center gap-2 text-[15px] text-muted-foreground hover:text-foreground">
                <Mail className="size-4" aria-hidden="true" /> {o.customer.email}
              </a>
              {o.customer.phone ? (
                <a href={`tel:${o.customer.phone}`} className="inline-flex items-center gap-2 text-[15px] tabular-nums text-muted-foreground hover:text-foreground">
                  <Phone className="size-4" aria-hidden="true" /> {o.customer.phone}
                </a>
              ) : null}
            </section>
          ) : null}
          <DeliveryAddressCard address={o.shipping_address} title="Deliver to" />
          <section aria-labelledby="order-payment" className="grid gap-1 rounded-xl border border-border bg-card p-5">
            <h2 id="order-payment" className="font-sans text-[1.0625rem] font-semibold tracking-normal">
              Payment
            </h2>
            <p>Cash on delivery</p>
            <p className="text-sm text-muted-foreground">{o.payment_status === "succeeded" ? "Collected" : o.payment_status === "refunded" ? "Refunded" : "Not collected yet"}</p>
          </section>
        </div>
      </div>
      {step ? <StatusDialog key={step} order={o} to={step} onClose={() => setStep(null)} /> : null}
    </AdminPage>
  );
}
