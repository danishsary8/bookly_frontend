import { useState, type ReactNode } from "react";
import { AlertTriangle, BarChart3, Boxes, CheckCircle2, CircleDollarSign, Download, FileSpreadsheet, FolderTree, Gift, Hourglass, LineChart, MapPin, PenTool, PiggyBank, Printer, Receipt, ReceiptText, RotateCcw, ShoppingBag, Tag, Ticket, TrendingUp, Trophy, Truck, Undo2, UserPlus, Users, Wallet, XCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { inventoryApi, reportsApi, type InventoryDays, type ReportGroup, type ReportName, type ReportRange } from "@/api/endpoints/reports";
import { ApiError } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminPage } from "@/features/admin/AdminPage";
import { day, daysIn, rangeDays, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { staffDailySalesPrintPath } from "@/features/orders/documents/printLinks";
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
            <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Kpi id="r-net-revenue" label="Net revenue" icon={CircleDollarSign} tone="coral" value={<AnimatedNumber value={Number(t.net_revenue_usd)} format={money} />} khr={t.net_revenue_khr}
                detail={`${formatUsd(t.gross_revenue_usd)} collected − ${formatUsd(t.refunds_usd)} refunded`}
                change={<Change percent={c.change_percent.net_revenue} previous={Number(c.totals.net_revenue_usd)} versus={versus} />}
                trend={r.series.map((p) => Number(p.net_revenue_usd))} labels={labels} format={money} />
              <Kpi id="r-delivered" label="Delivered orders" icon={Truck} tone="saffron" value={<AnimatedNumber value={t.orders_count} format={count} />} detail={`${count(t.orders_placed)} orders placed in this period`}
                change={<Change percent={c.change_percent.orders_count} previous={c.totals.orders_count} versus={versus} />}
                trend={r.series.map((p) => p.orders_count)} labels={labels} format={count} />
              <Kpi id="r-books-sold" label="Books sold" icon={ShoppingBag} tone="sea" value={<AnimatedNumber value={t.items_sold} format={count} />}
                detail={`${t.orders_count ? (t.items_sold / t.orders_count).toFixed(1) : 0} books per delivered order`}
                change={<Change percent={c.change_percent.items_sold} previous={c.totals.items_sold} versus={versus} />}
                trend={r.series.map((p) => p.items_sold)} labels={labels} format={count} />
            </div>
            {/* How the money adds up (owner 2026-11-17). Order totals are stored after discounts and with delivery, so the
                steps start from the books' full price; "Book sales" is the same number as on the Profit tab. */}
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h3 className="text-sm font-semibold text-muted-foreground">How net revenue adds up</h3>
              <dl aria-label="How net revenue adds up" className="mt-3 grid grid-cols-2 gap-2.5 tabular-nums sm:grid-cols-3 xl:grid-cols-5">
                {([
                  ["Books at full price", bookFull, "plain"],
                  ["Discounts", discounts, "minus"],
                  ["Book sales", bookSales, "subtotal"],
                  ["Delivery fees", shipping, "plus"],
                  ["Refunds", refunds, "minus"],
                ] as const).map(([label, cents, kind]) => (
                  <div
                    key={label}
                    className={cn(
                      "grid content-start gap-1 rounded-xl border px-3.5 py-3",
                      kind === "subtotal" ? "border-primary/25 bg-primary/5" : "border-border/70 bg-surface-2/50",
                    )}
                  >
                    <dt className="text-[13px] text-muted-foreground">{label}</dt>
                    <dd className={cn("text-lg font-semibold leading-tight", cents === 0 ? "text-foreground" : kind === "minus" ? "text-destructive" : kind === "plus" ? "text-success" : "text-foreground")}>
                      {cents === 0 ? "" : kind === "minus" ? "−" : kind === "plus" ? "+" : ""}
                      {formatUsd((cents / 100).toFixed(2))}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-t border-border pt-3">
                <p className="grid gap-0.5">
                  <span className="text-sm text-muted-foreground">Net revenue</span>
                  <span className="text-2xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-foreground">= {formatUsd(t.net_revenue_usd)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Full price − discounts + delivery fees − refunds ·{" "}
                  <Link to="/admin/reports?tab=profit" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
                    Cost and profit are on the Profit tab →
                  </Link>
                </p>
              </div>
            </section>
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
            {/* Orders tab (owner 2026-11-17): one clear overview of where the period's orders are now, then delivery
                area and payment method side by side. */}
            <Panel id="orders-status" title="Where the orders are now" icon={BarChart3} tone="sky" action={<span className="text-sm text-muted-foreground tabular-nums">{count(r.total_orders)} orders placed</span>}>
              {r.total_orders === 0 ? <Empty>No orders placed in this period.</Empty> : <OrderStatusOverview byStatus={r.orders_by_status} total={r.total_orders} />}
            </Panel>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
          </>
        );
      }}
    </State>
  );
}

/** The status overview: three headline groups, one stacked bar of every status, and a legend with counts. */
const STATUS_STEPS: Array<{ key: string; label: string; fill: string; group: "progress" | "done" | "stopped" }> = [
  { key: "pending", label: "Pending", fill: "bg-warning", group: "progress" },
  { key: "paid", label: "Paid", fill: "bg-primary/45", group: "progress" },
  { key: "processing", label: "Processing", fill: "bg-primary/70", group: "progress" },
  { key: "shipped", label: "Shipped", fill: "bg-primary", group: "progress" },
  { key: "delivered", label: "Delivered", fill: "bg-success", group: "done" },
  { key: "cancelled", label: "Cancelled", fill: "bg-muted-foreground/45", group: "stopped" },
  { key: "returned", label: "Returned", fill: "bg-destructive", group: "stopped" },
];
function OrderStatusOverview({ byStatus, total }: { byStatus: Record<string, number>; total: number }) {
  const n = (key: string) => byStatus[key] ?? 0;
  const share = (v: number) => (total ? (v / total) * 100 : 0);
  const sum = (group: string) => STATUS_STEPS.filter((s) => s.group === group).reduce((t, s) => t + n(s.key), 0);
  const groups = [
    { key: "done", label: "Delivered", hint: "reached the customer", value: sum("done"), Icon: CheckCircle2, tone: "bg-success-tint text-success" },
    { key: "progress", label: "In progress", hint: "pending, paid, processing or shipped", value: sum("progress"), Icon: Truck, tone: "bg-lapis-tint text-primary" },
    { key: "stopped", label: "Cancelled or returned", hint: "did not complete", value: sum("stopped"), Icon: RotateCcw, tone: "bg-surface-2 text-foreground" },
  ];
  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {groups.map(({ key, label, hint, value, Icon, tone }) => (
          <div key={key} className="grid gap-1 rounded-xl border border-border px-4 py-3.5">
            <dt className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <span className={cn("grid size-7 place-items-center rounded-full", tone)}><Icon className="size-4" aria-hidden="true" /></span>
              {label}
            </dt>
            <dd className="grid gap-0.5">
              <span className="text-2xl font-semibold tabular-nums">{count(value)} <span className="text-base font-normal text-muted-foreground">· {percent(share(value))}</span></span>
              <span className="text-sm text-muted-foreground">{hint}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-surface-2" role="img" aria-label={STATUS_STEPS.map((s) => `${s.label} ${n(s.key)}`).join(", ")}>
        {STATUS_STEPS.map((s) => (n(s.key) > 0 ? <span key={s.key} className={cn("h-full border-r-2 border-card last:border-r-0", s.fill)} style={{ width: `${share(n(s.key))}%` }} /> : null))}
      </div>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4 lg:grid-cols-7" aria-label="Orders by status">
        {STATUS_STEPS.map((s) => (
          <li key={s.key} className="grid gap-0.5">
            <span className="flex items-center gap-2 text-sm text-muted-foreground"><span className={cn("size-2.5 shrink-0 rounded-full", s.fill)} aria-hidden="true" />{s.label}</span>
            <span className="pl-[18px] text-[15px] font-semibold tabular-nums">{count(n(s.key))} <span className="font-normal text-muted-foreground">· {percent(share(n(s.key)))}</span></span>
          </li>
        ))}
      </ul>
    </div>
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
            {/* Offers at a glance (owner 2026-11-17): how many orders used an offer and what it cost, then a side-by-side
                comparison with orders that had no offer, so the effect of offers reads in one look. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Kpi id="r-offer-orders" label="Orders with an offer" icon={Tag} tone="sea" value={<AnimatedNumber value={orders} format={count} />} detail={all ? `${percent((orders / all) * 100)} of all ${count(all)} orders` : "No orders in this period"} />
              <Kpi id="r-offer-discount" label="Discount given by offers" icon={Gift} tone="coral" value={usd(discount)} detail={revenue ? `${percent((discount / (revenue + discount)) * 100)} off ${usd(revenue + discount)} of books` : "No discount in this period"} view={{ to: "/admin/offers", label: "View offers" }} />
              <section aria-labelledby="offer-compare-title" className="desk-card flex flex-col gap-4 rounded-[20px] border border-border bg-card p-5 sm:col-span-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 id="offer-compare-title" className="font-sans text-sm font-semibold tracking-normal text-muted-foreground">Orders with an offer vs without</h2>
                  <span className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" aria-hidden="true" />With an offer</span>
                    <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40" aria-hidden="true" />Without</span>
                  </span>
                </div>
                <OfferCompare
                  label="Average order"
                  withOffer={orders ? revenue / orders / 100 : null}
                  without={w.orders ? Number(w.average_order_usd) : null}
                  format={(n) => formatUsd(n.toFixed(2))}
                />
                <OfferCompare
                  label="Books per order"
                  withOffer={orders ? units / orders : null}
                  without={w.orders ? Number(w.books_per_order) : null}
                  format={(n) => n.toFixed(2)}
                />
              </section>
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

/** One with/without comparison: two bars on the same scale and how many times bigger the offer orders are. */
function OfferCompare({ label, withOffer, without, format }: { label: string; withOffer: number | null; without: number | null; format: (n: number) => string }) {
  const top = Math.max(withOffer ?? 0, without ?? 0) || 1;
  const ratio = withOffer !== null && without ? withOffer / without : null;
  const bar = (value: number | null, tone: string, name: string) => (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <span className="text-muted-foreground">{name}</span>
      <span className="h-2.5 rounded-full bg-surface-2">
        <span className={cn("block h-full rounded-full", tone)} style={{ width: `${value === null ? 0 : Math.max(2, (value / top) * 100)}%` }} />
      </span>
      <span className="min-w-[5.5rem] text-right font-semibold tabular-nums text-foreground">{value === null ? "–" : format(value)}</span>
    </div>
  );
  return (
    <div className="grid gap-2 border-t border-border pt-3 first-of-type:border-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold text-foreground">{label}</h3>
        {ratio !== null && Math.abs(ratio - 1) >= 0.05 ? (
          <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold tabular-nums", ratio > 1 ? "bg-success-tint text-success" : "bg-warning-tint text-warning")}>
            {ratio > 1 ? `${ratio.toLocaleString("en-US", { maximumFractionDigits: 1 })}× bigger with an offer` : `${(1 / ratio).toLocaleString("en-US", { maximumFractionDigits: 1 })}× smaller with an offer`}
          </span>
        ) : null}
      </div>
      {bar(withOffer, "bg-primary", "With an offer")}
      {bar(without, "bg-muted-foreground/40", "Without")}
    </div>
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
  const [inventoryDays, setInventoryDays] = useState<InventoryDays>(30);
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
      const blob = tab === "inventory" ? await inventoryApi.csv(inventoryDays) : await reportsApi.csv(tab, group ? { ...days, group } : days);
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
        <div className="flex flex-wrap items-center gap-1">
          <Link
            to={staffDailySalesPrintPath({ from: days.from, to: days.to })}
            target="_blank"
            rel="noopener"
            className="dash-purchase-link inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            <ReceiptText className="size-4" aria-hidden="true" />
            Sales register
          </Link>
          <Link to={`/admin/reports/print?${new URLSearchParams(rangeToParams(range)).toString()}`} className="dash-purchase-link inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline">
            <Printer className="size-4" aria-hidden="true" />
            {dict.dashboardPrint.open}
          </Link>
        </div>
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
          {/* The comparison belongs to the period it describes (owner 2026-11-17). */}
          <p className="report-compare dash-comparison">Changes {versus}</p>
        </div>
        )}
        <div className="report-export flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportCsv()} loading={exporting} aria-label="Export CSV" title="Export this report as CSV">
            <Download aria-hidden="true" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => void exportExcel()} loading={exportingExcel} aria-label="Excel, all reports" title="Download every report in one Excel file">
            <FileSpreadsheet aria-hidden="true" /> Excel
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
        <TabsContent value="coupons">{tab === "coupons" ? <CouponsTab range={days} /> : null}</TabsContent>
        <TabsContent value="offers">{tab === "offers" ? <OffersTab range={days} /> : null}</TabsContent>
        <TabsContent value="inventory">{tab === "inventory" ? <InventoryTab days={inventoryDays} onDaysChange={setInventoryDays} /> : null}</TabsContent>
        <TabsContent value="profit">{tab === "profit" ? <ProfitTab range={days} versus={versus} group={profitGroup} onGroup={setGroup} /> : null}</TabsContent>
      </Tabs>
    </AdminPage>
    </div>
  );
}
