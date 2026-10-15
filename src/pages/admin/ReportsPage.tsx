import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDown, Download } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { reportQueries, reportsApi, type ReportGroup, type ReportName, type ReportRange } from "@/api/endpoints/reports";
import type { OrderStatus } from "@/api/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPage } from "@/features/admin/AdminPage";
import { day, daysIn, rangeDays, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { BarList, ColumnChart, DataTable, TrendChart, type Point } from "@/features/admin/reports/charts";
import { Change, CustomRange, Khr, Panel, PeriodPicker, Tile } from "@/features/admin/reportKit";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";

/*
 * /admin/reports (admin only): the shop's numbers for a period, one subject per tab, each with a CSV export.
 * Same period picker and money rules as the dashboard (cash basis: delivered orders less refunds; riel at
 * today's rate). Charts use one colour; every chart has its numbers in a table too.
 */

const TABS: Array<{ value: ReportName; label: string }> = [
  { value: "sales", label: "Sales" },
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products" },
  { value: "customers", label: "Customers" },
  { value: "funnel", label: "Funnel" },
  { value: "coupons", label: "Coupons & refunds" },
];
const GROUPS: Array<{ value: ReportGroup; label: string }> = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

const isTab = (value: string | null): value is ReportName => TABS.some((t) => t.value === value);
const usd = (n: number) => formatUsd(n);
const usdAxis = (n: number) => (n >= 1000 ? `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${n}`);
const count = (n: number) => n.toLocaleString("en-US");
const percent = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const bucketLabel = (date: string, group: ReportGroup) => {
  const d = new Date(`${date}T00:00:00Z`);
  return group === "month" ? monthName.format(d) : group === "week" ? `Week of ${shortDay.format(d)}` : shortDay.format(d);
};
/** Days for up to 2 months, weeks up to 6 months, months beyond. */
const autoGroup = (range: ReportRange): ReportGroup => {
  const n = daysIn(range.from, range.to);
  return n <= 62 ? "day" : n <= 183 ? "week" : "month";
};

function Loading() {
  return (
    <SkeletonGroup label="Loading report…" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </SkeletonGroup>
  );
}

/** A report's data with its loading and error states. */
function useReport<N extends ReportName>(name: N, range: ReportRange, group?: ReportGroup) {
  return useQuery(reportQueries.report(name, group ? { ...range, group } : range));
}

function State({ query, children }: { query: { isError: boolean; error: unknown; data: unknown; refetch: () => unknown; isPlaceholderData: boolean }; children: () => ReactNode }) {
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />;
  if (!query.data) return <Loading />;
  return <div className={cn("grid gap-6", query.isPlaceholderData && "opacity-60 transition-opacity")}>{children()}</div>;
}

/** Rows with a thin bar each: a count and its share of the total (order statuses, areas, payment methods). */
function ShareList({ rows, label }: { rows: Array<{ key: string; name: ReactNode; value: number }>; label: string }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <ul className="grid gap-3" aria-label={label}>
      {rows.map((r) => {
        const share = total > 0 ? (r.value / total) * 100 : 0;
        return (
          <li key={r.key} className="grid gap-1.5">
            <div className="flex items-center justify-between gap-3 text-[15px] tabular-nums">
              <span className="min-w-0">{r.name}</span>
              <span>
                <span className="font-semibold">{count(r.value)}</span> <span className="text-muted-foreground">· {percent(share)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted-foreground">{children}</p>;
}

function SalesTab({ range, versus }: { range: ReportRange; versus: string }) {
  const [params, setParams] = useSearchParams();
  const chosen = params.get("group");
  const group: ReportGroup = GROUPS.some((g) => g.value === chosen) ? (chosen as ReportGroup) : autoGroup(range);
  const query = useReport("sales", range, group);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const t = r.totals;
        const c = r.comparison;
        const points: Point[] = r.series.map((p) => ({
          label: bucketLabel(p.date, group),
          value: Number(p.net_revenue_usd),
          tooltip: `${p.orders_count} delivered · ${formatUsd(p.gross_revenue_usd)} before refunds`,
        }));
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Tile label="Net revenue" value={formatUsd(t.net_revenue_usd)} khr={t.net_revenue_khr} change={<Change percent={c.change_percent.net_revenue} previous={Number(c.totals.net_revenue_usd)} versus={versus} />} />
              <Tile label="Delivered orders" value={count(t.orders_count)} detail={`${count(t.orders_placed)} placed`} change={<Change percent={c.change_percent.orders_count} previous={c.totals.orders_count} versus={versus} />} />
              <Tile label="Average order" value={formatUsd(t.average_order_value_usd)} khr={t.average_order_value_khr} change={<Change percent={c.change_percent.average_order_value} previous={Number(c.totals.average_order_value_usd)} versus={versus} />} />
              <Tile label="Books sold" value={count(t.items_sold)} change={<Change percent={c.change_percent.items_sold} previous={c.totals.items_sold} versus={versus} />} />
            </div>
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatUsd(t.gross_revenue_usd)} from delivered orders, less {formatUsd(t.refunds_usd)} refunded · discounts given {formatUsd(t.discount_usd)} · delivery fees {formatUsd(t.shipping_usd)}
            </p>
            <Panel
              id="sales-trend"
              title={`Net revenue by ${group}`}
              action={
                <div role="radiogroup" aria-label="Group by" className="inline-flex rounded-md border border-border p-1">
                  {GROUPS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      role="radio"
                      aria-checked={group === g.value}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set("group", g.value);
                        setParams(next, { replace: true });
                      }}
                      className={cn("min-h-8 rounded-[4px] px-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", group === g.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              }
            >
              {points.every((p) => p.value === 0) ? <Empty>No delivered orders or refunds in this period.</Empty> : <TrendChart points={points} label={`Net revenue by ${group}`} format={usd} axisFormat={usdAxis} />}
              <DataTable caption={`Net revenue by ${group}`} head={[group === "day" ? "Day" : group === "week" ? "Week" : "Month", "Net revenue"]} rows={points.map((p) => [p.label, usd(p.value)])} />
            </Panel>
          </>
        );
      }}
    </State>
  );
}

function OrdersTab({ range, versus }: { range: ReportRange; versus: string }) {
  const query = useReport("orders", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const c = r.comparison;
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile label="Orders placed" value={count(r.total_orders)} change={<Change percent={c.change_percent.total_orders} previous={c.total_orders} versus={versus} />} />
              <Tile label="Cancelled" value={percent(r.cancellation_rate)} detail="of orders placed" change={<Change percent={c.change_percent.cancellation_rate} previous={c.cancellation_rate} versus={versus} moreIsBetter={false} />} />
              <Tile
                label="Average time to deliver"
                value={r.average_delivery_hours == null ? "–" : r.average_delivery_hours >= 48 ? `${(r.average_delivery_hours / 24).toFixed(1)} days` : `${r.average_delivery_hours} hours`}
                detail="placed → delivered"
                change={<Change percent={c.change_percent.average_delivery_hours} previous={c.average_delivery_hours ?? 0} versus={versus} moreIsBetter={false} />}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel id="orders-status" title="Orders placed by status">
                {r.total_orders === 0 ? <Empty>No orders placed in this period.</Empty> : <ShareList label="Orders by status" rows={Object.entries(r.orders_by_status).map(([status, n]) => ({ key: status, name: <OrderStatusBadge status={status as OrderStatus} />, value: n }))} />}
              </Panel>
              <div className="grid content-start gap-6">
                <Panel id="orders-area" title="Delivery area">
                  {r.total_orders === 0 ? <Empty>No orders placed in this period.</Empty> : <ShareList label="Orders by delivery area" rows={[{ key: "pp", name: "Phnom Penh", value: r.orders_by_delivery_area.phnom_penh }, { key: "prov", name: "Provinces", value: r.orders_by_delivery_area.provinces }]} />}
                </Panel>
                <Panel id="orders-payment" title="Payment method">
                  {r.total_orders === 0 ? (
                    <Empty>No orders placed in this period.</Empty>
                  ) : (
                    <ShareList
                      label="Orders by payment method"
                      rows={Object.entries(r.orders_by_payment_method).map(([method, n]) => ({ key: method, name: { cod: "Cash on delivery", card: "Card", khqr: "Bakong KHQR" }[method] ?? method, value: n }))}
                    />
                  )}
                </Panel>
              </div>
            </div>
          </>
        );
      }}
    </State>
  );
}

function ProductsTab({ range }: { range: ReportRange }) {
  const query = useReport("products", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const top = r.best_sellers_by_revenue.map((b) => ({ label: `${b.title} (${formatLabel(b.format)})`, value: Number(b.revenue_usd), tooltip: `${b.units_sold} sold` }));
        const categories = r.revenue_by_category.map((c) => ({ label: c.name, value: Number(c.revenue_usd), tooltip: `${c.units_sold} sold` }));
        return (
          <>
            <Panel id="products-top" title="Best sellers by sales" action={<span className="text-sm text-muted-foreground">orders placed, not cancelled</span>}>
              {top.length === 0 ? <Empty>No sales in this period.</Empty> : <BarList points={top} label="Best sellers by sales" format={usd} />}
              <DataTable caption="Best sellers by sales" head={["Book", "Sales"]} rows={top.map((t) => [t.label, usd(t.value)])} />
            </Panel>
            <Panel id="products-copies" title="Best sellers by copies">
              {r.best_sellers_by_units.length === 0 ? (
                <Empty>No sales in this period.</Empty>
              ) : (
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Best sellers table">
                <table className="w-full min-w-[32rem] text-left text-[15px] tabular-nums">
                  <thead className="text-sm text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-normal">#</th>
                      <th scope="col" className="pb-2 font-normal">Book</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Copies</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {r.best_sellers_by_units.map((b, i) => (
                      <tr key={b.variant_id}>
                        <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                        <th scope="row" className="py-2 pr-3 font-normal">
                          <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                            {b.title}
                          </Link>
                          <span className="block text-sm text-muted-foreground">{formatLabel(b.format)}</span>
                        </th>
                        <td className="py-2 pl-4 text-right">{count(b.units_sold)}</td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">
                          {formatUsd(b.revenue_usd)}
                          <Khr value={b.revenue_khr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </Panel>
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel id="products-categories" title="Sales by category">
                {categories.length === 0 ? <Empty>No categorised sales in this period.</Empty> : <BarList points={categories} label="Sales by category" format={usd} />}
                <DataTable caption="Sales by category" head={["Category", "Sales"]} rows={categories.map((c) => [c.label, usd(c.value)])} />
              </Panel>
              <Panel id="products-low" title="Low stock" action={<Link to="/admin/books" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">All books</Link>}>
                {r.low_stock.length === 0 ? (
                  <Empty>Every printed format is above its low-stock level.</Empty>
                ) : (
                  <ul className="divide-y divide-border">
                    {r.low_stock.map((v) => (
                      <li key={v.book_variant_id}>
                        <Link to={`/admin/books/${v.book_id}`} className="flex items-center justify-between gap-3 py-2 text-[15px] outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{v.title}</span>
                            <span className="block text-sm text-muted-foreground">
                              {formatLabel(v.format)} · {v.sku}
                            </span>
                          </span>
                          <span className={cn("flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums", v.stock_quantity === 0 ? "text-destructive" : "text-warning")}>
                            <AlertTriangle className="size-4" aria-hidden="true" />
                            {v.stock_quantity === 0 ? "Out of stock" : `${v.stock_quantity} left`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            <Panel id="products-slow" title="Slow sellers with stock" action={<span className="text-sm text-muted-foreground">fewest copies sold in this period</span>}>
              {r.worst_sellers.length === 0 ? (
                <Empty>No books in stock.</Empty>
              ) : (
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Slow sellers table">
                  <table className="w-full min-w-[28rem] text-left text-[15px] tabular-nums">
                    <thead className="text-sm text-muted-foreground">
                      <tr>
                        <th scope="col" className="pb-2 font-normal">Book</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">In stock</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Copies sold</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.worst_sellers.map((b) => (
                        <tr key={b.variant_id}>
                          <th scope="row" className="py-2 pr-3 font-normal">
                            <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                              {b.title}
                            </Link>
                            <span className="block text-sm text-muted-foreground">{formatLabel(b.format)}</span>
                          </th>
                          <td className="py-2 pl-4 text-right">{count(b.stock_quantity ?? 0)}</td>
                          <td className="py-2 pl-4 text-right">{count(b.units_sold)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        );
      }}
    </State>
  );
}

function CustomersTab({ range, versus }: { range: ReportRange; versus: string }) {
  const query = useReport("customers", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const c = r.comparison;
        const points = r.new_customers_series.map((p) => ({ label: shortDay.format(new Date(`${p.date}T00:00:00Z`)), value: p.new_customers }));
        return (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Tile label="New customers" value={count(r.total_new_customers)} detail="verified their account" change={<Change percent={c.change_percent.total_new_customers} previous={c.total_new_customers} versus={versus} />} />
              <Tile label="Came back" value={percent(r.returning_customer_rate)} detail="of customers in this period ordered more than once" change={<Change percent={c.change_percent.returning_customer_rate} previous={c.returning_customer_rate} versus={versus} />} />
            </div>
            <Panel id="customers-new" title="New customers by day">
              {r.total_new_customers === 0 ? <Empty>No new verified customers in this period.</Empty> : <ColumnChart points={points} label="New customers by day" format={count} />}
              <DataTable caption="New customers by day" head={["Day", "New customers"]} rows={points.map((p) => [p.label, count(p.value)])} />
            </Panel>
            <Panel id="customers-top" title="Top customers" action={<span className="text-sm text-muted-foreground">by spend on orders placed</span>}>
              {r.top_customers.length === 0 ? (
                <Empty>No orders in this period.</Empty>
              ) : (
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Top customers table">
                  <table className="w-full min-w-[32rem] text-left text-[15px] tabular-nums">
                    <thead className="text-sm text-muted-foreground">
                      <tr>
                        <th scope="col" className="pb-2 font-normal">Customer</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Orders</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Spent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.top_customers.map((cu) => (
                        <tr key={cu.customer_id}>
                          <th scope="row" className="py-2 pr-3 font-normal">
                            <Link to={`/admin/customers/${cu.customer_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                              {cu.name ?? "Closed account"}
                            </Link>
                            {cu.email ? <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">{cu.email}</span> : null}
                          </th>
                          <td className="py-2 pl-4 text-right">{count(cu.orders_count)}</td>
                          <td className="whitespace-nowrap py-2 pl-4 text-right">
                            {formatUsd(cu.total_spent_usd)}
                            <Khr value={cu.total_spent_khr} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        );
      }}
    </State>
  );
}

function FunnelTab({ range }: { range: ReportRange }) {
  const query = useReport("funnel", range);
  return (
    <State query={query}>
      {() => {
        const steps = query.data!.steps;
        const first = steps[0]?.count ?? 0;
        return (
          <Panel id="funnel" title="From cart to delivery" action={<span className="text-sm text-muted-foreground">carts are an estimate; visits are not tracked</span>}>
            {first === 0 ? (
              <Empty>No carts or orders in this period.</Empty>
            ) : (
              <ol className="grid gap-2">
                {steps.map((step, i) => (
                  <li key={step.key} className="grid gap-2">
                    {i > 0 ? (
                      <p className="flex items-center gap-1.5 pl-1 text-sm text-muted-foreground tabular-nums">
                        <ArrowDown className="size-4" aria-hidden="true" /> {percent(step.step_conversion_rate)} of the step before
                      </p>
                    ) : null}
                    <div className="grid gap-1.5 rounded-lg border border-border p-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{step.name}</span>
                        <span className="tabular-nums">
                          <span className="text-lg font-semibold">{count(step.count)}</span> <span className="text-sm text-muted-foreground">· {percent(step.conversion_rate)} of carts</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${first ? (step.count / first) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        );
      }}
    </State>
  );
}

function CouponsTab({ range }: { range: ReportRange }) {
  const query = useReport("coupons", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        return (
          <>
            <Panel id="coupons" title="Coupons used" action={<span className="text-sm text-muted-foreground">orders placed, not cancelled</span>}>
              {r.coupons.length === 0 ? (
                <Empty>No coupons used in this period.</Empty>
              ) : (
                <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Coupons table">
                  <table className="w-full min-w-[32rem] text-left text-[15px] tabular-nums">
                    <thead className="text-sm text-muted-foreground">
                      <tr>
                        <th scope="col" className="pb-2 font-normal">Code</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Used</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Discount given</th>
                        <th scope="col" className="pb-2 pl-4 text-right font-normal">Order totals</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {r.coupons.map((cp) => (
                        <tr key={cp.coupon_id}>
                          <th scope="row" className="py-2 pr-3 font-normal">
                            <span className="font-semibold uppercase tracking-wide">{cp.code}</span>
                            <span className="block text-sm text-muted-foreground">{cp.type === "percentage" ? `${Number(cp.value)}% off` : `${formatUsd(cp.value)} off`}</span>
                          </th>
                          <td className="py-2 pl-4 text-right">{count(cp.times_used)}</td>
                          <td className="whitespace-nowrap py-2 pl-4 text-right">
                            {formatUsd(cp.discount_usd)}
                            <Khr value={cp.discount_khr} />
                          </td>
                          <td className="whitespace-nowrap py-2 pl-4 text-right">{formatUsd(cp.revenue_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Tile label="Refunded" value={formatUsd(r.refunds.amount_usd)} khr={r.refunds.amount_khr} detail={`${count(r.refunds.count)} ${r.refunds.count === 1 ? "return" : "returns"} paid back in this period`} />
              <Panel id="refund-reasons" title="Refunds by reason">
                {r.refunds.by_reason.length === 0 ? (
                  <Empty>No refunds in this period.</Empty>
                ) : (
                  <ul className="divide-y divide-border">
                    {r.refunds.by_reason.map((reason, i) => (
                      <li key={i} className="flex items-baseline justify-between gap-3 py-2 text-[15px] tabular-nums">
                        <span className="min-w-0 [overflow-wrap:anywhere]">{reason.reason || "No reason given"}</span>
                        <span className="shrink-0">
                          <span className="font-semibold">{formatUsd(reason.amount_usd)}</span> <span className="text-muted-foreground">· {count(reason.count)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </>
        );
      }}
    </State>
  );
}

export default function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const range = rangeFromParams(params);
  const days = rangeDays(range);
  const [picking, setPicking] = useState(range.period === "custom");
  const [exporting, setExporting] = useState(false);
  const active = picking ? "custom" : range.period;
  const tabParam = params.get("tab");
  const tab: ReportName = isTab(tabParam) ? tabParam : "sales";
  const length = daysIn(days.from, days.to);
  const before = { to: new Date(Date.parse(`${days.from}T00:00:00Z`) - 86_400_000), from: new Date(Date.parse(`${days.from}T00:00:00Z`) - length * 86_400_000) };
  const versus = `vs ${length === 1 ? shortDay.format(before.to) : `${shortDay.format(before.from)} – ${shortDay.format(before.to)}`}`;

  /** Keeps the tab when the period changes, and the period when the tab changes. */
  const update = (next: Record<string, string>, keep: "tab" | "period") => {
    const merged = new URLSearchParams(next);
    if (keep === "tab" && tab !== "sales") merged.set("tab", tab);
    if (keep === "period") for (const [k, v] of Object.entries(rangeToParams(range))) merged.set(k, v);
    setParams(merged, { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const chosen = params.get("group");
      const group = tab === "sales" ? ((GROUPS.some((g) => g.value === chosen) ? chosen : autoGroup(days)) as ReportGroup) : undefined;
      const blob = await reportsApi.csv(tab, group ? { ...days, group } : days);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `report-${tab}-${days.from}-to-${days.to}.csv` });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error({ title: "The CSV couldn't be downloaded", description: "Try again in a moment." });
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminPage
      title="Reports"
      lead={`${day(days.from)}${days.from !== days.to ? ` to ${day(days.to)}` : ""} · Phnom Penh time · revenue counts delivered orders, less refunds`}
      actions={
        <div className="grid justify-items-end gap-3">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <PeriodPicker
              active={active}
              onPick={(value) => {
                if (value === "custom") return setPicking(true);
                setPicking(false);
                update(rangeToParams({ period: value }), "tab");
              }}
            />
            <Button variant="outline" onClick={() => void exportCsv()} loading={exporting}>
              <Download aria-hidden="true" /> Export CSV
            </Button>
          </div>
          {picking ? <CustomRange range={range} shown={days} onApply={(from, to) => update(rangeToParams({ period: "custom", from, to }), "tab")} /> : null}
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(value) => update(value === "sales" ? {} : { tab: value }, "period")}>
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList aria-label="Reports">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="sales">{tab === "sales" ? <SalesTab range={days} versus={versus} /> : null}</TabsContent>
        <TabsContent value="orders">{tab === "orders" ? <OrdersTab range={days} versus={versus} /> : null}</TabsContent>
        <TabsContent value="products">{tab === "products" ? <ProductsTab range={days} /> : null}</TabsContent>
        <TabsContent value="customers">{tab === "customers" ? <CustomersTab range={days} versus={versus} /> : null}</TabsContent>
        <TabsContent value="funnel">{tab === "funnel" ? <FunnelTab range={days} /> : null}</TabsContent>
        <TabsContent value="coupons">{tab === "coupons" ? <CouponsTab range={days} /> : null}</TabsContent>
      </Tabs>
    </AdminPage>
  );
}
