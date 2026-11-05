import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { insightsQueries, type TrendDay } from "@/api/endpoints/dashboardInsights";
import { staffQueries } from "@/api/endpoints/staff";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { IncomeChart } from "@/features/admin/dashboard/IncomeChart";
import { InsightsWidgets } from "@/features/admin/dashboard/InsightsWidgets";
import { Sparkline } from "@/features/admin/dashboard/Sparkline";
import { StatusDonut } from "@/features/admin/dashboard/StatusDonut";
import { SalesChart } from "@/features/admin/SalesChart";
import { day, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { Change, CustomRange, Khr, Panel, PeriodPicker } from "@/features/admin/reportKit";
import { SystemHealthCard } from "@/features/admin/SystemHealthCard";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import type { ReactNode } from "react";

/** A KPI card (owner's sample): label, number, change vs the previous period, a trend line and a "View …" link. */
function Kpi({ id, label, value, khr, detail, change, trend, view, hero }: {
  id: string;
  label: string;
  value: ReactNode;
  khr?: string | null;
  detail?: string;
  change?: ReactNode;
  trend?: number[];
  view: { to: string; label: string };
  hero?: boolean;
}) {
  return (
    <section aria-labelledby={id} className="grid content-start gap-2 rounded-xl border border-border bg-card p-5">
      <h2 id={id} className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
        {label}
      </h2>
      <p className={cn("font-semibold leading-none tabular-nums", hero ? "text-[3.25rem]" : "text-[1.75rem]")}>{value}</p>
      <Khr value={khr} className={hero ? "text-[15px]" : undefined} />
      {change}
      {detail ? <p className="text-sm text-muted-foreground tabular-nums">{detail}</p> : null}
      {trend ? <Sparkline values={trend} className="mt-1" /> : null}
      <Link to={view.to} className="mt-auto inline-flex items-center gap-1 justify-self-start pt-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
        {view.label} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

const series = (days: TrendDay[] | undefined, pick: (d: TrendDay) => number) => (days?.length ? days.map(pick) : undefined);

/*
 * /admin: how the shop is doing over today / 7 / 30 days or chosen days (Phnom Penh days, from
 * the API). Revenue counts delivered orders, less refunds. KPI cards with a trend line, change vs the previous
 * period and a "View" link; the income chart (this period solid, the previous one dashed, Income/Orders switch);
 * best sellers, low stock, an orders-by-status donut and top categories (BI design 2026-11-01, branch 2).
 */
export default function DashboardPage() {
  const { dict } = useT();
  const session = useStaff();
  const [params, setParams] = useSearchParams();
  const range = rangeFromParams(params);
  // "Custom" shows the day fields; the numbers keep the last applied range until Apply.
  const [picking, setPicking] = useState(range.period === "custom");
  const active = picking ? "custom" : range.period;
  const summary = useQuery(staffQueries.summary(range));
  const sales = useQuery(staffQueries.sales(range));
  // Trends and the previous-period line come from /staff/dashboard/insights; on an API without it they are left out.
  const insights = useQuery(insightsQueries.get(range));
  const trend = insights.data?.trend;
  const s = summary.data;
  const firstName = session?.user.name.split(" ")[0];
  const c = s?.comparison;
  const versus = c ? `vs ${day(c.period.from)}${c.period.from !== c.period.to ? ` – ${day(c.period.to)}` : ""}` : "";

  return (
    <AdminPage
      title="Dashboard"
      lead={s ? `${day(s.period.from)}${s.period.from !== s.period.to ? ` to ${day(s.period.to)}` : ""} · Phnom Penh time` : `Hello${firstName ? `, ${firstName}` : ""}`}
      actions={
        <div className="grid justify-items-end gap-3">
          <PeriodPicker
            active={active}
            onPick={(value) => {
              if (value === "custom") return setPicking(true);
              setPicking(false);
              setParams(rangeToParams({ period: value }), { replace: true });
            }}
          />
          {picking ? <CustomRange range={range} shown={s?.period} onApply={(from, to) => setParams(rangeToParams({ period: "custom", from, to }), { replace: true })} /> : null}
        </div>
      }
    >
      {summary.isError && !s ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : !s ? (
        <SkeletonGroup label="Loading dashboard…" className="grid gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </SkeletonGroup>
      ) : (
        <div className={cn("grid grid-cols-1 gap-6", summary.isPlaceholderData && "opacity-60 transition-opacity")}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
            <Kpi
              hero
              id="net-revenue"
              label="Net revenue"
              value={formatUsd(s.revenue.net_usd)}
              khr={s.revenue.net_khr}
              change={c ? <Change percent={c.change_percent.net_revenue} previous={Number(c.revenue.net_usd)} versus={versus} /> : null}
              detail={`${formatUsd(s.revenue.gross_usd)} from ${s.delivered_orders} delivered ${s.delivered_orders === 1 ? "order" : "orders"}${Number(s.revenue.refunds_usd) > 0 ? `, less ${formatUsd(s.revenue.refunds_usd)} refunded` : ""}`}
              trend={series(trend, (d) => Number(d.net_revenue_usd))}
              view={{ to: "/admin/reports", label: "View sales report" }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Kpi
                id="orders-placed"
                label="Orders placed"
                value={s.orders_placed}
                change={c ? <Change percent={c.change_percent.orders_placed} previous={c.orders_placed} versus={versus} /> : null}
                trend={series(trend, (d) => d.orders_placed)}
                view={{ to: "/admin/orders", label: "View orders" }}
              />
              <Kpi
                id="average-order"
                label="Average order"
                value={formatUsd(s.average_order_value_usd)}
                khr={s.average_order_value_khr}
                detail="delivered orders"
                change={c ? <Change percent={c.change_percent.average_order_value} previous={Number(c.average_order_value_usd)} versus={versus} /> : null}
                trend={series(trend, (d) => Number(d.average_order_usd))}
                view={{ to: "/admin/reports?tab=orders", label: "View order report" }}
              />
              <Kpi
                id="new-customers"
                label="New customers"
                value={s.new_customers}
                detail="verified their account"
                change={c ? <Change percent={c.change_percent.new_customers} previous={c.new_customers} versus={versus} /> : null}
                trend={series(trend, (d) => d.new_customers)}
                view={{ to: "/admin/customers", label: "View customers" }}
              />
            </div>
          </div>

          {trend?.length ? (
            <Panel id="sales-chart" title="Income report" action={<span className="text-sm text-muted-foreground">this period vs the previous one · by delivery date, less refunds</span>}>
              <IncomeChart days={trend} />
            </Panel>
          ) : (
            <Panel id="sales-chart" title="Net revenue by day" action={<span className="text-sm text-muted-foreground">by delivery date, less refunds</span>}>
              {sales.isError ? (
                <InlineError error={sales.error} onRetry={() => sales.refetch()} />
              ) : sales.data ? (
                <SalesChart days={sales.data} />
              ) : (
                <Skeleton className="h-60 rounded-md" />
              )}
            </Panel>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel id="best-sellers" title="Best sellers">
              {s.best_sellers.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">No delivered sales in this period yet.</p>
              ) : (
                <table className="w-full text-left text-[15px] tabular-nums">
                  <thead className="text-sm text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-normal">Book</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Copies</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {s.best_sellers.map((b) => (
                      <tr key={b.book_id}>
                        <th scope="row" className="py-2 pr-3 font-normal">
                          <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">
                            {b.title}
                          </Link>
                        </th>
                        <td className="py-2 pl-4 text-right">{b.copies_sold}</td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">
                          {formatUsd(b.sales_usd)}
                          <Khr value={b.sales_khr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel
              id="low-stock"
              title="Low stock"
              action={
                <Link to="/admin/books" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  All books <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            >
              {s.low_stock.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">Every active format is above its low-stock level.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {s.low_stock.map((v) => (
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Panel
              id="order-mix"
              title="Orders placed by status"
              action={
                <Link to="/admin/orders" className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {s.open_returns} open {s.open_returns === 1 ? "return" : "returns"} · View orders <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              }
            >
              <StatusDonut counts={s.orders_by_status} />
            </Panel>
            <Panel id="top-categories" title="Top categories" action={<span className="text-sm text-muted-foreground">by copies in orders placed</span>}>
              {!s.top_categories || s.top_categories.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">No categorised sales in this period yet.</p>
              ) : (
                <table className="w-full text-left text-[15px] tabular-nums">
                  <thead className="text-sm text-muted-foreground">
                    <tr>
                      <th scope="col" className="pb-2 font-normal">Category</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Copies</th>
                      <th scope="col" className="pb-2 pl-4 text-right font-normal">Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {s.top_categories.map((t) => (
                      <tr key={t.category_id}>
                        <th scope="row" className="py-2 pr-3 font-semibold">{t.name}</th>
                        <td className="py-2 pl-4 text-right">{t.copies_sold}</td>
                        <td className="whitespace-nowrap py-2 pl-4 text-right">
                          {formatUsd(t.sales_usd)}
                          <Khr value={t.sales_khr} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

          {insights.data?.dead_stock && insights.data.stock_value && insights.data.promotions && insights.data.repeat_customer_rate && insights.data.top_authors && insights.data.provinces ? (
            <>
            {insights.data.order_ratings ? <p className="rounded-lg border border-border bg-card p-4">{dict.ratings.title}: {insights.data.order_ratings.average ?? "—"} / 5 · {insights.data.order_ratings.count}</p> : null}
            <InsightsWidgets data={insights.data} />
            </>
          ) : null}

          {session?.user.role === "admin" ? <SystemHealthCard /> : null}
        </div>
      )}
    </AdminPage>
  );
}
