import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ExternalLink, Loader2, PackageX, Printer, RotateCcw } from "lucide-react";
import customerService from "../../services/customer.service";
import type { CustomerInvoice, InvoiceItem } from "../../types/customer.types";
import { alertToast } from "../../lib/alerts";
import { printInvoiceReceipt } from "../../lib/receipt";
import { formatOrderDate, formatPrice, toNumber } from "../../lib/format";
import { useStorefrontSettings } from "../../contexts/StorefrontSettingsContext";
import { useSkeletonVisible } from "../../hooks/useSkeletonVisible";
import { Button } from "../../components/ui/button";
import { Breadcrumb } from "../../components/Breadcrumb";
import { EmptyState } from "../../components/EmptyState";
import { FormAlert } from "../../components/form/FormAlert";
import { FieldShell, TextAreaField, controlClassName } from "../../components/form/Field";
import { QuantityStepper } from "../../components/QuantityStepper";
import { OrderStatusBadge, OrderTimeline, ReturnStatusBadge } from "../../components/OrderStatus";
import { cn } from "@/lib/utils";

/*
 * /orders/:id (GET /invoices/{id}). Keeps the old Invoices page's behaviour: the 5-step
 * tracking timeline, shipment/tracking details, receipt printing, and the return-request
 * flow (delivered orders only; only the quantity not already reserved by a non-rejected
 * return can be requested).
 */

const normalise = (invoice: CustomerInvoice): CustomerInvoice => ({
  ...invoice,
  subtotal: toNumber(invoice.subtotal),
  discountAmount: toNumber(invoice.discountAmount),
  shipping: toNumber(invoice.shipping),
  tax: toNumber(invoice.tax),
  total: toNumber(invoice.total),
  items: invoice.items.map((item) => ({ ...item, id: toNumber(item.id), book_id: toNumber(item.book_id), price: toNumber(item.price), quantity: toNumber(item.quantity), total: toNumber(item.total) })),
  returnRequests: (invoice.returnRequests ?? []).map((r) => ({ ...r, quantity: toNumber(r.quantity), invoiceItemId: toNumber(r.invoiceItemId), refundAmount: toNumber(r.refundAmount) })),
});

const reservedQuantity = (invoice: CustomerInvoice, itemId: number) =>
  invoice.returnRequests.filter((r) => r.invoiceItemId === itemId && r.status !== "rejected").reduce((sum, r) => sum + r.quantity, 0);

const returnableQuantity = (invoice: CustomerInvoice, item: InvoiceItem) => Math.max(0, item.quantity - reservedQuantity(invoice, item.id));

const OrderDetail = () => {
  const { id = "" } = useParams();
  const { settings } = useStorefrontSettings();
  const [order, setOrder] = useState<CustomerInvoice | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "not-found" | "error">("loading");
  const showSkeleton = useSkeletonVisible(loadState === "loading");

  const [returnItemId, setReturnItemId] = useState<number | "">("");
  const [returnQty, setReturnQty] = useState(1);
  const [reason, setReason] = useState("");
  const [returnErrors, setReturnErrors] = useState<{ item?: string; reason?: string }>({});
  const [returnError, setReturnError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const data = normalise(await customerService.getInvoice(id));
      setOrder(data);
      setLoadState("ready");
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      setLoadState(status === 404 || status === 403 ? "not-found" : "error");
      return null;
    }
  }, [id]);

  useEffect(() => {
    setLoadState("loading");
    setOrder(null);
    void load();
  }, [load]);

  const returnable = useMemo(() => (order ? order.items.filter((item) => returnableQuantity(order, item) > 0) : []), [order]);
  const selectedItem = order?.items.find((item) => item.id === returnItemId) ?? null;
  const maxReturn = order && selectedItem ? returnableQuantity(order, selectedItem) : 1;

  // Default the return form to the first returnable line.
  useEffect(() => {
    setReturnItemId(returnable[0]?.id ?? "");
    setReturnQty(1);
  }, [returnable]);

  const submitReturn = async (event: FormEvent) => {
    event.preventDefault();
    if (!order) return;
    const next = {
      item: returnItemId === "" ? "Choose the book you want to return." : "",
      reason: reason.trim() ? "" : "Tell us why you're returning it.",
    };
    setReturnErrors(next);
    setReturnError("");
    if (next.item) return;
    if (next.reason) return reasonRef.current?.focus();
    if (returnQty < 1 || returnQty > maxReturn) {
      setReturnError(`You can return up to ${maxReturn} of this book.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await customerService.createReturnRequest(order.id, { invoice_item_id: Number(returnItemId), quantity: returnQty, reason: reason.trim() });
      await load();
      setReason("");
      setReturnQty(1);
      alertToast.success("Return requested", `${selectedItem?.title ?? "Your book"} · we'll review it shortly.`);
    } catch (error: any) {
      setReturnError(error?.response?.data?.message || "We couldn't send your return request. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadState === "not-found" || loadState === "error") {
    return (
      <div className="section-wrap py-10">
        <EmptyState
          icon={PackageX}
          headingLevel="h1"
          title={loadState === "not-found" ? "We can't find that order" : "This order didn't load"}
          description={loadState === "not-found" ? "Check the order number, or find it in your order history." : "Check your connection and try again."}
          action={<Button asChild><Link to="/orders">Back to your orders</Link></Button>}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="section-wrap py-8 lg:py-12">
        {showSkeleton ? (
          <div aria-busy="true" className="grid gap-6">
            <span className="sr-only">Loading order…</span>
            <div aria-hidden="true" className="skeleton h-10 w-1/2 rounded-sm" />
            <div aria-hidden="true" className="skeleton h-32 rounded-xl" />
            <div aria-hidden="true" className="skeleton h-56 rounded-xl" />
          </div>
        ) : null}
      </div>
    );
  }

  const itemCount = order.items.reduce((n, item) => n + item.quantity, 0);

  return (
    <div className="section-wrap py-8 lg:py-12">
      <Breadcrumb items={[{ label: "Account", to: "/profile" }, { label: "Orders", to: "/orders" }, { label: order.id }]} />

      <header className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="mt-3 break-all text-[clamp(1.9rem,3.4vw,2.6rem)] leading-[1.1] text-foreground">{order.id}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <OrderStatusBadge status={order.status} />
            <span>Placed {formatOrderDate(order.createdAt, true)}</span>
          </div>
        </div>
        <Button variant="outline" onClick={() => printInvoiceReceipt(order, settings)}>
          <Printer aria-hidden="true" />
          Print receipt
        </Button>
      </header>

      <section aria-labelledby="progress-title" className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 id="progress-title" className="mb-6 text-[1.563rem] leading-tight text-foreground">Delivery progress</h2>
        <OrderTimeline status={order.status} />
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="grid content-start gap-8 lg:col-span-8">
          <section aria-labelledby="items-title" className="rounded-xl border border-border bg-card">
            <div className="flex items-baseline justify-between gap-4 border-b border-border px-6 py-4">
              <h2 id="items-title" className="text-[1.563rem] leading-tight text-foreground">Books</h2>
              <p className="text-sm text-muted-foreground"><span className="tabular-nums">{itemCount}</span> {itemCount === 1 ? "book" : "books"}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-base">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <th scope="col" className="px-6 py-3 font-semibold">Book</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Price</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Qty</th>
                    <th scope="col" className="px-6 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-6 py-4">
                        <Link to={`/books/${item.book_id}`} className="font-semibold text-foreground underline-offset-4 hover:underline">{item.title}</Link>
                        <p className="text-sm text-muted-foreground">by {item.author_name}</p>
                      </td>
                      <td className="px-3 py-4 text-right tabular-nums">{formatPrice(item.price)}</td>
                      <td className="px-3 py-4 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-6 py-4 text-right font-semibold tabular-nums">{formatPrice(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="returns-title" className="rounded-xl border border-border bg-card p-6">
            <h2 id="returns-title" className="text-[1.563rem] leading-tight text-foreground">Returns</h2>
            {order.returnRequests.length === 0 ? (
              <p className="mt-2 text-muted-foreground">No return requests for this order.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {order.returnRequests.map((request) => (
                  <li key={request.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{request.bookTitle} <span className="font-normal text-muted-foreground">× {request.quantity}</span></p>
                      <ReturnStatusBadge status={request.status} />
                    </div>
                    <p className="mt-2 text-sm text-foreground">{request.reason}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Requested {formatOrderDate(request.createdAt)}
                      {request.refundAmount > 0 ? ` · ${request.status === "refunded" ? "Refunded" : "Refund value"} ${formatPrice(request.refundAmount)}` : ""}
                      {request.adminNote ? ` · ${request.adminNote}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {order.status === "delivered" ? (
              returnable.length > 0 ? (
                <form onSubmit={submitReturn} noValidate className="mt-6 grid gap-5 border-t border-border pt-6">
                  <h3 className="font-sans text-lg font-semibold text-foreground">Request a return</h3>
                  {returnError ? <FormAlert title={returnError} /> : null}
                  <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
                    <FieldShell id="return-item" label="Book" error={returnErrors.item}>
                      <select
                        id="return-item"
                        value={returnItemId}
                        onChange={(event) => { setReturnItemId(event.target.value ? Number(event.target.value) : ""); setReturnQty(1); }}
                        aria-invalid={returnErrors.item ? true : undefined}
                        className={cn(controlClassName, "h-12")}
                      >
                        {returnable.map((item) => (
                          <option key={item.id} value={item.id}>{item.title} ({returnableQuantity(order, item)} returnable)</option>
                        ))}
                      </select>
                    </FieldShell>
                    <QuantityStepper label="Quantity to return" showLabel value={returnQty} onChange={setReturnQty} min={1} max={maxReturn} />
                  </div>
                  <TextAreaField ref={reasonRef} label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={returnErrors.reason} hint="For example: damaged on arrival, wrong edition." />
                  <div>
                    <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                      {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCcw aria-hidden="true" />}
                      {isSubmitting ? "Sending request…" : "Request return"}
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Every book in this order already has a return request.</p>
              )
            ) : order.status !== "cancelled" ? (
              <p className="mt-4 text-sm text-muted-foreground">You can request a return once the order is delivered.</p>
            ) : null}
          </section>
        </div>

        <aside className="grid content-start gap-6 lg:col-span-4">
          <section aria-labelledby="total-title" className="rounded-xl border border-border bg-card p-6">
            <h2 id="total-title" className="text-[1.563rem] leading-tight text-foreground">Summary</h2>
            <dl className="mt-4 grid gap-2 text-base">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="tabular-nums">{formatPrice(order.subtotal)}</dd></div>
              {order.discountAmount > 0 ? <div className="flex justify-between text-success"><dt>Discount{order.promoCode ? ` (${order.promoCode})` : ""}</dt><dd className="tabular-nums">−{formatPrice(order.discountAmount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-muted-foreground">Shipping</dt><dd className="tabular-nums">{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd></div>
              {order.tax > 0 ? <div className="flex justify-between"><dt className="text-muted-foreground">Tax</dt><dd className="tabular-nums">{formatPrice(order.tax)}</dd></div> : null}
              <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3"><dt className="font-semibold">Total</dt><dd className="text-2xl font-semibold tabular-nums">{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          <section aria-labelledby="delivery-title" className="rounded-xl border border-border bg-card p-6">
            <h2 id="delivery-title" className="text-[1.563rem] leading-tight text-foreground">Delivery</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div><dt className="text-muted-foreground">Ship to</dt><dd className="mt-1 text-base text-foreground">{order.customerName}<br />{order.shippingAddress}</dd></div>
              <div><dt className="text-muted-foreground">Payment</dt><dd className="mt-1 text-base text-foreground">{order.paymentMethod === "card" ? "Card" : "Cash on delivery"}</dd></div>
              <div>
                <dt className="text-muted-foreground">Carrier</dt>
                <dd className="mt-1 text-base text-foreground">
                  {order.carrier || "Not assigned yet"}
                  {order.trackingNumber ? <span className="block text-sm tabular-nums text-muted-foreground">{order.trackingNumber}</span> : null}
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-11 items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline">
                      Track package <ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
                    </a>
                  ) : null}
                </dd>
              </div>
              <div><dt className="text-muted-foreground">Estimated delivery</dt><dd className="mt-1 text-base text-foreground">{formatOrderDate(order.estimatedDeliveryAt) || "Not scheduled yet"}</dd></div>
              {order.deliveredAt ? <div><dt className="text-muted-foreground">Delivered</dt><dd className="mt-1 text-base text-foreground">{formatOrderDate(order.deliveredAt, true)}</dd></div> : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetail;
