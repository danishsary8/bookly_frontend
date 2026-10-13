import type { ReactNode } from "react";
import type { OrderDocument } from "@/api/types";
import { contact, policy, shop } from "@/content/shop";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatKhr, formatUsd } from "@/stores/currency";

/*
 * Printable A4 sheets (pages/print.md): the invoice for the customer and the packing
 * slip for whoever packs the box. Paper colours in both themes (`.paper`), hairlines,
 * no fills that waste ink, and every state written out, never colour alone.
 */

type Doc = OrderDocument;
type Item = NonNullable<Doc["items"]>[number];

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: policy.timezone });
/** "2 Oct 2026" in shop time (Phnom Penh), whatever the printing computer's clock says. */
const sheetDate = (value: string | null | undefined) => (value ? day.format(new Date(value)) : "");

const num = (value: string | number | null | undefined) => Number(value ?? 0);
const paymentLabel: Record<string, string> = { cod: "Cash on delivery", card: "Card", khqr: "KHQR" };

/** Paid in full: the latest payment succeeded (cash is recorded when the courier delivers). */
const isPaid = (doc: Doc) => doc.payment_status === "succeeded";

function Sheet({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article aria-label={label} className="paper-sheet paper grid content-start gap-8 text-[15px] leading-[1.5]">
      {children}
    </article>
  );
}

function ShopBlock() {
  return (
    <div className="grid gap-1">
      <p className="font-display text-[2rem] leading-none text-primary">Bookly</p>
      <p className="text-sm text-muted-foreground">
        {shop.name} · Phnom Penh, Cambodia
        <br />
        {contact.phone} · Telegram {contact.telegram} · {contact.email}
      </p>
    </div>
  );
}

function Heading({ title, doc }: { title: string; doc: Doc }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6 border-b border-foreground pb-5">
      <ShopBlock />
      <div className="grid justify-items-end gap-1 text-right">
        <h2 className="font-display text-[1.75rem] leading-none">{title}</h2>
        <p className="font-semibold tabular-nums">{doc.order_number}</p>
        <p className="text-sm text-muted-foreground">Ordered {sheetDate(doc.placed_at)}</p>
      </div>
    </header>
  );
}

function AddressLines({ address }: { address: Doc["shipping_address"] }) {
  if (!address) return null;
  const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(", ");
  return (
    <>
      <span className="block">{address.address_line1}</span>
      {address.address_line2 ? <span className="block">{address.address_line2}</span> : null}
      <span className="block">{cityLine}</span>
      <span className="block">{address.country}</span>
    </>
  );
}

function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-1", className)}>
      <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

/** A stamp in words and a frame (MASTER: status never by colour alone). */
function Stamp({ children }: { children: ReactNode }) {
  return <p className="w-fit rounded-sm border-2 border-current px-3 py-1 text-sm font-bold uppercase tracking-[0.18em]">{children}</p>;
}

const itemMeta = (item: Item) =>
  [item.authors?.length ? item.authors.join(", ") : null, formatLabel(item.format), item.isbn ? `ISBN ${item.isbn}` : null].filter(Boolean).join(" · ");

function KhrNote({ doc }: { doc: Doc }) {
  if (!doc.khr) return null;
  return (
    <p className="text-sm text-muted-foreground">
      ≈ {formatKhr(doc.khr.total)} at 1 USD = {formatKhr(doc.khr.rate)} (rate of {sheetDate(doc.khr.rate_effective_at)})
    </p>
  );
}

/** What the courier collects, or that nothing is due. Shared by both sheets. */
function CollectLine({ doc, large = false }: { doc: Doc; large?: boolean }) {
  const due = num(doc.amount_to_collect_usd) > 0;
  return (
    <p className={cn("font-semibold tabular-nums", large && "text-[1.25rem]")}>
      {due ? (
        <>
          Collect on delivery: {formatUsd(doc.amount_to_collect_usd)}
          {doc.khr ? ` (${formatKhr(doc.khr.amount_to_collect)})` : ""}
        </>
      ) : isPaid(doc) ? (
        "Paid: collect nothing"
      ) : (
        "Nothing to collect"
      )}
    </p>
  );
}

export function InvoiceSheet({ doc }: { doc: Doc }) {
  const items = doc.items ?? [];
  const discount = num(doc.discount_usd);
  const tax = num(doc.tax_usd);
  const refunded = num(doc.refunded_usd);
  const cancelled = doc.status === "cancelled";

  return (
    <Sheet label={`Invoice ${doc.order_number}`}>
      <Heading title="Invoice" doc={doc} />

      <div className="grid grid-cols-2 gap-6">
        <Block title="Billed to">
          <span className="block font-semibold">{doc.customer?.name}</span>
          {doc.customer?.email ? <span className="block">{doc.customer.email}</span> : null}
          {doc.customer?.phone ? <span className="block tabular-nums">{doc.customer.phone}</span> : null}
        </Block>
        <Block title="Delivered to">
          <span className="block font-semibold">{doc.shipping_address?.recipient_name}</span>
          <span className="block tabular-nums">{doc.shipping_address?.phone}</span>
          <AddressLines address={doc.shipping_address} />
        </Block>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-foreground text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <th scope="col" className="py-2 pr-3 font-semibold">Item</th>
            <th scope="col" className="w-14 py-2 pr-3 text-right font-semibold">Qty</th>
            <th scope="col" className="w-24 py-2 pr-3 text-right font-semibold">Price</th>
            <th scope="col" className="w-24 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border align-top">
              <td className="py-2.5 pr-3">
                <span className="block font-semibold">{item.title}</span>
                <span className="block text-sm text-muted-foreground">{itemMeta(item)}</span>
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatUsd(item.unit_price_usd)}</td>
              <td className="py-2.5 text-right tabular-nums">{formatUsd(item.subtotal_usd)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="grid content-start gap-2">
          <Block title="Payment">
            <span className="block">{paymentLabel[doc.payment_method ?? ""] ?? doc.payment_method}</span>
            {isPaid(doc) && doc.delivered_at ? <span className="block text-sm text-muted-foreground">Paid on delivery, {sheetDate(doc.delivered_at)}</span> : null}
          </Block>
          {cancelled ? <Stamp>Cancelled</Stamp> : isPaid(doc) ? <Stamp>Paid</Stamp> : <CollectLine doc={doc} />}
        </div>
        <div className="grid min-w-64 justify-items-end gap-1">
        <dl className="grid w-full grid-cols-[1fr_auto] gap-y-1 tabular-nums [&>dd]:pl-6">
          <dt>Subtotal</dt>
          <dd className="text-right">{formatUsd(doc.subtotal_usd)}</dd>
          {discount > 0 ? (
            <>
              <dt>Discount{doc.coupon_code ? ` (${doc.coupon_code})` : ""}</dt>
              <dd className="text-right">−{formatUsd(doc.discount_usd)}</dd>
            </>
          ) : null}
          <dt>Delivery</dt>
          <dd className="text-right">{num(doc.shipping_fee_usd) > 0 ? formatUsd(doc.shipping_fee_usd) : "Free"}</dd>
          {tax > 0 ? (
            <>
              <dt>Tax</dt>
              <dd className="text-right">{formatUsd(doc.tax_usd)}</dd>
            </>
          ) : null}
          <dt className="mt-1 border-t border-foreground pt-2 font-semibold">Total (USD)</dt>
          <dd className="mt-1 border-t border-foreground pt-2 text-right font-semibold">{formatUsd(doc.total_usd)}</dd>
          {refunded > 0 ? (
            <>
              <dt>Refunded</dt>
              <dd className="text-right">−{formatUsd(doc.refunded_usd)}</dd>
            </>
          ) : null}
        </dl>
          <KhrNote doc={doc} />
        </div>
      </div>

      <footer className="border-t border-border pt-4 text-sm text-muted-foreground">
        Thank you for shopping at Bookly. Printed books can be returned within {policy.returnWindowDays} days of delivery: see {location.host}/returns-policy. Questions: {contact.phone} or Telegram {contact.telegram}.
      </footer>
    </Sheet>
  );
}

export function PackingSlipSheet({ doc }: { doc: Doc }) {
  const items = doc.items ?? [];
  const physical = items.filter((item) => !item.is_digital);
  const digital = items.filter((item) => item.is_digital);
  const copies = physical.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const address = doc.shipping_address;

  return (
    <Sheet label={`Packing slip ${doc.order_number}`}>
      <Heading title="Packing slip" doc={doc} />

      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <Block title="Ship to">
          <span className="block text-[1.25rem] font-semibold leading-snug">{address?.recipient_name}</span>
          <span className="block text-[1.125rem] font-semibold tabular-nums">{address?.phone}</span>
          <span className="mt-1 block text-[1.0625rem]">
            <AddressLines address={address} />
          </span>
        </Block>
        <div className="grid content-start gap-3 rounded-sm border-2 border-foreground p-4">
          <CollectLine doc={doc} large />
          <p className="text-sm text-muted-foreground">{paymentLabel[doc.payment_method ?? ""] ?? doc.payment_method}</p>
        </div>
      </div>

      {physical.length ? (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-foreground text-xs uppercase tracking-[0.12em] text-muted-foreground">
              <th scope="col" className="w-10 py-2 pr-3 font-semibold">
                <span className="sr-only">Packed</span>
              </th>
              <th scope="col" className="w-14 py-2 pr-3 text-right font-semibold">Qty</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Book</th>
              <th scope="col" className="py-2 pr-3 font-semibold">Format</th>
              <th scope="col" className="py-2 font-semibold">SKU / ISBN</th>
            </tr>
          </thead>
          <tbody>
            {physical.map((item) => (
              <tr key={item.id} className="border-b border-border align-top">
                <td className="py-3 pr-3">
                  <span aria-hidden="true" className="block size-5 rounded-[3px] border-2 border-foreground" />
                </td>
                <td className="py-3 pr-3 text-right text-[1.25rem] font-semibold tabular-nums">{item.quantity}</td>
                <td className="py-3 pr-3">
                  <span className="block font-semibold">{item.title}</span>
                  {item.authors?.length ? <span className="block text-sm text-muted-foreground">{item.authors.join(", ")}</span> : null}
                </td>
                <td className="py-3 pr-3">{formatLabel(item.format)}</td>
                <td className="py-3 text-sm tabular-nums">
                  <span className="block font-semibold">{item.sku}</span>
                  {item.isbn ? <span className="block text-muted-foreground">{item.isbn}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="font-semibold">Nothing to pack: this order has digital books only.</p>
      )}

      <div className="grid gap-1">
        {physical.length ? (
          <p className="font-semibold">
            {copies} {copies === 1 ? "book" : "books"} in the box
          </p>
        ) : null}
        {digital.length ? (
          <p className="text-sm text-muted-foreground">
            Not packed (digital): {digital.map((item) => `${item.title} (${formatLabel(item.format)})`).join(", ")}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-6 pt-6 text-sm">
        <p className="border-t border-foreground pt-2">Packed by</p>
        <p className="border-t border-foreground pt-2">Date</p>
      </div>
    </Sheet>
  );
}
