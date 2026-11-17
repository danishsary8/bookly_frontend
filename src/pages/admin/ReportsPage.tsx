import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, BarChart3, Boxes, CircleDollarSign, Download, FileSpreadsheet, FolderTree, Gift, Hourglass, LineChart, MapPin, PenTool, PiggyBank, Printer, Receipt, ShoppingBag, ShoppingCart, Tag, Ticket, TrendingUp, Trophy, Truck, Undo2, UserPlus, Users, Wallet, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { inventoryApi, reportsApi, type ReportGroup, type ReportName, type ReportRange } from "@/api/endpoints/reports";
import { ApiError } from "@/api/errors";
import type { OrderStatus } from "@/api/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPage } from "@/features/admin/AdminPage";
import { day, daysIn, rangeDays, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { BarList, ColumnChart, DataTable, TrendChart, type Point } from "@/features/admin/reports/charts";
import { Change, CustomRange, Khr, Panel, PeriodPicker } from "@/features/admin/reportKit";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { Kpi, RankTable } from "@/features/admin/dashboard/DashKit";
import { ProfitTab } from "@/features/admin/reports/ProfitTab";
import { InventoryTab } from "@/features/admin/reports/InventoryTab";
import { Empty, GroupPicker, State } from "@/features/admin/reports/reportParts";
import { GROUPS, autoGroup, useReport } from "@/features/admin/reports/reportData";
import "@/features/admin/dashboard/dashboard.css";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * /admin/reports (admin only): the shop's numbers for a period, one subject per tab, each with a CSV export.
 * Same period picker and money rules as the dashboard (cash basis: delivered orders less refunds; riel at
 * today's rate). Charts use one colour; every chart has its numbers in a table too.
 * Owner 2026-11-16: same look as the dashboard - tinted KPI cards with trend lines, panels with a coloured icon,
 * ranked tables with bars, and the dashboard's toolbar.
 */

const TABS: Array<{ value: ReportName; label: string }> = [
  { value: "sales", label: "Sales" },
  { value: "orders", label: "Orders" },
  { value: "products", label: "Products" },
  { value: "customers", label: "Customers" },
  { value: "funnel", label: "Funnel" },
  { value: "coupons", label: "Coupons & refunds" },
  { value: "offers", label: "Offers" },
  { value: "profit", label: "Profit" },
  { value: "inventory", label: "Inventory" },
];

const isTab = (value: string | null): value is ReportName => TABS.some((t) => t.value === value);
const usd = (n: number) => formatUsd(n);
const usdAxis = (n: number) => (n >= 1000 ? `$${(n / 1000).toLocaleString("en-US", { maximumFractionDigits: 1 })}k` : `$${n}`);
const count = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => formatUsd(n.toFixed(2));
const percent = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const monthName = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const bucketLabel = (date: string, group: ReportGroup) => {
  const d = new Date(`${date}T00:00:00Z`);
  return group === "month" ? monthName.format(d) : group === "week" ? `Week of ${shortDay.format(d)}` : shortDay.format(d);
};

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
              <div className="admin-bar h-full rounded-full" style={{ width: `${share}%`, background: "var(--tone-fill, var(--primary))" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
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
        // The money bridge in cents: order totals are after discounts and include delivery.
        const cents = (v: string | null | undefined) => Math.round(Number(v ?? 0) * 100);
        const discounts = cents(t.discount_usd);
        const shipping = cents(t.shipping_usd);
        const refunds = cents(t.refunds_usd);
        const bookSales = cents(t.gross_revenue_usd) - shipping;
        const bookFull = bookSales + discounts;
        const points: Point[] = r.series.map((p) => ({
          label: bucketLabel(p.date, group),
          value: Number(p.net_revenue_usd),
          tooltip: `${p.orders_count} delivered · ${formatUsd(p.gross_revenue_usd)} before refunds`,
        }));
        const labels = points.map((p) => p.label);
        return (
          <>
            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi id="r-net-revenue" label="Net revenue" icon={CircleDollarSign} tone="coral" value={<AnimatedNumber value={Number(t.net_revenue_usd)} format={money} />} khr={t.net_revenue_khr}
                detail={`${formatUsd(t.gross_revenue_usd)} collected − ${formatUsd(t.refunds_usd)} refunded`}
                change={<Change percent={c.change_percent.net_revenue} previous={Number(c.totals.net_revenue_usd)} versus={versus} />}
                trend={r.series.map((p) => Number(p.net_revenue_usd))} labels={labels} format={money} />
              <Kpi id="r-delivered" label="Delivered orders" icon={Truck} tone="saffron" value={<AnimatedNumber value={t.orders_count} format={count} />} detail={`${count(t.orders_placed)} orders placed in this period`}
                change={<Change percent={c.change_percent.orders_count} previous={c.totals.orders_count} versus={versus} />}
                trend={r.series.map((p) => p.orders_count)} labels={labels} format={count} />
              <Kpi id="r-average" label="Average order" icon={Receipt} tone="sky" value={<AnimatedNumber value={Number(t.average_order_value_usd)} format={money} />} khr={t.average_order_value_khr}
                detail="Money collected ÷ delivered orders (before refunds)"
                change={<Change percent={c.change_percent.average_order_value} previous={Number(c.totals.average_order_value_usd)} versus={versus} />}
                trend={r.series.map((p) => Number(p.average_order_value_usd))} labels={labels} format={money} />
              <Kpi id="r-books-sold" label="Books sold" icon={ShoppingBag} tone="sea" value={<AnimatedNumber value={t.items_sold} format={count} />}
                detail={`${t.orders_count ? (t.items_sold / t.orders_count).toFixed(1) : 0} books per delivered order`}
                change={<Change percent={c.change_percent.items_sold} previous={c.totals.items_sold} versus={versus} />}
                trend={r.series.map((p) => p.items_sold)} labels={labels} format={count} />
            </div>
            {/* How the money adds up (owner 2026-11-17). Order totals are stored after discounts and with delivery, so the
                steps start from the books' full price; "Book sales" is the same number as on the Profit tab. */}
            <div className="grid gap-2 rounded-xl border border-border/60 bg-surface-2/40 px-4 py-3 text-sm tabular-nums">
            <dl aria-label="How net revenue adds up" className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-5">
              {([
                ["Books at full price", bookFull, ""],
                ["Discounts", -discounts, "−"],
                ["Book sales", bookSales, "="],
                ["Delivery fees", shipping, "+"],
                ["Refunds", -refunds, "−"],
              ] as const).map(([label, cents, sign]) => (
                <div key={label} className="grid gap-0.5">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-foreground">
                    {sign === "−" ? "−" : sign === "+" ? "+" : ""}
                    {formatUsd((Math.abs(cents) / 100).toFixed(2))}
                  </dd>
                </div>
              ))}
            </dl>
              <p className="text-muted-foreground">
                = <span className="font-semibold text-foreground">{formatUsd(t.net_revenue_usd)}</span> net revenue ·{" "}
                <Link to="/admin/reports?tab=profit" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                  Cost and profit are on the Profit tab →
                </Link>
              </p>
            </div>
            <Panel
              id="sales-trend"
              title={`Net revenue by ${group}`}
              icon={LineChart}
              tone="coral"
              action={
                <GroupPicker
                  value={group}
                  onChange={(value) => {
                    const next = new URLSearchParams(params);
                    next.set("group", value);
                    setParams(next, { replace: true });
                  }}
                />
              }
            >
              {points.every((p) => p.value === 0) ? <Empty>No delivered orders or refunds in this period.</Empty> : <TrendChart points={points} label={`Net revenue by ${group}`} format={usd} axisFormat={usdAxis} color="var(--tone-fill)" />}
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
            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Kpi id="r-orders" label="Orders placed" icon={ShoppingBag} tone="saffron" value={<AnimatedNumber value={r.total_orders} format={count} />} change={<Change percent={c.change_percent.total_orders} previous={c.total_orders} versus={versus} />} view={{ to: "/admin/orders", label: "View orders" }} />
              <Kpi id="r-cancelled" label="Cancelled" icon={XCircle} tone="coral" value={<AnimatedNumber value={r.cancellation_rate} format={percent} />} detail="of orders placed" change={<Change percent={c.change_percent.cancellation_rate} previous={c.cancellation_rate} versus={versus} moreIsBetter={false} />} />
              <Kpi
                id="r-delivery-time"
                label="Average time to deliver"
                icon={Hourglass}
                tone="sky"
                value={r.average_delivery_hours == null ? "–" : r.average_delivery_hours >= 48 ? `${(r.average_delivery_hours / 24).toFixed(1)} days` : `${r.average_delivery_hours} hours`}
                detail="placed → delivered"
                change={<Change percent={c.change_percent.average_delivery_hours} previous={c.average_delivery_hours ?? 0} versus={versus} moreIsBetter={false} />}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel id="orders-status" title="Orders placed by status" icon={BarChart3} tone="sky">
                {r.total_orders === 0 ? <Empty>No orders placed in this period.</Empty> : <ShareList label="Orders by status" rows={Object.entries(r.orders_by_status).map(([status, n]) => ({ key: status, name: <OrderStatusBadge status={status as OrderStatus} />, value: n }))} />}
              </Panel>
              <div className="grid content-start gap-6">
                <Panel id="orders-area" title="Delivery area" icon={MapPin} tone="sea">
                  {r.total_orders === 0 ? <Empty>No orders placed in this period.</Empty> : <ShareList label="Orders by delivery area" rows={[{ key: "pp", name: "Phnom Penh", value: r.orders_by_delivery_area.phnom_penh }, { key: "prov", name: "Provinces", value: r.orders_by_delivery_area.provinces }]} />}
                </Panel>
                <Panel id="orders-payment" title="Payment method" icon={Wallet} tone="saffron">
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
  const { dict } = useT();
  const query = useReport("products", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const top = r.best_sellers_by_revenue.map((b) => ({ label: `${b.title} (${formatLabel(b.format)})`, value: Number(b.revenue_usd), tooltip: `${b.units_sold} sold` }));
        const categories = r.revenue_by_category.map((c) => ({ label: c.name, value: Number(c.revenue_usd), tooltip: `${c.units_sold} sold` }));
        return (
          <>
            <Panel id="products-top" title="Best sellers by sales" icon={TrendingUp} tone="coral" action={<span className="text-sm text-muted-foreground">orders placed, not cancelled</span>}>
              {top.length === 0 ? <Empty>No sales in this period.</Empty> : <BarList points={top} label="Best sellers by sales" format={usd} color="var(--tone-fill)" />}
              <DataTable caption="Best sellers by sales" head={["Book", "Sales"]} rows={top.map((t) => [t.label, usd(t.value)])} />
            </Panel>
            <Panel id="products-copies" title="Best sellers by copies" icon={Trophy} tone="saffron">
              {r.best_sellers_by_units.length === 0 ? (
                <Empty>No sales in this period.</Empty>
              ) : (
                <RankTable
                  head={["Book", "Copies", "Sales"]}
                  rows={r.best_sellers_by_units.map((b) => ({
                    key: b.variant_id,
                    copies: b.units_sold,
                    sales: formatUsd(b.revenue_usd),
                    khr: b.revenue_khr,
                    name: (
                      <>
                        <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{b.title}</Link>
                        <span className="block text-sm text-muted-foreground">{formatLabel(b.format)}</span>
                      </>
                    ),
                  }))}
                />
              )}
            </Panel>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel id="products-categories" title="Sales by category" icon={FolderTree} tone="sky">
                {categories.length === 0 ? <Empty>No categorised sales in this period.</Empty> : <BarList points={categories} label="Sales by category" format={usd} color="var(--tone-fill)" />}
                <DataTable caption="Sales by category" head={["Category", "Sales"]} rows={categories.map((c) => [c.label, usd(c.value)])} />
              </Panel>
              <Panel id="products-low" title="Low stock" icon={Boxes} tone="coral" action={<Link to="/admin/books" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">All books</Link>}>
                {r.low_stock.length === 0 ? (
                  <Empty>Every printed format is above its low-stock level.</Empty>
                ) : (
                  <ul className="grid gap-2">
                    {r.low_stock.map((v) => (
                      <li key={v.book_variant_id}>
                        <Link to={`/admin/books/${v.book_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{v.title}</span>
                            <span className="block text-sm text-muted-foreground">
                              {formatLabel(v.format)} · {v.sku}
                            </span>
                          </span>
                          <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums", v.stock_quantity === 0 ? "bg-destructive-tint text-destructive" : "bg-warning-tint text-warning")}>
                            <AlertTriangle className="size-3.5" aria-hidden="true" />
                            {v.stock_quantity === 0 ? "Out of stock" : `${v.stock_quantity} left`}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
            {r.top_authors ? (
              <Panel id="products-authors" title={dict.reportsExtra.topAuthors} icon={PenTool} tone="violet" action={<span className="text-sm text-muted-foreground">{dict.reportsExtra.byCopies}</span>}>
                {r.top_authors.length === 0 ? (
                  <Empty>{dict.reportsExtra.noSales}</Empty>
                ) : (
                  <RankTable
                    head={[dict.reportsExtra.author, dict.reportsExtra.copies, dict.reportsExtra.sales]}
                    rows={r.top_authors.map((a) => ({
                      key: a.author_id,
                      copies: a.units_sold,
                      sales: formatUsd(a.revenue_usd),
                      khr: a.revenue_khr,
                      name: (
                        <>
                          <span className="font-semibold">{a.name}</span>
                          <span className="block text-sm text-muted-foreground">{a.books} {a.books === 1 ? dict.reportsExtra.book : dict.reportsExtra.books}</span>
                        </>
                      ),
                    }))}
                  />
                )}
              </Panel>
            ) : null}
            <Panel id="products-slow" title="Slow sellers with stock" icon={Hourglass} tone="slate" action={<span className="text-sm text-muted-foreground">fewest copies sold in this period</span>}>
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
  const { dict } = useT();
  const query = useReport("customers", range);
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const c = r.comparison;
        const points = r.new_customers_series.map((p) => ({ label: shortDay.format(new Date(`${p.date}T00:00:00Z`)), value: p.new_customers }));
        return (
          <>
            <div className={cn("dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2", r.customers_ordered !== undefined && "xl:grid-cols-4")}>
              <Kpi id="r-new-customers" label="New customers" icon={UserPlus} tone="sea" value={<AnimatedNumber value={r.total_new_customers} format={count} />} detail="verified their account"
                change={<Change percent={c.change_percent.total_new_customers} previous={c.total_new_customers} versus={versus} />}
                trend={points.map((p) => p.value)} labels={points.map((p) => p.label)} format={count} view={{ to: "/admin/customers", label: "View customers" }} />
              <Kpi id="r-came-back" label="Came back" icon={Users} tone="sky" value={<AnimatedNumber value={r.returning_customer_rate} format={percent} />} detail="of customers in this period ordered more than once"
                change={<Change percent={c.change_percent.returning_customer_rate} previous={c.returning_customer_rate} versus={versus} />} />
              {r.customers_ordered !== undefined ? (
                <Kpi id="r-customers-ordered" label={dict.reportsExtra.ordered} icon={ShoppingBag} tone="saffron" value={<AnimatedNumber value={r.customers_ordered} format={count} />}
                  detail={dict.reportsExtra.orderedDetail.replace("{first}", count(r.first_time_customers ?? 0)).replace("{back}", count(r.returning_customers ?? 0))}
                  change={<Change percent={c.change_percent.customers_ordered} previous={c.customers_ordered} versus={versus} />} />
              ) : null}
              {r.average_spend_usd !== undefined ? (
                <Kpi id="r-average-spend" label={dict.reportsExtra.spend} icon={Wallet} tone="coral" value={<AnimatedNumber value={Number(r.average_spend_usd)} format={money} />} khr={r.average_spend_khr}
                  detail={dict.reportsExtra.spendDetail}
                  change={<Change percent={c.change_percent.average_spend} previous={Number(c.average_spend_usd ?? 0)} versus={versus} />} />
              ) : null}
            </div>
            <Panel id="customers-new" title="New customers by day" icon={UserPlus} tone="sea">
              {r.total_new_customers === 0 ? <Empty>No new verified customers in this period.</Empty> : <ColumnChart points={points} label="New customers by day" format={count} color="var(--tone-fill)" />}
              <DataTable caption="New customers by day" head={["Day", "New customers"]} rows={points.map((p) => [p.label, count(p.value)])} />
            </Panel>
            <Panel id="customers-top" title="Top customers" icon={Trophy} tone="saffron" action={<span className="text-sm text-muted-foreground">by spend on orders placed</span>}>
              {r.top_customers.length === 0 ? (
                <Empty>No orders in this period.</Empty>
              ) : (
                <RankTable
                  head={["Customer", "Orders", "Spent"]}
                  rows={r.top_customers.map((cu) => ({
                    key: cu.customer_id,
                    copies: cu.orders_count,
                    bar: Number(cu.total_spent_usd),
                    sales: formatUsd(cu.total_spent_usd),
                    khr: cu.total_spent_khr,
                    name: (
                      <>
                        <Link to={`/admin/customers/${cu.customer_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{cu.name ?? "Closed account"}</Link>
                        {cu.email ? <span className="block text-sm text-muted-foreground [overflow-wrap:anywhere]">{cu.email}</span> : null}
                      </>
                    ),
                  }))}
                />
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
          <Panel id="funnel" title="From cart to delivery" icon={ShoppingCart} tone="sky" action={<span className="text-sm text-muted-foreground">carts are an estimate; visits are not tracked</span>}>
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
                    <div className="grid gap-1.5 rounded-xl border border-border p-3.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold">{step.name}</span>
                        <span className="tabular-nums">
                          <span className="text-lg font-semibold">{count(step.count)}</span> <span className="text-sm text-muted-foreground">· {percent(step.conversion_rate)} of carts</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                        <div className="admin-bar h-full rounded-full" style={{ width: `${first ? (step.count / first) * 100 : 0}%`, background: "var(--tone-fill)" }} />
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
            <Panel id="coupons" title="Coupons used" icon={Ticket} tone="saffron" action={<span className="text-sm text-muted-foreground">orders placed, not cancelled</span>}>
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <Kpi id="r-refunded" label="Refunded" icon={Undo2} tone="coral" value={<AnimatedNumber value={Number(r.refunds.amount_usd)} format={money} />} khr={r.refunds.amount_khr} detail={`${count(r.refunds.count)} ${r.refunds.count === 1 ? "return" : "returns"} paid back in this period`} view={{ to: "/admin/returns", label: "View returns" }} />
              <Panel id="refund-reasons" title="Refunds by reason" icon={Receipt} tone="coral">
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

/** "$12.34" as cents, for adding rows up exactly. */
const cents = (usd: string) => Math.round(Number(usd) * 100);

function OffersTab({ range }: { range: ReportRange }) {
  const query = useReport("offers", range);
  // Before the backend with offers is deployed the report is a 404: say so instead of an error page.
  if (query.isError && ApiError.from(query.error).status === 404) {
    return (
      <Panel id="offers-not-yet" title="Offers" icon={Tag} tone="sea">
        <Empty>The offers report is not available on this server yet. It appears once the backend update is deployed.</Empty>
      </Panel>
    );
  }
  return (
    <State query={query}>
      {() => {
        const r = query.data!;
        const w = r.without_offer;
        const orders = r.offers.reduce((n, o) => n + o.orders, 0);
        const units = r.offers.reduce((n, o) => n + o.units, 0);
        const revenue = r.offers.reduce((n, o) => n + cents(o.revenue_usd), 0);
        const discount = r.offers.reduce((n, o) => n + cents(o.discount_usd), 0);
        const usd = (c: number) => formatUsd((c / 100).toFixed(2));
        const all = orders + w.orders;
        const rows = [
          ...r.offers.map((o) => ({
            key: `offer-${o.offer_id ?? o.name}`,
            name: o.name,
            rule: o.min_quantity ? `Buy ${o.min_quantity}, save ${Number(o.percent_off)}%` : "",
            row: o as typeof w,
          })),
          { key: "without", name: "Orders without an offer", rule: "coupon orders included", row: w },
        ];
        return (
          <>
            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi id="r-offer-books" label="Books per order with an offer" icon={ShoppingBag} tone="saffron" value={orders ? (units / orders).toFixed(2) : "–"} detail={`Without an offer: ${w.orders ? w.books_per_order : "–"}`} />
              <Kpi id="r-offer-average" label="Average order with an offer" icon={Receipt} tone="sky" value={orders ? usd(Math.round(revenue / orders)) : "–"} detail={`Without an offer: ${w.orders ? formatUsd(w.average_order_usd) : "–"}`} />
              <Kpi id="r-offer-orders" label="Orders with an offer" icon={Tag} tone="sea" value={<AnimatedNumber value={orders} format={count} />} detail={all ? `${percent((orders / all) * 100)} of ${count(all)} orders` : "No orders in this period"} />
              <Kpi id="r-offer-discount" label="Discount given by offers" icon={Gift} tone="coral" value={usd(discount)} detail={`On ${usd(revenue)} of orders`} view={{ to: "/admin/offers", label: "View offers" }} />
            </div>
            <Panel id="offers-table" title="What each offer sold" icon={Tag} tone="sea" action={<span className="text-sm text-muted-foreground">orders placed, not cancelled</span>}>
              {r.offers.length === 0 ? <Empty>No order used an offer in this period.</Empty> : null}
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Offers table">
                <table className="w-full min-w-[44rem] text-left text-[15px] tabular-nums">
                  <thead className="text-sm text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-normal">Offer</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Orders</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Books (with the offer)</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Order totals</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Discount given</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Average order</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Books per order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map(({ key, name, rule, row }) => (
                      <tr key={key} className={cn(key === "without" && "text-muted-foreground")}>
                        <th scope="row" className="py-2 pr-3 font-normal">
                          <span className={cn(key !== "without" && "font-semibold text-foreground")}>{name}</span>
                          {rule ? <span className="block text-sm text-muted-foreground">{rule}</span> : null}
                        </th>
                        <td className="py-2 pl-4 text-right">{count(row.orders)}</td>
                        <td className="py-2 pl-4 text-right">
                          {count(row.units)}
                          {key !== "without" ? <span className="text-muted-foreground"> ({count(row.units_with_offer)})</span> : null}
                        </td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">{formatUsd(row.revenue_usd)}</td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">{formatUsd(row.discount_usd)}</td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">{formatUsd(row.average_order_usd)}</td>
                        <td className="py-2 pl-4 text-right">{row.books_per_order}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        );
      }}
    </State>
  );
}

export default function ReportsPage() {
  const { dict } = useT();
  const [params, setParams] = useSearchParams();
  const range = rangeFromParams(params);
  const days = rangeDays(range);
  const [picking, setPicking] = useState(range.period === "custom");
  const [exporting, setExporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
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

  const chosenGroup = params.get("group");
  const profitGroup: ReportGroup = GROUPS.some((g) => g.value === chosenGroup) ? (chosenGroup as ReportGroup) : autoGroup(days);
  const setGroup = (value: ReportGroup) => {
    const next = new URLSearchParams(params);
    next.set("group", value);
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const group = tab === "sales" || tab === "profit" ? profitGroup : undefined;
      const blob = tab === "inventory" ? await inventoryApi.csv(30) : await reportsApi.csv(tab, group ? { ...days, group } : days);
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

  /** One .xlsx with every report (all tabs) for the chosen dates. */
  const exportExcel = async () => {
    setExportingExcel(true);
    try {
      const blob = await reportsApi.excel(days);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `bookly-report-${days.from}-to-${days.to}.xlsx` });
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const missing = ApiError.from(error).kind === "not_found";
      toast.error(
        missing
          ? { title: "Excel download isn't available yet", description: "The API hasn't been updated. Try again after it deploys." }
          : { title: "The Excel file couldn't be downloaded", description: "Try again in a moment." },
      );
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="dash-overview">
    <AdminPage
      title="Reports"
      lead={`${day(days.from)}${days.from !== days.to ? ` to ${day(days.to)}` : ""} · Phnom Penh time · revenue counts delivered orders, less refunds`}
      actions={
        <Link to={`/admin/reports/print?${new URLSearchParams(rangeToParams(range)).toString()}`} className="dash-purchase-link inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          <Printer className="size-4" aria-hidden="true" />
          {dict.dashboardPrint.open}
        </Link>
      }
    >
      <div className="dash-toolbar">
        {tab === "inventory" ? (
          <p className="dash-comparison font-semibold text-foreground">{dict.inventoryReport.today}</p>
        ) : (
        <div className="dash-period-control">
          <span className="dash-toolbar-label">Time period</span>
          <PeriodPicker
            active={active}
            onPick={(value) => {
              if (value === "custom") return setPicking(true);
              setPicking(false);
              update(rangeToParams({ period: value }), "tab");
            }}
          />
        </div>
        )}
        <div className="report-export flex flex-wrap items-center gap-2">
          {tab !== "inventory" ? <p className="dash-comparison">Changes {versus}</p> : null}
          <Button variant="outline" onClick={() => void exportCsv()} loading={exporting}>
            <Download aria-hidden="true" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => void exportExcel()} loading={exportingExcel}>
            <FileSpreadsheet aria-hidden="true" /> Excel, all reports
          </Button>
        </div>
        {picking && tab !== "inventory" ? <div className="dash-custom-range"><CustomRange range={range} shown={days} onApply={(from, to) => update(rangeToParams({ period: "custom", from, to }), "tab")} /></div> : null}
      </div>
      <Tabs value={tab} onValueChange={(value) => update(value === "sales" ? {} : { tab: value }, "period")} className="report-tabs">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList aria-label="Reports">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.value === "profit" ? (
                  <span className="inline-flex items-center gap-1.5"><PiggyBank className="size-4" aria-hidden="true" />{dict.profitReport.tab}</span>
                ) : t.value === "inventory" ? (
                  <span className="inline-flex items-center gap-1.5"><Boxes className="size-4" aria-hidden="true" />{dict.inventoryReport.tab}</span>
                ) : (
                  t.label
                )}
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
        <TabsContent value="offers">{tab === "offers" ? <OffersTab range={days} /> : null}</TabsContent>
        <TabsContent value="inventory">{tab === "inventory" ? <InventoryTab /> : null}</TabsContent>
        <TabsContent value="profit">{tab === "profit" ? <ProfitTab range={days} versus={versus} group={profitGroup} onGroup={setGroup} /> : null}</TabsContent>
      </Tabs>
    </AdminPage>
    </div>
  );
}
