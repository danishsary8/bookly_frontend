import { useEffect, useState, type ReactNode } from "react";
import type { OrderDocument } from "@/api/types";
import { contact, policy, shop } from "@/content/shop";
import { formatLabel } from "@/lib/catalog";
import { invoiceTitle } from "./invoiceTitle";
import { cn } from "@/lib/utils";
import { FreeGiftLine } from "@/features/offers/FreeGiftLine";
import { formatKhr, formatUsd } from "@/stores/currency";

/*
 * Printable A4 sheets (pages/print.md):
 * - InvoiceSheet: customer invoice / receipt
 * - PackingSlipSheet: warehouse pick-and-pack checklist per order
 * - DeliveryManifestSheet: courier dispatch & COD cash-collection manifest for a batch
 *
 * All sheets use Daylight paper ink in both themes (`.paper`), clean hairlines,
 * repeating table headers, and `.print-keep-together` blocks so long orders and
 * multi-order batches paginate reliably in Chromium/Brave.
 */

type Doc = OrderDocument;
type Item = NonNullable<Doc["items"]>[number];

const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: policy.timezone });
const dayTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: policy.timezone });
/** "2 Oct 2026" in shop time (Phnom Penh), whatever the printing computer's clock says. */
const sheetDate = (value: string | null | undefined) => (value ? day.format(new Date(value)) : "");
const sheetDateTime = (value: Date | string | null | undefined) => (value ? dayTime.format(typeof value === "string" ? new Date(value) : value) : "");

const num = (value: string | number | null | undefined) => Number(value ?? 0);
const toCents = (value: string | number | null | undefined) => Math.round(num(value) * 100);
const centsToUsd = (cents: number) => formatUsd((cents / 100).toFixed(2));

const paymentLabel: Record<string, string> = { cod: "Cash on delivery", card: "Card", khqr: "Bakong KHQR" };
const statusLabel: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

/** Paid in full: the latest payment succeeded (cash is recorded when the courier delivers). */
const isPaid = (doc: Doc) => doc.payment_status === "succeeded";

/** Cache the qrcode module once so multi-invoice batches render all QR SVGs immediately. */
let qrLoader: Promise<typeof import("qrcode")> | null = null;
const loadQr = () => (qrLoader ??= import("qrcode"));

function Sheet({ label, children }: { label: string; children: ReactNode }) {
  return (
    <article aria-label={label} className="paper-sheet paper grid content-start gap-7 text-[14.5px] leading-[1.5]">
      {children}
    </article>
  );
}

function ShopBlock() {
  return (
    <div className="grid gap-1">
      <p className="font-display text-[2rem] leading-none text-primary">Bookly</p>
      <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {shop.name} · Phnom Penh, Cambodia
        <br />
        {contact.phone} · Telegram {contact.telegram} · {contact.email}
      </p>
    </div>
  );
}

function Heading({ title, doc }: { title: string; doc: Doc }) {
  const status = doc.status ? (statusLabel[doc.status] ?? doc.status) : null;
  return (
    <header className="print-keep-together flex flex-wrap items-start justify-between gap-6 border-b-2 border-foreground pb-4">
      <ShopBlock />
      <div className="grid justify-items-end gap-1 text-right">
        <h2 className="font-display text-[1.75rem] leading-none">{title}</h2>
        <p className="font-semibold tabular-nums">{doc.order_number}</p>
        <p className="text-sm text-muted-foreground">
          Ordered {sheetDate(doc.placed_at)}
          {status ? ` · ${status}` : ""}
        </p>
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
      <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h3>
      <div>{children}</div>
    </section>
  );
}

/** A stamp in words and a frame (MASTER: status never by colour alone). */
function Stamp({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "paid" | "cancelled" }) {
  return (
    <p
      className={cn(
        "w-fit rounded-sm border-2 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]",
        tone === "paid"
          ? "border-success text-success"
          : tone === "cancelled"
            ? "border-destructive text-destructive"
            : "border-current",
      )}
    >
      {children}
    </p>
  );
}

const itemMeta = (item: Item) =>
  [item.authors?.length ? item.authors.join(", ") : null, formatLabel(item.format), item.isbn ? `ISBN ${item.isbn}` : null].filter(Boolean).join(" · ");

function KhrNote({ doc }: { doc: Doc }) {
  if (!doc.khr) return null;
  return (
    <p className="text-xs text-muted-foreground sm:text-sm">
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
  const totalCopies = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const discount = num(doc.discount_usd);
  const tax = num(doc.tax_usd);
  const refunded = num(doc.refunded_usd);
  const cancelled = doc.status === "cancelled";

  return (
    <Sheet label={`${invoiceTitle(doc)} ${doc.order_number}`}>
      <Heading title={invoiceTitle(doc)} doc={doc} />
      <FreeGiftLine gift={doc.free_gift} packing />

      <div className="print-keep-together grid grid-cols-2 gap-6">
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
            <th scope="col" className="w-28 py-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border align-top">
              <td className="py-2 pr-3">
                <span className="block font-semibold">{item.title}</span>
                <span className="block text-xs text-muted-foreground sm:text-sm">{itemMeta(item)}</span>
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{item.quantity}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{formatUsd(item.unit_price_usd)}</td>
              <td className="py-2 text-right tabular-nums">
                <span className="block font-medium">{formatUsd(item.subtotal_usd)}</span>
                {doc.khr?.rate ? (
                  <span className="block text-xs text-muted-foreground">
                    ≈ {formatKhr(Math.round(num(item.subtotal_usd) * num(doc.khr.rate)))}
                  </span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="print-keep-together flex flex-wrap items-start justify-between gap-6">
        <div className="grid content-start gap-2.5">
          <Block title="Payment">
            <span className="block font-medium">{paymentLabel[doc.payment_method ?? ""] ?? doc.payment_method}</span>
            {isPaid(doc) && doc.payment_method === "cod" && doc.delivered_at ? (
              <span className="block text-sm text-muted-foreground">Paid on delivery, {sheetDate(doc.delivered_at)}</span>
            ) : isPaid(doc) && doc.payment_method === "khqr" ? (
              <span className="block text-sm text-muted-foreground">Payment verified via Bakong KHQR</span>
            ) : null}
          </Block>
          {cancelled ? (
            <Stamp tone="cancelled">Cancelled</Stamp>
          ) : doc.status === "returned" ? (
            <Stamp>Returned · refunded</Stamp>
          ) : isPaid(doc) ? (
            <Stamp tone="paid">Paid</Stamp>
          ) : (
            <CollectLine doc={doc} />
          )}
        </div>
        <div className="grid min-w-64 justify-items-end gap-1">
          <dl className="grid w-full grid-cols-[1fr_auto] gap-y-1 tabular-nums [&>dd]:pl-6">
            <dt>Subtotal ({totalCopies} {totalCopies === 1 ? "item" : "items"})</dt>
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
            {num(doc.credit_used_usd) > 0 ? (
              <>
                <dt>Paid with credit</dt>
                <dd className="text-right">{formatUsd(doc.credit_used_usd)}</dd>
                <dt>External payment</dt>
                <dd className="text-right">{formatUsd(doc.payment_due_usd)}</dd>
              </>
            ) : null}
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

      <footer className="print-keep-together flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground sm:text-sm">
        <p className="max-w-md">
          Thank you for shopping at Bookly. Printed books can be returned within {policy.returnWindowDays} days of delivery: see {location.host}/returns-policy. Questions: {contact.phone} or Telegram {contact.telegram}.
        </p>
        <InvoiceQrCode doc={doc} />
      </footer>
    </Sheet>
  );
}

function InvoiceQrCode({ doc }: { doc: Doc }) {
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bookly.test";
    const url = `${origin}/account/orders/${doc.id}`;

    void loadQr()
      .then((QRCode) =>
        QRCode.toString(url, {
          type: "svg",
          margin: 0,
          width: 56,
          errorCorrectionLevel: "M",
          color: { dark: "#0E1335", light: "#00000000" },
        }),
      )
      .then((res) => {
        if (!cancelled) setSvg(res);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [doc.id]);

  if (!svg) return null;

  return (
    <div className="flex items-center gap-2">
      <div
        className="size-14 shrink-0 [&>svg]:size-full"
        dangerouslySetInnerHTML={{ __html: svg }}
        aria-hidden="true"
      />
      <div className="text-[11px] leading-tight text-muted-foreground">
        <span className="block font-semibold text-foreground">Verify Order</span>
        <span>Scan QR to verify authenticity</span>
      </div>
    </div>
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
      <FreeGiftLine gift={doc.free_gift} packing />

      <div className="print-keep-together grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
        <Block title="Ship to">
          <span className="block text-[1.25rem] font-semibold leading-snug">{address?.recipient_name}</span>
          <span className="block text-[1.125rem] font-semibold tabular-nums">{address?.phone}</span>
          <span className="mt-1 block text-[1.0625rem]">
            <AddressLines address={address} />
          </span>
        </Block>
        <div className="grid content-start gap-2.5 rounded-sm border-2 border-foreground p-4">
          <CollectLine doc={doc} large />
          <p className="text-sm text-muted-foreground">{paymentLabel[doc.payment_method ?? ""] ?? doc.payment_method}</p>
        </div>
      </div>

      {doc.delivery_note ? (
        <Block title="Note from the customer" className="print-keep-together rounded-sm border border-border bg-surface-2/60 p-3">
          <p className="text-sm font-medium whitespace-pre-wrap">{doc.delivery_note}</p>
        </Block>
      ) : null}

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

      <div className="print-keep-together grid gap-1">
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

      <div className="print-keep-together grid grid-cols-2 gap-6 pt-6 text-sm">
        <p className="border-t border-foreground pt-2">Packed by</p>
        <p className="border-t border-foreground pt-2">Date</p>
      </div>
    </Sheet>
  );
}

/**
 * Courier delivery & COD cash-collection manifest for a batch of orders.
 * Gives the driver every stop, phone, address, delivery note, book count,
 * exact COD cash to collect (USD + KHR), and handover sign-off on one sheet.
 */
export function DeliveryManifestSheet({ docs, staffName }: { docs: Doc[]; staffName?: string | null }) {
  const printedAt = sheetDateTime(new Date());

  const rows = docs.map((doc) => {
    const physicalCopies = (doc.items ?? []).filter((i) => !i.is_digital).reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    const totalCopies = (doc.items ?? []).reduce((sum, i) => sum + (i.quantity ?? 0), 0);
    const collectCents = toCents(doc.amount_to_collect_usd);
    const collectKhr = doc.khr?.amount_to_collect ? Math.round(num(doc.khr.amount_to_collect)) : 0;
    const totalCents = toCents(doc.total_usd);
    return { doc, physicalCopies, totalCopies, collectCents, collectKhr, totalCents };
  });

  const totalPhysicalBooks = rows.reduce((sum, r) => sum + r.physicalCopies, 0);
  const codStops = rows.filter((r) => r.collectCents > 0);
  const prepaidStops = rows.filter((r) => r.collectCents === 0 && r.doc.status !== "cancelled");
  const totalCollectCents = codStops.reduce((sum, r) => sum + r.collectCents, 0);
  const totalCollectKhr = codStops.reduce((sum, r) => sum + r.collectKhr, 0);
  const hasKhr = codStops.some((r) => Boolean(r.doc.khr));
  const totalBatchValueCents = rows.filter((r) => r.doc.status !== "cancelled").reduce((sum, r) => sum + r.totalCents, 0);

  return (
    <Sheet label={`Delivery dispatch manifest (${docs.length} orders)`}>
      <header className="print-keep-together flex flex-wrap items-start justify-between gap-6 border-b-2 border-foreground pb-4">
        <ShopBlock />
        <div className="grid justify-items-end gap-1 text-right">
          <h2 className="font-display text-[1.75rem] leading-none">Delivery manifest</h2>
          <p className="text-sm font-semibold tabular-nums">
            {docs.length} {docs.length === 1 ? "stop" : "stops"} · {totalPhysicalBooks} {totalPhysicalBooks === 1 ? "book" : "books"}
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Printed {printedAt} ({policy.timezone})
            {staffName ? ` · By ${staffName}` : ""}
          </p>
        </div>
      </header>

      {/* Dispatch KPI summary strip */}
      <dl className="print-keep-together grid grid-cols-2 gap-3 tabular-nums sm:grid-cols-4">
        <div className="rounded-sm border border-border p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Stops</dt>
          <dd className="mt-1 text-xl font-bold">{docs.length}</dd>
          <p className="text-xs text-muted-foreground">{codStops.length} COD · {prepaidStops.length} paid/$0</p>
        </div>
        <div className="rounded-sm border border-border p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Books to pack</dt>
          <dd className="mt-1 text-xl font-bold">{totalPhysicalBooks}</dd>
          <p className="text-xs text-muted-foreground">physical copies</p>
        </div>
        <div className="rounded-sm border-2 border-foreground p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">COD to collect</dt>
          <dd className="mt-1 text-xl font-bold">{centsToUsd(totalCollectCents)}</dd>
          <p className="text-xs text-muted-foreground">{hasKhr && totalCollectKhr > 0 ? `≈ ${formatKhr(String(totalCollectKhr))}` : "cash handover total"}</p>
        </div>
        <div className="rounded-sm border border-border p-3">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Batch value</dt>
          <dd className="mt-1 text-xl font-bold">{centsToUsd(totalBatchValueCents)}</dd>
          <p className="text-xs text-muted-foreground">active order totals</p>
        </div>
      </dl>

      {/* Stop-by-stop delivery table */}
      <table className="w-full border-collapse text-left text-[13.5px]">
        <thead>
          <tr className="border-b-2 border-foreground text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            <th scope="col" className="w-8 py-2 pr-2 font-semibold">#</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Order</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Recipient & phone</th>
            <th scope="col" className="py-2 pr-3 font-semibold">Address & note</th>
            <th scope="col" className="w-14 py-2 pr-3 text-right font-semibold">Books</th>
            <th scope="col" className="w-28 py-2 pr-3 text-right font-semibold">Collect (COD)</th>
            <th scope="col" className="w-10 py-2 text-center font-semibold">Done</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ doc, physicalCopies, totalCopies, collectCents, collectKhr }, index) => {
            const addr = doc.shipping_address;
            const hasPin = addr?.latitude != null && addr?.longitude != null;
            const cityLine = [addr?.city, addr?.state].filter(Boolean).join(", ");
            return (
              <tr key={doc.id} className="border-b border-border align-top">
                <td className="py-2.5 pr-2 font-semibold tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="py-2.5 pr-3 whitespace-nowrap">
                  <span className="block font-semibold tabular-nums">{doc.order_number}</span>
                  <span className="block text-xs text-muted-foreground">
                    {sheetDate(doc.placed_at)} · {statusLabel[doc.status ?? ""] ?? doc.status}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className="block font-semibold">{addr?.recipient_name ?? doc.customer?.name}</span>
                  <span className="block font-semibold tabular-nums text-primary">{addr?.phone ?? doc.customer?.phone ?? "—"}</span>
                </td>
                <td className="py-2.5 pr-3 text-xs leading-snug">
                  <span className="block">{addr?.address_line1}</span>
                  {addr?.address_line2 ? <span className="block">{addr.address_line2}</span> : null}
                  {cityLine ? <span className="block text-muted-foreground">{cityLine}</span> : null}
                  {hasPin ? <span className="mt-0.5 inline-block font-semibold text-primary">Map pin saved</span> : null}
                  {doc.delivery_note ? (
                    <span className="mt-1 block rounded-xs bg-surface-2 px-1.5 py-0.5 font-medium text-foreground">
                      Note: {doc.delivery_note}
                    </span>
                  ) : null}
                  {doc.free_gift?.name_en || doc.free_gift?.name_km ? (
                    <span className="mt-0.5 block font-medium text-foreground">
                      + Gift: {doc.free_gift.name_en ?? doc.free_gift.name_km}{doc.free_gift.quantity && doc.free_gift.quantity > 1 ? ` ×${doc.free_gift.quantity}` : ""}
                    </span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  <span className="font-semibold">{physicalCopies}</span>
                  {totalCopies > physicalCopies ? (
                    <span className="block text-[11px] text-muted-foreground">+{totalCopies - physicalCopies} dig.</span>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums whitespace-nowrap">
                  {collectCents > 0 ? (
                    <>
                      <span className="block font-bold">{centsToUsd(collectCents)}</span>
                      {collectKhr > 0 ? <span className="block text-[11px] text-muted-foreground">≈ {formatKhr(String(collectKhr))}</span> : null}
                    </>
                  ) : doc.status === "cancelled" ? (
                    <span className="text-xs font-semibold uppercase text-destructive">Cancelled</span>
                  ) : (
                    <span className="text-xs font-semibold uppercase text-success">Paid · $0</span>
                  )}
                </td>
                <td className="py-2.5 text-center">
                  <span aria-hidden="true" className="mx-auto block size-5 rounded-[3px] border-2 border-foreground" />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-foreground font-semibold tabular-nums">
            <td colSpan={4} className="py-2.5 pr-3 text-right uppercase tracking-[0.1em] text-xs text-muted-foreground">
              Total cash to collect from courier
            </td>
            <td className="py-2.5 pr-3 text-right">{totalPhysicalBooks}</td>
            <td className="py-2.5 pr-3 text-right whitespace-nowrap">
              <span className="block text-base font-bold">{centsToUsd(totalCollectCents)}</span>
              {hasKhr && totalCollectKhr > 0 ? (
                <span className="block text-xs font-normal text-muted-foreground">≈ {formatKhr(String(totalCollectKhr))}</span>
              ) : null}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>

      {/* Handover & cash settlement sign-off */}
      <div className="print-keep-together grid gap-5 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-border bg-surface-2/40 px-4 py-3 text-sm tabular-nums">
          <span>
            Expected COD return: <strong>{centsToUsd(totalCollectCents)}</strong>
            {hasKhr && totalCollectKhr > 0 ? ` (${formatKhr(String(totalCollectKhr))})` : ""}
          </span>
          <span>Cash returned: _____________________</span>
        </div>
        <div className="grid grid-cols-3 gap-6 pt-6 text-xs sm:text-sm">
          <p className="border-t border-foreground pt-2">Dispatched by (Staff)</p>
          <p className="border-t border-foreground pt-2">Courier name & signature</p>
          <p className="border-t border-foreground pt-2">Cash settled / Verified by</p>
        </div>
      </div>
    </Sheet>
  );
}
