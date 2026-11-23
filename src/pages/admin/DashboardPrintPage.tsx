import { useQuery } from "@tanstack/react-query";
import { ReceiptText } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { insightsQueries } from "@/api/endpoints/dashboardInsights";
import { reportQueries } from "@/api/endpoints/reports";
import { staffQueries } from "@/api/endpoints/staff";
import { ErrorState } from "@/components/ui/error-state";
import { contact, policy, shop } from "@/content/shop";
import { rangeDays, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { PaymentMethods } from "@/features/admin/dashboard/PaymentMethods";
import { useStaff } from "@/features/admin/staffSession";
import { PrintFrame } from "@/features/orders/documents/PrintFrame";
import { staffDailySalesPrintPath } from "@/features/orders/documents/printLinks";
import { useT } from "@/i18n";
import { formatKhr, formatUsd } from "@/stores/currency";

const printedFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: policy.timezone });
const toCents = (value: string | null | undefined) => Math.round(Number(value ?? 0) * 100);
const usd = (cents: number) => formatUsd((cents / 100).toFixed(2));
const statusLabels: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

function Rows({ title, rows }: { title: string; rows: Array<[string, string | number]> }) {
  return (
    <section className="print-keep-together grid content-start gap-2">
      <h2 className="border-b border-foreground pb-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">—</p>
      ) : (
        <table className="w-full border-collapse text-left text-[13.5px]">
          <tbody>
            {rows.map(([label, value], index) => (
              <tr key={`${label}-${index}`} className="border-b border-border/80">
                <th scope="row" className="py-1.5 pr-3 font-normal">{label}</th>
                <td className="py-1.5 text-right font-semibold tabular-nums whitespace-nowrap">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function DashboardPrintPage() {
  const [params] = useSearchParams();
  const session = useStaff();
  const range = rangeFromParams(params);
  const days = rangeDays(range);
  const summary = useQuery(staffQueries.summary(range));
  const insights = useQuery(insightsQueries.get(range));
  // Optional enrichment queries: never block the page or fail tests if unavailable.
  const sales = useQuery({ ...reportQueries.report("sales", days), retry: false });
  const profit = useQuery({ ...reportQueries.report("profit", days), retry: false });

  const { dict } = useT();
  const t = dict.dashboardPrint;
  const s = summary.data;
  const data = insights.data;
  const ready = !!s && !!data && !summary.isPlaceholderData && !insights.isPlaceholderData;
  const back = `/admin/reports?${new URLSearchParams(rangeToParams(range)).toString()}`;
  const registerHref = staffDailySalesPrintPath({ from: s?.period.from ?? days.from, to: s?.period.to ?? days.to });

  const salesTotals = sales.data?.totals;
  const profitTotals = profit.data?.totals;
  const discounts = salesTotals ? toCents(salesTotals.discount_usd) : 0;
  const shipping = salesTotals ? toCents(salesTotals.shipping_usd) : 0;
  const refunds = salesTotals ? toCents(salesTotals.refunds_usd) : 0;
  const bookSales = salesTotals ? toCents(salesTotals.gross_revenue_usd) - shipping : 0;
  const bookFull = bookSales + discounts;

  return (
    <PrintFrame
      title={t.title}
      backTo={back}
      backLabel={t.back}
      printLabel={t.print}
      ready={ready}
      controls={
        <Link
          to={registerHref}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-surface-2/70 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-card hover:text-primary sm:text-sm"
        >
          <ReceiptText className="size-3.5" aria-hidden="true" />
          Daily sales register
        </Link>
      }
    >
      {summary.isError || insights.isError ? (
        <ErrorState
          error={summary.error ?? insights.error}
          onRetry={() => {
            void summary.refetch();
            void insights.refetch();
          }}
          headingLevel="h2"
          showHomeLink={false}
        />
      ) : !ready || !s || !data ? (
        <p role="status" className="paper-sheet paper">{t.loading}</p>
      ) : (
        <article className="paper-sheet paper dashboard-print-sheet grid content-start gap-6 text-[14px] leading-[1.45]">
          {/* Letterhead */}
          <header className="print-keep-together flex flex-wrap items-start justify-between gap-6 border-b-2 border-foreground pb-4">
            <div className="grid gap-1">
              <p className="font-display text-[2rem] leading-none text-primary">Bookly</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {shop.name} · Phnom Penh, Cambodia
                <br />
                {contact.email} · {contact.phone}
              </p>
            </div>
            <div className="grid justify-items-end gap-1 text-right">
              <h2 className="font-display text-[1.75rem] leading-none">{t.title}</h2>
              <p className="font-semibold tabular-nums">
                {t.period}: {s.period.from} – {s.period.to} · {s.period.timezone}
              </p>
              <p className="text-xs text-muted-foreground">
                Printed {printedFmt.format(new Date())}
                {session?.user.name ? ` · Prepared by ${session.user.name}` : ""} · Cash basis (delivered less refunds)
              </p>
            </div>
          </header>

          {/* Executive KPI strip */}
          <dl className="print-keep-together grid grid-cols-2 gap-3 tabular-nums sm:grid-cols-4">
            <div className="rounded-sm border-2 border-foreground p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.revenue}</dt>
              <dd className="mt-1 text-xl font-bold">{formatUsd(s.revenue.net_usd)}</dd>
              <p className="text-xs text-muted-foreground">
                {salesTotals?.net_revenue_khr ? `≈ ${formatKhr(salesTotals.net_revenue_khr)}` : `${formatUsd(s.revenue.gross_usd)} gross − ${formatUsd(s.revenue.refunds_usd)} ref.`}
              </p>
            </div>
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.orders}</dt>
              <dd className="mt-1 text-xl font-bold">{s.orders_placed}</dd>
              <p className="text-xs text-muted-foreground">{s.delivered_orders} delivered · {t.average} {formatUsd(s.average_order_value_usd)}</p>
            </div>
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dict.dashboardCopies.books}</dt>
              <dd className="mt-1 text-xl font-bold">{s.books_sold ?? "—"}</dd>
              <p className="text-xs text-muted-foreground">
                {s.ebooks_sold !== undefined ? `${dict.dashboardCopies.ebooks}: ${s.ebooks_sold}` : "copies sold"}
              </p>
            </div>
            <div className="rounded-sm border border-border p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t.customers}</dt>
              <dd className="mt-1 text-xl font-bold">{s.new_customers}</dd>
              <p className="text-xs text-muted-foreground">{t.repeat}: {data.repeat_customer_rate.percent}%</p>
            </div>
          </dl>

          {/* Financial Reconciliation: Net Revenue Bridge + Profit & Margin (when loaded) */}
          {salesTotals ? (
            <section className="print-keep-together grid gap-2.5 rounded-sm border border-border p-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Net revenue bridge</h2>
              <dl className="grid grid-cols-3 gap-3 tabular-nums sm:grid-cols-6">
                <div>
                  <dt className="text-[11px] text-muted-foreground">Full book price</dt>
                  <dd className="font-semibold">{usd(bookFull)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Discounts</dt>
                  <dd className="font-semibold text-destructive">{discounts > 0 ? `−${usd(discounts)}` : "$0.00"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Book sales</dt>
                  <dd className="font-semibold text-primary">{usd(bookSales)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Delivery fees</dt>
                  <dd className="font-semibold">{shipping > 0 ? `+${usd(shipping)}` : "$0.00"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted-foreground">Refunds</dt>
                  <dd className="font-semibold text-destructive">{refunds > 0 ? `−${usd(refunds)}` : "$0.00"}</dd>
                </div>
                <div className="border-l border-border pl-3">
                  <dt className="text-[11px] font-semibold text-muted-foreground">Net revenue</dt>
                  <dd className="text-base font-bold">{formatUsd(salesTotals.net_revenue_usd)}</dd>
                </div>
              </dl>
              {profitTotals ? (
                <dl className="mt-2 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs tabular-nums sm:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">Cost of goods (COGS)</dt>
                    <dd className="text-sm font-semibold">{formatUsd(profitTotals.cost_of_goods_usd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Gross profit</dt>
                    <dd className="text-sm font-semibold">
                      {formatUsd(profitTotals.gross_profit_usd)}
                      {profitTotals.margin_percent != null ? ` (${profitTotals.margin_percent.toFixed(1)}%)` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Profit after refunds</dt>
                    <dd className="text-sm font-bold text-success">{formatUsd(profitTotals.profit_after_refunds_usd)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Restock spend</dt>
                    <dd className="text-sm font-semibold">{formatUsd(profitTotals.restock_spend_usd)} ({profitTotals.restock_units} copies)</dd>
                  </div>
                </dl>
              ) : null}
            </section>
          ) : null}

          {/* Two-column operational & marketing breakdown */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Rows
              title={t.statuses}
              rows={Object.entries(s.orders_by_status).map(([key, value]) => [statusLabels[key] ?? key, value])}
            />
            <section className="print-keep-together grid content-start gap-2">
              <h2 className="border-b border-foreground pb-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                {dict.dashboardAnalysis.payments}
              </h2>
              <p className="text-xs text-muted-foreground">{dict.dashboardAnalysis.paymentNote}</p>
              {data.payment_methods ? <PaymentMethods rows={data.payment_methods} /> : <p className="text-sm text-muted-foreground">{t.none}</p>}
            </section>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Rows title={t.best} rows={s.best_sellers.map((book) => [book.title, `${book.copies_sold} copies`])} />
            <Rows title={t.categories} rows={(s.top_categories ?? []).map((category) => [category.name, `${category.copies_sold} copies`])} />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Rows
              title={t.promotions}
              rows={[
                [t.offer, data.promotions.offer_orders],
                [t.coupon, data.promotions.coupon_orders],
                ...(data.promotions.gift_orders === undefined ? [] : [[t.gift, data.promotions.gift_orders] as [string, number]]),
                ...(data.cart_reminder_recovery
                  ? [
                      [`${dict.dashboardAnalysis.reminder} · ${dict.dashboardAnalysis.sent}`, data.cart_reminder_recovery.sent] as [string, number],
                      [`${dict.dashboardAnalysis.reminder} · ${dict.dashboardAnalysis.recovered}`, `${data.cart_reminder_recovery.recovered} (${data.cart_reminder_recovery.percent}%)`] as [string, string],
                    ]
                  : []),
              ]}
            />
            <Rows
              title={dict.dashboardBuyers.title}
              rows={[
                [t.repeat, `${data.repeat_customer_rate.percent}%`],
                [t.returning, data.repeat_customer_rate.returning],
                [t.firstTime, Math.max(0, data.repeat_customer_rate.customers - data.repeat_customer_rate.returning)],
                [t.ratings, data.order_ratings?.average ?? t.none],
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Rows title={t.provinces} rows={data.provinces.map((province) => [province.name, province.orders])} />
            {data.delivery_areas ? (
              <Rows
                title={dict.dashboardAreas.title}
                rows={[
                  [dict.dashboardAreas.phnomPenh, data.delivery_areas.phnom_penh],
                  [dict.dashboardAreas.provinces, data.delivery_areas.provinces],
                  [dict.dashboardAreas.unknown, data.delivery_areas.unknown],
                ]}
              />
            ) : null}
          </div>

          {/* Management Sign-Off */}
          <footer className="print-keep-together grid grid-cols-3 gap-6 pt-8 text-xs sm:text-sm">
            <p className="border-t border-foreground pt-2">Prepared by</p>
            <p className="border-t border-foreground pt-2">Reviewed by (Manager)</p>
            <p className="border-t border-foreground pt-2">Date</p>
          </footer>
        </article>
      )}
    </PrintFrame>
  );
}
