import type { ReactNode } from "react";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import type { Order, OrderItem } from "@/api/types";
import { formatAddressLines } from "@/features/account/address";
import { mapsLink } from "@/features/maps/googleMaps";
import { percentLabel } from "@/features/offers/percent";
import { cn } from "@/lib/utils";
import { formatMoney, formatUsd, useCurrency } from "@/stores/currency";
import { formatName, useT } from "@/i18n";

/*
 * The parts of an order shown on the checkout confirmation and the order detail:
 * its lines and totals (lines in USD, as the API stores them; the total also in
 * riel) and the delivery address.
 */

export function OrderItemsCard({
  order,
  totalLabel,
  itemAction,
  className,
}: {
  order: Order;
  totalLabel?: string;
  className?: string;
  /** Something to show beside a line, e.g. a review link once the order is delivered. */
  itemAction?: (item: OrderItem) => ReactNode;
}) {
  const currency = useCurrency();
  const { dict } = useT();
  const t = dict.orderParts;
  return (
    <section aria-labelledby={`order-items-${order.id}`} className={cn("rounded-xl border border-border bg-card p-5 sm:p-6", className)}>
      <h2 id={`order-items-${order.id}`} className="font-display text-[1.563rem] leading-tight">
        {t.items(order.item_count ?? 0)}
      </h2>
      <ul className="mt-4 divide-y divide-border">
        {(order.items ?? []).map((item) => (
          <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
            <span className="min-w-0 flex-1">
              <Link to={`/books/${item.book_id}`} className="font-semibold underline-offset-4 hover:underline">
                {item.title}
              </Link>
              <span className="block text-sm text-muted-foreground">
                {t.line(formatName(dict, item.format), item.quantity ?? 0, formatUsd(item.unit_price_usd))}
              </span>
              {itemAction ? <span className="mt-1 block text-sm">{itemAction(item)}</span> : null}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{formatUsd(item.subtotal_usd)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 grid gap-2 border-t border-border pt-4 text-[15px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="tabular-nums">{formatUsd(order.subtotal_usd)}</dd>
        </div>
        {Number(order.discount_usd) > 0 ? (
          <div className="flex justify-between text-success">
            <dt>
              {order.offer?.min_quantity
                ? dict.offers.offerLine(order.offer.min_quantity, percentLabel(order.offer.percent_off))
                : `${t.discount}${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
            </dt>
            <dd className="tabular-nums">−{formatUsd(order.discount_usd)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t.shipping}</dt>
          <dd className="tabular-nums">{formatUsd(order.shipping_fee_usd)}</dd>
        </div>
        {Number(order.tax_usd) > 0 ? (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.tax}</dt>
            <dd className="tabular-nums">{formatUsd(order.tax_usd)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">{totalLabel ?? t.total}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMoney(order.total_usd, order.total_khr, currency)}</dd>
        </div>
      </dl>
      {Number(order.credit_used_usd) > 0 ? <dl className="mt-3 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt>{dict.credit.used}</dt><dd>{formatUsd(order.credit_used_usd)}</dd></div><div className="flex justify-between gap-3"><dt>{dict.credit.due}</dt><dd>{formatUsd(order.payment_due_usd)}</dd></div></dl> : null}
    </section>
  );
}

export function DeliveryAddressCard({ address, title, className }: { address: Order["shipping_address"]; title?: string; className?: string }) {
  const { dict } = useT();
  if (!address) return null;
  return (
    <section aria-labelledby="order-address" className={cn("grid content-start gap-2 rounded-xl border border-border bg-card p-5 sm:p-6", className)}>
      <h2 id="order-address" className="flex items-center gap-2 font-display text-[1.563rem] leading-tight">
        <MapPin className="size-5 text-primary" aria-hidden="true" /> {title ?? dict.orderParts.deliveringTo}
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
      {address.latitude != null && address.longitude != null ? (
        // The customer's map pin: a plain Google Maps link (free, no key), e.g. for the courier.
        <a
          href={mapsLink({ lat: address.latitude, lng: address.longitude })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 justify-self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-4" aria-hidden="true" /> {dict.mapPin.openInMaps}
        </a>
      ) : null}
    </section>
  );
}
