import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { opsApi, type StaffOrder } from "@/api/endpoints/staffOps";
import type { OrderStatus } from "@/api/types";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { contact, policy, shop } from "@/content/shop";
import { shopToday } from "@/features/admin/dashboardRange";
import { useStaff } from "@/features/admin/staffSession";
import { usePortalPath } from "@/features/admin/portal";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { cn } from "@/lib/utils";
import { formatKhr, formatUsd } from "@/stores/currency";

const MAX_PAGES = 5;
const PER_PAGE = 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_VALUES = new Set<OrderStatus | "waiting">(["waiting", "pending", "paid", "processing", "shipped", "delivered", "cancelled", "returned"]);

const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: policy.timezone });
const printedFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: policy.timezone });

const shiftDay = (ymd: string, deltaDays: number) =>
  new Date(Date.parse(`${ymd}T00:00:00Z`) + deltaDays * 86_400_000).toISOString().slice(0, 10);

const formatYmd = (ymd: string) => dayFmt.format(new Date(`${ymd}T00:00:00Z`));
const toCents = (value: string | number | null | undefined) => Math.round(Number(value ?? 0) * 100);
const toKhr = (value: string | number | null | undefined) => Math.round(Number(value ?? 0));
const usd = (cents: number) => formatUsd((cents / 100).toFixed(2));

const paymentLabels: Record<string, string> = { cod: "COD", khqr: "KHQR", card: "Card" };
const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

async function fetchAllOrders(filters: { from: string; to: string; status?: OrderStatus | "waiting"; payment_method?: "cod" | "khqr" }) {
  const first = await opsApi.orders({ ...filters, page: 1, per_page: PER_PAGE });
  const rows: StaffOrder[] = [...first.data];
  const lastPage = Math.min(first.meta?.last_page ?? 1, MAX_PAGES);
  for (let p = 2; p <= lastPage; p += 1) {
    const next = await opsApi.orders({ ...filters, page: p, per_page: PER_PAGE });
    rows.push(...next.data);
  }
  return {
    rows,
    totalCount: first.meta?.total ?? rows.length,
    truncated: (first.meta?.last_page ?? 1) > MAX_PAGES,
  };
}

interface SettlementRow {
  key: string;
  label: string;
  note: string;
  count: number;
  usdCents: number;
  khr: number;
}

/*
 * /admin/print/daily-sales?from=YYYY-MM-DD&to=YYYY-MM-DD: printable "Selling of the Day"
 * & cash settlement register for staff and admins. Summarises active orders, COD vs KHQR
 * collections, discounts/shipping, itemized ledger, and end-of-day sign-off.
 */
export default function DailySalesPrintPage() {
  const [params, setParams] = useSearchParams();
  const session = useStaff();
  const toPortal = usePortalPath();
  const today = shopToday();
  const yesterday = shiftDay(today, -1);
  const weekAgo = shiftDay(today, -6);

  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const from = rawFrom && DATE_RE.test(rawFrom) ? rawFrom : today;
  const to = rawTo && DATE_RE.test(rawTo) && rawTo >= from ? rawTo : from;

  const rawStatus = params.get("status");
  const status = rawStatus && STATUS_VALUES.has(rawStatus as OrderStatus | "waiting") ? (rawStatus as OrderStatus | "waiting") : undefined;
  const rawPay = params.get("pay");
  const paymentMethod = rawPay === "cod" || rawPay === "khqr" ? rawPay : undefined;

  const query = useQuery({
    queryKey: ["staff", "orders", "daily-sales-print", { from, to, status, paymentMethod }],
    queryFn: () => fetchAllOrders({ from, to, status, payment_method: paymentMethod }),
  });

  const setRange = (nextFrom: string, nextTo: string) => {
    const next = new URLSearchParams(params);
    next.set("from", nextFrom);
    next.set("to", nextTo);
    next.delete("autoprint");
    setParams(next, { replace: true });
  };

  const isSingleDay = from === to;
  const title = isSingleDay ? `Daily sales report · ${formatYmd(from)}` : `Sales register · ${formatYmd(from)} – ${formatYmd(to)}`;
  const backUrl = toPortal(`orders${from || to ? `?from=${from}&to=${to}` : ""}`);

  const data = query.data;
  const rows = data?.rows ?? [];
  const activeOrders = rows.filter((o) => o.status !== "cancelled");
  const cancelledOrders = rows.filter((o) => o.status === "cancelled");
  const returnedOrders = rows.filter((o) => o.status === "returned");

  const sumBucket = (list: StaffOrder[]) => ({
    count: list.length,
    usdCents: list.reduce((s, o) => s + toCents(o.total_usd), 0),
    khr: list.reduce((s, o) => s + toKhr(o.total_khr), 0),
  });

  const activeCopies = activeOrders.reduce((s, o) => s + (o.item_count ?? 0), 0);
  const activeSubtotalCents = activeOrders.reduce((s, o) => s + toCents(o.subtotal_usd), 0);
  const activeDiscountCents = activeOrders.reduce((s, o) => s + toCents(o.discount_usd), 0);
  const activeShippingCents = activeOrders.reduce((s, o) => s + toCents(o.shipping_fee_usd), 0);
  const activeTotalCents = activeOrders.reduce((s, o) => s + toCents(o.total_usd), 0);
  const activeTotalKhr = activeOrders.reduce((s, o) => s + toKhr(o.total_khr), 0);
  const creditUsedCents = activeOrders.reduce((s, o) => s + toCents(o.credit_used_usd), 0);

  const codPaid = sumBucket(activeOrders.filter((o) => o.payment_method === "cod" && o.payment_status === "succeeded" && o.status !== "returned"));
  const codPending = sumBucket(activeOrders.filter((o) => o.payment_method === "cod" && o.payment_status !== "succeeded" && o.status !== "returned"));
  const khqrPaid = sumBucket(activeOrders.filter((o) => o.payment_method === "khqr" && o.payment_status === "succeeded" && o.status !== "returned"));
  const khqrUnpaid = sumBucket(activeOrders.filter((o) => o.payment_method === "khqr" && o.payment_status !== "succeeded" && o.status !== "returned"));
  const cardPaid = sumBucket(activeOrders.filter((o) => o.payment_method === "card" && o.payment_status === "succeeded" && o.status !== "returned"));
  const returnedBucket = sumBucket(returnedOrders);
  const cancelledBucket = sumBucket(cancelledOrders);

  const totalCollectedCents = codPaid.usdCents + khqrPaid.usdCents + cardPaid.usdCents;
  const totalCollectedKhr = codPaid.khr + khqrPaid.khr + cardPaid.khr;
  const totalCollectedCount = codPaid.count + khqrPaid.count + cardPaid.count;

  const settlementRows: SettlementRow[] = [
    { key: "cod-paid", label: "Cash on delivery · Collected", note: "Cash received on delivered orders", ...codPaid },
    { key: "cod-pending", label: "Cash on delivery · Pending", note: "Awaiting delivery / courier handover", ...codPending },
    { key: "khqr-paid", label: "Bakong KHQR · Paid", note: "Bank transfer settled automatically", ...khqrPaid },
    ...(khqrUnpaid.count > 0 ? [{ key: "khqr-unpaid", label: "Bakong KHQR · Unpaid", note: "Waiting for customer QR scan", ...khqrUnpaid }] : []),
    ...(cardPaid.count > 0 ? [{ key: "card-paid", label: "Card · Paid", note: "Settled by card", ...cardPaid }] : []),
    ...(returnedBucket.count > 0 ? [{ key: "returned", label: "Returned orders", note: "Refunded / returned after delivery", ...returnedBucket }] : []),
  ];

  const hasKhr = rows.some((o) => toKhr(o.total_khr) > 0);
  const deliveredCount = activeOrders.filter((o) => o.status === "delivered").length;
  const inProgressCount = activeOrders.filter((o) => ["pending", "paid", "processing", "shipped"].includes(o.status ?? "")).length;

  const presetButton = (label: string, pFrom: string, pTo: string) => {
    const active = from === pFrom && to === pTo;
    return (
      <button
        key={label}
        type="button"
        onClick={() => setRange(pFrom, pTo)}
        className={cn(
          "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-semibold transition-colors sm:text-sm",
          active ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {label}
      </button>
    );
  };

  return (
    <PrintFrame
      title={title}
      backTo={backUrl}
      backLabel="All orders"
      printLabel="Print / Save as PDF"
      ready={query.isSuccess}
      controls={
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-surface-2/70 p-0.5">
            {presetButton("Today", today, today)}
            {presetButton("Yesterday", yesterday, yesterday)}
            {presetButton("Last 7 days", weekAgo, today)}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              aria-label="From date"
              value={from}
              max={to}
              onChange={(e) => e.target.value && setRange(e.target.value, e.target.value > to ? e.target.value : to)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs tabular-nums"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              min={from}
              onChange={(e) => e.target.value && setRange(from, e.target.value)}
              className="h-8 rounded-md border border-input bg-card px-2 text-xs tabular-nums"
            />
          </div>
        </div>
      }
      summary={
        query.isSuccess ? (
          <>
            {activeOrders.length} active {activeOrders.length === 1 ? "order" : "orders"} · {usd(activeTotalCents)}
          </>
        ) : null
      }
    >
      {query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : !data ? (
        <SkeletonGroup label="Loading daily sales…" className="paper-sheet paper grid gap-4">
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </SkeletonGroup>
      ) : (
        <article aria-label={title} className="paper-sheet paper grid content-start gap-6 text-[14px] leading-[1.45]">
          {/* Letterhead */}
          <header className="print-keep-together flex flex-wrap items-start justify-between gap-6 border-b-2 border-foreground pb-4">
            <div className="grid gap-1">
              <p className="font-display text-[2rem] leading-none text-primary">Bookly</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {shop.name} · Phnom Penh, Cambodia
                <br />
                {contact.phone} · Telegram {contact.telegram} · {contact.email}
              </p>
            </div>
            <div className="grid justify-items-end gap-1 text-right">
              <h2 className="font-display text-[1.7rem] leading-none">
                {isSingleDay ? "Daily sales & settlement" : "Sales & settlement register"}
              </h2>
              <p className="font-semibold tabular-nums">
                {isSingleDay ? formatYmd(from) : `${formatYmd(from)} – ${formatYmd(to)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                Printed {printedFmt.format(new Date())} ({policy.timezone})
                {session?.user.name ? ` · Prepared by ${session.user.name}` : ""}
              </p>
              {status || paymentMethod ? (
                <p className="text-xs font-semibold text-primary">
                  Filtered: {[status ? `Status = ${status}` : null, paymentMethod ? `Payment = ${paymentMethod.toUpperCase()}` : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </header>

          {/* Headline KPI strip */}
          {data.truncated ? (
            <div
              role="alert"
              className="rounded-sm border-2 border-warning bg-warning/10 px-3.5 py-2.5 text-xs font-medium text-foreground"
            >
              <strong className="font-bold">Partial register ({rows.length} of {data.totalCount} orders):</strong>{" "}
              This sheet caps at {MAX_PAGES * PER_PAGE} orders per print. Narrow the date range above so your cash
              settlement totals include every order in the period.
            </div>
          ) : null}
          <dl className="print-keep-together grid grid-cols-2 gap-3 tabular-nums sm:grid-cols-4">
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Active orders</dt>
              <dd className="mt-1 text-xl font-bold">{activeOrders.length}</dd>
              <p className="text-xs text-muted-foreground">
                {deliveredCount} delivered · {inProgressCount} open
                {cancelledOrders.length ? ` · ${cancelledOrders.length} cancelled` : ""}
              </p>
            </div>
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Books sold</dt>
              <dd className="mt-1 text-xl font-bold">{activeCopies}</dd>
              <p className="text-xs text-muted-foreground">
                {activeOrders.length ? `${(activeCopies / activeOrders.length).toFixed(1)} avg / order` : "no orders"}
              </p>
            </div>
            <div className="rounded-sm border-2 border-foreground p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Collected (paid)</dt>
              <dd className="mt-1 text-xl font-bold">{usd(totalCollectedCents)}</dd>
              <p className="text-xs text-muted-foreground">
                {hasKhr && totalCollectedKhr > 0 ? `≈ ${formatKhr(String(totalCollectedKhr))}` : `${totalCollectedCount} paid orders`}
              </p>
            </div>
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total order value</dt>
              <dd className="mt-1 text-xl font-bold">{usd(activeTotalCents)}</dd>
              <p className="text-xs text-muted-foreground">
                {hasKhr && activeTotalKhr > 0 ? `≈ ${formatKhr(String(activeTotalKhr))}` : `incl. ${usd(activeShippingCents)} delivery`}
              </p>
            </div>
          </dl>

          {/* Payment & Cash Settlement Reconciliation */}
          <section className="print-keep-together grid gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Payment & cash settlement breakdown
              </h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                Books subtotal {usd(activeSubtotalCents)}
                {activeDiscountCents > 0 ? ` · Discounts −${usd(activeDiscountCents)}` : ""}
                {activeShippingCents > 0 ? ` · Delivery +${usd(activeShippingCents)}` : ""}
                {creditUsedCents > 0 ? ` · Store credit ${usd(creditUsedCents)}` : ""}
              </span>
            </div>
            <table className="w-full border-collapse text-left text-[13.5px] tabular-nums">
              <thead>
                <tr className="border-b border-foreground text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Channel & status</th>
                  <th scope="col" className="w-20 py-1.5 pr-3 text-right font-semibold">Orders</th>
                  <th scope="col" className="w-28 py-1.5 pr-3 text-right font-semibold">USD</th>
                  {hasKhr ? <th scope="col" className="w-32 py-1.5 text-right font-semibold">KHR (approx.)</th> : null}
                </tr>
              </thead>
              <tbody>
                {settlementRows.map((row) => (
                  <tr key={row.key} className="border-b border-border">
                    <td className="py-2 pr-3">
                      <span className="font-semibold">{row.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{row.note}</span>
                    </td>
                    <td className="py-2 pr-3 text-right">{row.count}</td>
                    <td className="py-2 pr-3 text-right font-medium">{usd(row.usdCents)}</td>
                    {hasKhr ? <td className="py-2 text-right text-muted-foreground">{row.khr > 0 ? formatKhr(String(row.khr)) : "—"}</td> : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-foreground font-bold">
                  <td className="py-2 pr-3">Total settled (Cash collected + KHQR paid)</td>
                  <td className="py-2 pr-3 text-right">{totalCollectedCount}</td>
                  <td className="py-2 pr-3 text-right">{usd(totalCollectedCents)}</td>
                  {hasKhr ? <td className="py-2 text-right">{totalCollectedKhr > 0 ? formatKhr(String(totalCollectedKhr)) : "—"}</td> : null}
                </tr>
                {codPending.count > 0 ? (
                  <tr className="border-t border-border font-semibold text-primary">
                    <td className="py-1.5 pr-3">Outstanding COD cash with courier / awaiting delivery</td>
                    <td className="py-1.5 pr-3 text-right">{codPending.count}</td>
                    <td className="py-1.5 pr-3 text-right">{usd(codPending.usdCents)}</td>
                    {hasKhr ? <td className="py-1.5 text-right">{codPending.khr > 0 ? formatKhr(String(codPending.khr)) : "—"}</td> : null}
                  </tr>
                ) : null}
                {cancelledBucket.count > 0 ? (
                  <tr className="border-t border-border text-xs text-muted-foreground">
                    <td className="py-1.5 pr-3">Excluded: cancelled orders</td>
                    <td className="py-1.5 pr-3 text-right">{cancelledBucket.count}</td>
                    <td className="py-1.5 pr-3 text-right">{usd(cancelledBucket.usdCents)}</td>
                    {hasKhr ? <td className="py-1.5 text-right">—</td> : null}
                  </tr>
                ) : null}
              </tfoot>
            </table>
          </section>

          {/* Itemized Order Register */}
          <section className="grid gap-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                Order register ({rows.length}{data.truncated ? ` of ${data.totalCount} — narrow date range for full list` : ""})
              </h3>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-sm border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No orders were placed in this period.
              </p>
            ) : (
              <table className="w-full border-collapse text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b-2 border-foreground text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th scope="col" className="w-7 py-2 pr-2 font-semibold">#</th>
                    <th scope="col" className="py-2 pr-2.5 font-semibold">Order & time</th>
                    <th scope="col" className="py-2 pr-2.5 font-semibold">Customer</th>
                    <th scope="col" className="w-12 py-2 pr-2.5 text-right font-semibold">Qty</th>
                    <th scope="col" className="py-2 pr-2.5 font-semibold">Payment</th>
                    <th scope="col" className="py-2 pr-2.5 font-semibold">Status</th>
                    <th scope="col" className="w-20 py-2 pr-2.5 text-right font-semibold">Discount</th>
                    <th scope="col" className="w-24 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order, index) => {
                    const cancelled = order.status === "cancelled";
                    const disc = toCents(order.discount_usd);
                    const paid = order.payment_status === "succeeded";
                    return (
                      <tr key={order.id} className={cn("border-b border-border align-top", cancelled && "text-muted-foreground line-through")}>
                        <td className="py-2 pr-2 text-muted-foreground">{index + 1}</td>
                        <td className="py-2 pr-2.5 whitespace-nowrap">
                          <span className="block font-semibold">{order.order_number}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {order.placed_at ? timeFmt.format(new Date(order.placed_at)) : ""}
                          </span>
                        </td>
                        <td className="py-2 pr-2.5">
                          <span className="block font-medium">{order.customer?.name ?? order.shipping_address?.recipient_name ?? "—"}</span>
                          {order.shipping_address?.city ? (
                            <span className="block text-[11px] text-muted-foreground">{order.shipping_address.city}</span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-2.5 text-right">{order.item_count ?? 0}</td>
                        <td className="py-2 pr-2.5 whitespace-nowrap">
                          <span className="font-medium">{paymentLabels[order.payment_method ?? ""] ?? order.payment_method}</span>
                          <span className={cn("block text-[11px] font-semibold", paid ? "text-success" : "text-muted-foreground")}>
                            {paid ? "Paid" : "Unpaid"}
                          </span>
                        </td>
                        <td className="py-2 pr-2.5 whitespace-nowrap">
                          <span className="text-xs font-semibold uppercase tracking-wide">
                            {statusLabels[order.status ?? ""] ?? order.status}
                          </span>
                        </td>
                        <td className="py-2 pr-2.5 text-right whitespace-nowrap">
                          {disc > 0 ? (
                            <>
                              <span>−{usd(disc)}</span>
                              {order.coupon_code ? <span className="block text-[10px] text-muted-foreground">{order.coupon_code}</span> : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2 text-right font-semibold whitespace-nowrap">{formatUsd(order.total_usd)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-foreground font-bold">
                    <td colSpan={3} className="py-2.5 pr-2.5 text-right text-xs uppercase tracking-[0.1em] text-muted-foreground">
                      Active orders total ({activeOrders.length})
                    </td>
                    <td className="py-2.5 pr-2.5 text-right">{activeCopies}</td>
                    <td colSpan={2} />
                    <td className="py-2.5 pr-2.5 text-right">{activeDiscountCents > 0 ? `−${usd(activeDiscountCents)}` : "—"}</td>
                    <td className="py-2.5 text-right">{usd(activeTotalCents)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>

          {/* End-of-day sign-off */}
          <footer className="print-keep-together grid grid-cols-3 gap-6 pt-8 text-xs sm:text-sm">
            <p className="border-t border-foreground pt-2">Prepared by (Staff)</p>
            <p className="border-t border-foreground pt-2">Cash counted (USD / KHR)</p>
            <p className="border-t border-foreground pt-2">Verified by (Manager)</p>
          </footer>
        </article>
      )}
    </PrintFrame>
  );
}
