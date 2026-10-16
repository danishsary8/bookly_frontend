import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck, Send, Truck } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { DeliveryAddressCard, OrderItemsCard } from "@/features/orders/OrderSummary";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { Rich } from "@/i18n/Rich";

/*
 * /checkout/success/:id: thank-you page. Shows the order straight from the
 * checkout response (router state) and refreshes it from GET /orders/{id}, so a
 * reload or a shared link works too. Lines are in USD (the API's order lines);
 * the total also in riel.
 */

const nextSteps = [
  { Icon: PackageCheck, title: "step1", text: "step1Text" },
  { Icon: Truck, title: "step2", text: "step2Text" },
  { Icon: CheckCircle2, title: "step3", text: "step3Text" },
] as const;

export default function OrderConfirmationPage() {
  const id = Number(useParams().id);
  const fromCheckout = (useLocation().state as { order?: Order } | null)?.order;
  const order = useQuery({ ...orderQueries.order(id), enabled: Number.isInteger(id) && id > 0, initialData: fromCheckout?.id === id ? fromCheckout : undefined });
  const { dict, locale } = useT();
  const k = dict.checkoutPage;
  useDocumentTitle(order.data ? dict.orders.orderNumber(order.data.order_number ?? "") : k.orderConfirmed);

  if (!Number.isInteger(id) || id <= 0 || (order.isError && ApiError.from(order.error).kind === "not_found")) {
    return <NotFoundState what={dict.nouns.whatOrder} backTo="/account" backLabel={k.goToAccount} />;
  }
  if (order.isError) return <div className="container-shell py-16"><ErrorState error={order.error} onRetry={() => order.refetch()} headingLevel="h1" /></div>;
  if (!order.data) {
    return (
      <div className="container-shell py-12">
        <SkeletonGroup label={k.loadingOrder} className="mx-auto grid max-w-3xl gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-xl" />
        </SkeletonGroup>
      </div>
    );
  }

  const o = order.data;

  return (
    <div className="container-shell pb-16 pt-8 sm:pt-12">
      <div className="mx-auto grid max-w-3xl gap-10">
        <header className="grid justify-items-center gap-4 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-success-tint text-success">
            <CheckCircle2 className="size-10" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="font-display text-[2.441rem] leading-tight sm:text-[3.052rem]">{k.thankYou}</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            <Rich text={k.placedLead(o.order_number ?? "")} strong="font-semibold tabular-nums text-foreground" />
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <OrderStatusBadge status={o.status} />
            {o.placed_at ? <span>{k.placed(new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(o.placed_at)))}</span> : null}
            {o.estimated_delivery?.formatted ? (
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Truck className="size-4 text-primary" aria-hidden="true" />
                {k.estDelivery(o.estimated_delivery.formatted)}
              </span>
            ) : null}
          </div>
        </header>

        <OrderItemsCard order={o} totalLabel={k.totalOnDelivery} />
        <DeliveryAddressCard address={o.shipping_address} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
          <div className="flex items-start sm:items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Send className="size-5" aria-hidden="true" />
            </span>
            <div className="grid">
              <span className="font-semibold text-foreground">{k.telegramUpdatesTitle}</span>
              <span className="text-sm text-muted-foreground">{k.telegramUpdatesDesc}</span>
            </div>
          </div>
          <Link to="/account/profile" className={buttonVariants({ variant: "outline", size: "sm" })}>
            {k.manage}
          </Link>
        </div>

        <section aria-labelledby="whats-next">
          <h2 id="whats-next" className="font-display text-[1.563rem] leading-tight">
            {k.whatNext}
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {nextSteps.map(({ Icon, title, text }, i) => (
              <li key={title} className="grid gap-2 rounded-xl border border-border bg-card p-4">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Icon className="size-[18px] text-primary" aria-hidden="true" /> {k.step(i + 1)}
                </span>
                <span className="font-semibold">{k[title]}</span>
                <span className="text-sm text-muted-foreground">{k[text]}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/books" className={buttonVariants()}>
            {k.keepBrowsing}
          </Link>
          <Link to={`/account/orders/${o.id}`} className={buttonVariants({ variant: "outline" })}>
            {k.viewOrder}
          </Link>
        </div>
      </div>
    </div>
  );
}
