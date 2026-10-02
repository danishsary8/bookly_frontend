import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MapPin, PackageCheck, Phone, Truck } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
import { ApiError } from "@/api/errors";
import type { Order } from "@/api/types";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { formatAddressLines } from "@/features/account/address";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatLabel } from "@/lib/catalog";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";

/*
 * /checkout/success/:id: thank-you page. Shows the order straight from the
 * checkout response (router state) and refreshes it from GET /orders/{id}, so a
 * reload or a shared link works too. Lines are in USD (the API's order lines);
 * the total also in riel.
 */

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

const nextSteps = [
  { Icon: PackageCheck, title: "We prepare your books", text: "Your order is confirmed by our team and packed." },
  { Icon: Truck, title: "A courier delivers", text: "You'll get a call on the number you gave before delivery." },
  { Icon: CheckCircle2, title: "Pay on arrival", text: "Pay the courier in cash when the books arrive." },
];

export default function OrderConfirmationPage() {
  const id = Number(useParams().id);
  const fromCheckout = (useLocation().state as { order?: Order } | null)?.order;
  const order = useQuery({ ...orderQueries.order(id), enabled: Number.isInteger(id) && id > 0, initialData: fromCheckout?.id === id ? fromCheckout : undefined });
  const currency = useCurrency();
  useDocumentTitle(order.data ? `Order ${order.data.order_number}` : "Order confirmed");

  if (!Number.isInteger(id) || id <= 0 || (order.isError && ApiError.from(order.error).kind === "not_found")) {
    return <NotFoundState what="order" backTo="/account" backLabel="Go to your account" />;
  }
  if (order.isError) return <div className="container-shell py-16"><ErrorState error={order.error} onRetry={() => order.refetch()} headingLevel="h1" /></div>;
  if (!order.data) {
    return (
      <div className="container-shell py-12">
        <SkeletonGroup label="Loading your order…" className="mx-auto grid max-w-3xl gap-4">
          <Skeleton className="h-16 w-2/3" />
          <Skeleton className="h-48 rounded-xl" />
        </SkeletonGroup>
      </div>
    );
  }

  const o = order.data;
  const address = o.shipping_address;

  return (
    <div className="container-shell pb-16 pt-8 sm:pt-12">
      <div className="mx-auto grid max-w-3xl gap-10">
        <header className="grid justify-items-center gap-4 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-success-tint text-success">
            <CheckCircle2 className="size-10" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="font-display text-[2.441rem] leading-tight sm:text-[3.052rem]">Thank you for your order</h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Your order <strong className="font-semibold tabular-nums text-foreground">{o.order_number}</strong> is placed. Keep this number in case you need to contact us.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <OrderStatusBadge status={o.status} />
            {o.placed_at ? <span>Placed {dateFormat.format(new Date(o.placed_at))}</span> : null}
          </div>
        </header>

        <section aria-labelledby="order-items" className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 id="order-items" className="font-display text-[1.563rem] leading-tight">
            {o.item_count} {o.item_count === 1 ? "item" : "items"}
          </h2>
          <ul className="mt-4 divide-y divide-border">
            {(o.items ?? []).map((item) => (
              <li key={item.id} className="flex items-baseline justify-between gap-4 py-3">
                <span className="min-w-0">
                  <Link to={`/books/${item.book_id}`} className="font-semibold underline-offset-4 hover:underline">
                    {item.title}
                  </Link>
                  <span className="block text-sm text-muted-foreground">
                    {formatLabel(item.format)} · Qty {item.quantity} × {formatUsd(item.unit_price_usd)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatUsd(item.subtotal_usd)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-2 grid gap-2 border-t border-border pt-4 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatUsd(o.subtotal_usd)}</dd>
            </div>
            {Number(o.discount_usd) > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Discount{o.coupon_code ? ` (${o.coupon_code})` : ""}</dt>
                <dd className="tabular-nums">−{formatUsd(o.discount_usd)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{formatUsd(o.shipping_fee_usd)}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
              <dt className="font-semibold">Total to pay on delivery</dt>
              <dd className="text-2xl font-semibold tabular-nums">{formatMoney(o.total_usd, o.total_khr, currency)}</dd>
            </div>
          </dl>
        </section>

        {address ? (
          <section aria-labelledby="order-address" className="grid gap-2 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="order-address" className="flex items-center gap-2 font-display text-[1.563rem] leading-tight">
              <MapPin className="size-5 text-primary" aria-hidden="true" /> Delivering to
            </h2>
            <address className="grid not-italic leading-6">
              <span className="font-semibold">{address.recipient_name}</span>
              {formatAddressLines(address).map((line) => (
                <span key={line} className="text-muted-foreground">
                  {line}
                </span>
              ))}
              <span className="mt-1 inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
                <Phone className="size-4" aria-hidden="true" /> {address.phone}
              </span>
            </address>
          </section>
        ) : null}

        <section aria-labelledby="whats-next">
          <h2 id="whats-next" className="font-display text-[1.563rem] leading-tight">
            What happens next
          </h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-3">
            {nextSteps.map(({ Icon, title, text }, i) => (
              <li key={title} className="grid gap-2 rounded-xl border border-border bg-card p-4">
                <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Icon className="size-[18px] text-primary" aria-hidden="true" /> Step {i + 1}
                </span>
                <span className="font-semibold">{title}</span>
                <span className="text-sm text-muted-foreground">{text}</span>
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/books" className={buttonVariants()}>
            Keep browsing
          </Link>
          <Link to="/account" className={buttonVariants({ variant: "outline" })}>
            Go to your account
          </Link>
        </div>
      </div>
    </div>
  );
}
