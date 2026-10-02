import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Banknote, RotateCcw, Star, XCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { CancelOrderDialog } from "@/features/orders/CancelOrderDialog";
import { DeliveryAddressCard, OrderItemsCard } from "@/features/orders/OrderSummary";
import { OrderTimeline } from "@/features/orders/OrderTimeline";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pay the courier on delivery",
  succeeded: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

/** Whether a return can be asked for, and until when; only fetched for delivered orders. */
function ReturnEntry({ order }: { order: Order }) {
  const returnable = useQuery(orderQueries.returnable(order.id!));
  if (returnable.isPending) return <Skeleton className="h-11 w-44" />;
  if (returnable.isError) return <InlineError error={returnable.error} onRetry={() => returnable.refetch()} />;
  const r = returnable.data;
  if (r.can_request_return) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link to={`/account/orders/${order.id}/return`} className={buttonVariants({ variant: "outline" })}>
          <RotateCcw aria-hidden="true" /> Request a return
        </Link>
        {r.returnable_until ? <span className="text-sm text-muted-foreground">Until {orderDate(r.returnable_until)}</span> : null}
      </div>
    );
  }
  return r.reason_unavailable ? <p className="text-sm text-muted-foreground">{r.reason_unavailable}</p> : null;
}

/*
 * /account/orders/:id: one order: lines and totals, delivery address, payment,
 * the status timeline, Cancel while it's pending, and the way into a return
 * once it's delivered. Delivered lines link to the book's review form.
 */
export default function OrderDetailPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const order = useQuery({ ...orderQueries.order(id), enabled: valid });
  const [cancelOpen, setCancelOpen] = useState(false);
  useDocumentTitle(order.data ? `Order ${order.data.order_number}` : "Order");

  if (!valid || (order.isError && ApiError.from(order.error).kind === "not_found")) {
    return <NotFoundState what="order" backTo="/account/orders" backLabel="See all your orders" />;
  }
  if (order.isError) return <ErrorState error={order.error} onRetry={() => order.refetch()} headingLevel="h1" showHomeLink={false} />;
  if (!order.data) {
    return (
      <SkeletonGroup label="Loading your order…" className="grid gap-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </SkeletonGroup>
    );
  }

  const o = order.data;
  const delivered = o.status === "delivered";

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <Link to="/account/orders" className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> All orders
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="grid gap-2">
            <h1 className="font-display text-[2.441rem] leading-[1.1]">
              Order <span className="tabular-nums">{o.order_number}</span>
            </h1>
            <p className="flex flex-wrap items-center gap-3 text-muted-foreground">
              <OrderStatusBadge status={o.status} />
              {o.placed_at ? <span>Placed {orderDate(o.placed_at)}</span> : null}
            </p>
          </div>
          {o.can_cancel ? (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle aria-hidden="true" /> Cancel order
            </Button>
          ) : null}
        </div>
        {delivered ? <ReturnEntry order={o} /> : null}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-6">
          <OrderItemsCard
            order={o}
            totalLabel={o.payment_status === "succeeded" ? "Total paid" : "Total"}
            itemAction={
              delivered
                ? (item) => (
                    <Link to={`/books/${item.book_id}#your-review`} className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline">
                      <Star className="size-4" aria-hidden="true" /> Review this book
                    </Link>
                  )
                : undefined
            }
          />
          <OrderTimeline history={o.status_history ?? []} />
        </div>
        <div className="grid content-start gap-6">
          <DeliveryAddressCard address={o.shipping_address} title="Delivery address" />
          <section aria-labelledby="order-payment" className="grid gap-2 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="order-payment" className="flex items-center gap-2 font-display text-[1.563rem] leading-tight">
              <Banknote className="size-5 text-primary" aria-hidden="true" /> Payment
            </h2>
            <p className="font-semibold">Cash on delivery</p>
            <p className="text-muted-foreground">{PAYMENT_STATUS[o.payment_status ?? "pending"] ?? o.payment_status}</p>
          </section>
        </div>
      </div>

      {o.can_cancel ? <CancelOrderDialog order={o} open={cancelOpen} onOpenChange={setCancelOpen} /> : null}
    </div>
  );
}
