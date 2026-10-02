import type { ReactNode } from "react";
import { MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import type { Order, OrderItem } from "@/api/types";
import { formatAddressLines } from "@/features/account/address";
import { formatLabel } from "@/lib/catalog";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";

/*
 * The parts of an order shown on the checkout confirmation and the order detail:
 * its lines and totals (lines in USD, as the API stores them; the total also in
 * riel) and the delivery address.
 */

export function OrderItemsCard({
  order,
  totalLabel = "Total",
  itemAction,
}: {
  order: Order;
  totalLabel?: string;
  /** Something to show beside a line, e.g. a review link once the order is delivered. */
  itemAction?: (item: OrderItem) => ReactNode;
}) {
  const currency = useCurrency();
  return (
    <section aria-labelledby={`order-items-${order.id}`} className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id={`order-items-${order.id}`} className="font-display text-[1.563rem] leading-tight">
        {order.item_count} {order.item_count === 1 ? "item" : "items"}
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {(order.items ?? []).map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <span className="min-w-0 flex-1">
              <Link to={`/books/${item.book_id}`} className="font-semibold underline-offset-4 hover:underline">
                {item.title}
              </Link>
              <span className="block text-sm text-muted-foreground">
                {formatLabel(item.format)} · Qty {item.quantity} × {formatUsd(item.unit_price_usd)}
              </span>
              {itemAction ? <span className="mt-1 block text-sm">{itemAction(item)}</span> : null}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatUsd(item.subtotal_usd)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 grid gap-2 border-t border-border pt-4 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatUsd(order.subtotal_usd)}</dd>
        </div>
        {Number(order.discount_usd) > 0 ? (
          <div className="flex justify-between text-success">
            <dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ""}</dt>
            <dd className="tabular-nums">−{formatUsd(order.discount_usd)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Shipping</dt>
          <dd className="tabular-nums">{formatUsd(order.shipping_fee_usd)}</dd>
        </div>
        {Number(order.tax_usd) > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd className="tabular-nums">{formatUsd(order.tax_usd)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">{totalLabel}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</dd>
        </div>
      </dl>
    </section>
  );
}

export function DeliveryAddressCard({ address, title = "Delivering to" }: { address: Order["shipping_address"]; title?: string }) {
  if (!address) return null;
  return (
    <section aria-labelledby="order-address" className="grid content-start gap-2 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="order-address" className="flex items-center gap-2 font-display text-[1.563rem] leading-tight">
        <MapPin className="size-5 text-primary" aria-hidden="true" /> {title}
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
  );
}
