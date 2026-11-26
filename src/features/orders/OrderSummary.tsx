import type { ReactNode } from "react";
import { BadgePercent, BookOpen, ExternalLink, MapPinned, PackageCheck, Phone } from "lucide-react";
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
  const count = order.item_count ?? order.items?.length ?? 0;
  const freeShipping = Number(order.shipping_fee_usd ?? 0) === 0;
  const hasDiscount = Number(order.discount_usd) > 0;

  return (
    <section
      aria-labelledby={`order-items-${order.id}`}
      className={cn(
        "shop-card overflow-hidden rounded-2xl border border-border border-t-[3px] border-t-primary bg-card p-5 shadow-[0_14px_34px_-26px_rgb(20_32_122/0.28)] sm:p-6",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lapis-tint text-primary" aria-hidden="true">
            <PackageCheck className="size-5" />
          </span>
          <h2 id={`order-items-${order.id}`} className="font-display text-[1.45rem] leading-tight">
            {t.items(count)}
          </h2>
        </div>
      </div>

      <ul className="mt-4 grid gap-2.5">
        {(order.items ?? []).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border/80 bg-surface-1/45 px-3.5 py-3 transition-colors hover:border-primary/25 hover:bg-lapis-tint/20"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border/80 bg-card text-primary shadow-[0_2px_6px_-4px_rgb(14_19_53/0.25)]"
                aria-hidden="true"
              >
                <BookOpen className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                {item.book_id ? (
                  <Link to={`/books/${item.book_id}`} className="font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  <span className="font-semibold text-foreground">{item.title}</span>
                )}
                <span className="mt-0.5 block text-xs text-muted-foreground sm:text-sm">
                  {t.line(formatName(dict, item.format), item.quantity ?? 0, formatUsd(item.unit_price_usd))}
                </span>
                {itemAction ? <span className="mt-1.5 block text-sm">{itemAction(item)}</span> : null}
              </span>
            </div>
            <span className="shrink-0 text-[15px] font-bold tabular-nums text-foreground">{formatUsd(item.subtotal_usd)}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid gap-2.5 border-t border-dashed border-border pt-4 text-[15px]">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">{t.subtotal}</dt>
          <dd className="font-medium tabular-nums">{formatUsd(order.subtotal_usd)}</dd>
        </div>
        {hasDiscount ? (
          <div className="flex items-center justify-between gap-4 text-success">
            <dt className="inline-flex items-center gap-1.5 font-medium">
              <BadgePercent className="size-4 shrink-0" aria-hidden="true" />
              <span>
                {order.offer?.min_quantity
                  ? Number(order.offer.percent_off) > 0
                    ? dict.offers.offerLine(order.offer.min_quantity, percentLabel(order.offer.percent_off))
                    : dict.offers.offerNamed(order.offer.name ?? t.discount)
                  : `${t.discount}${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
              </span>
            </dt>
            <dd className="font-semibold tabular-nums">−{formatUsd(order.discount_usd)}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <span>{t.shipping}</span>
            {freeShipping ? (
              <span className="rounded-full bg-success-tint px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-success">
                {dict.cartPage.free}
              </span>
            ) : null}
          </dt>
          <dd className={cn("font-medium tabular-nums", freeShipping && "text-success")}>{formatUsd(order.shipping_fee_usd)}</dd>
        </div>
        {Number(order.tax_usd) > 0 ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">{t.tax}</dt>
            <dd className="font-medium tabular-nums">{formatUsd(order.tax_usd)}</dd>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/15 bg-lapis-tint/35 px-4 py-3.5">
          <dt className="grid gap-1">
            <span className="font-semibold text-foreground">{totalLabel ?? t.total}</span>
            {hasDiscount ? (
              <span className="w-fit rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-success">
                {dict.cartPage.savedShort(formatUsd(order.discount_usd))}
              </span>
            ) : null}
          </dt>
          <dd className="font-display text-[1.75rem] font-semibold leading-none tabular-nums text-primary">
            {formatMoney(order.total_usd, order.total_khr, currency)}
          </dd>
        </div>
      </dl>
      {Number(order.credit_used_usd) > 0 ? (
        <dl className="mt-3 grid gap-2 rounded-xl border border-border bg-surface-1/60 px-4 py-3 text-sm">
          <div className="flex justify-between gap-3 text-success">
            <dt>{dict.credit.used}</dt>
            <dd className="font-semibold tabular-nums">{formatUsd(order.credit_used_usd)}</dd>
          </div>
          <div className="flex justify-between gap-3 font-semibold text-foreground">
            <dt>{dict.credit.due}</dt>
            <dd className="tabular-nums">{formatUsd(order.payment_due_usd)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}

export function DeliveryAddressCard({ address, title, className }: { address: Order["shipping_address"]; title?: string; className?: string }) {
  const { dict } = useT();
  if (!address) return null;
  return (
    <section
      aria-labelledby="order-address"
      className={cn(
        "shop-card grid content-start gap-4 rounded-2xl border border-border bg-gradient-to-b from-card to-surface-1/35 p-5 shadow-[0_14px_34px_-26px_rgb(20_32_122/0.24)] sm:p-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lapis-tint text-primary" aria-hidden="true">
            <MapPinned className="size-5" />
          </span>
          <h2 id="order-address" className="font-display text-[1.4rem] leading-tight">
            {title ?? dict.orderParts.deliveringTo}
          </h2>
        </div>
        {address.label ? (
          <span className="rounded-full bg-lapis-tint px-2.5 py-0.5 text-xs font-semibold text-primary">
            {address.label}
          </span>
        ) : null}
      </div>

      <address className="grid gap-1 rounded-xl border border-border/80 bg-card/90 p-3.5 text-sm not-italic leading-6">
        <span className="text-[15px] font-semibold text-foreground">{address.recipient_name}</span>
        {formatAddressLines(address).map((line) => (
          <span key={line} className="text-muted-foreground">
            {line}
          </span>
        ))}
        {address.phone ? (
          <span className="mt-2 inline-flex w-fit items-center gap-2 rounded-lg bg-surface-2/75 px-3 py-1 text-xs font-semibold tabular-nums text-foreground">
            <Phone className="size-3.5 text-primary" aria-hidden="true" /> {address.phone}
          </span>
        ) : null}
      </address>

      {address.latitude != null && address.longitude != null ? (
        // The customer's map pin: a plain Google Maps link (free, no key), e.g. for the courier.
        <a
          href={mapsLink({ lat: address.latitude, lng: address.longitude })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-9 items-center gap-1.5 justify-self-start rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-primary/35 hover:bg-lapis-tint/50"
        >
          <ExternalLink className="size-3.5" aria-hidden="true" /> {dict.mapPin.openInMaps}
        </a>
      ) : null}
    </section>
  );
}
