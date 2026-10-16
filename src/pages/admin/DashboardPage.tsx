import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { staffQueries } from "@/api/endpoints/staff";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import type { OrderStatus } from "@/api/types";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { SalesChart } from "@/features/admin/SalesChart";
import { day, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { Change, CustomRange, Khr, Panel, PeriodPicker, Tile } from "@/features/admin/reportKit";
import { SystemHealthCard } from "@/features/admin/SystemHealthCard";
import { useStaff } from "@/features/admin/staffSession";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";

/*
 * /admin: how the shop is doing over today / 7 / 30 days or chosen days (Phnom Penh days, from
 * the API). Revenue counts delivered orders, less refunds. Net revenue is the one
 * hero figure; the rest are supporting tiles, the daily chart, best sellers, low
 * stock and today's order mix.
 */
export default function DashboardPage() {
  const session = useStaff();
  const [params, setParams] = useSearchParams();
  const range = rangeFromParams(params);
  // "Custom" shows the day fields; the numbers keep the last applied range until Apply.
  const [picking, setPicking] = useState(range.period === "custom");
  const active = picking ? "custom" : range.period;
  const summary = useQuery(staffQueries.summary(range));
  const sales = useQuery(staffQueries.sales(range));
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </SkeletonGroup>
      ) : (
        <div className={cn("grid gap-6", summary.isPlaceholderData && "opacity-60 transition-opacity")}>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
            <section aria-labelledby="net-revenue" className="grid content-start gap-2 rounded-xl border border-border bg-card p-5">
              <h2 id="net-revenue" className="font-sans text-sm font-normal tracking-normal text-muted-foreground">
                Net revenue
              </h2>
              <p className="text-[3.25rem] font-semibold leading-none">{formatUsd(s.revenue.net_usd)}</p>
              <Khr value={s.revenue.net_khr} className="text-[15px]" />
              {c ? <Change percent={c.change_percent.net_revenue} previous={Number(c.revenue.net_usd)} versus={versus} /> : null}
              <p className="text-sm text-muted-foreground tabular-nums">
                {formatUsd(s.revenue.gross_usd)} from {s.delivered_orders} delivered {s.delivered_orders === 1 ? "order" : "orders"}
                {Number(s.revenue.refunds_usd) > 0 ? `, less ${formatUsd(s.revenue.refunds_usd)} refunded` : ""}
              </p>
            </section>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile
                label="Orders placed"
                value={s.orders_placed}
                change={c ? <Change percent={c.change_percent.orders_placed} previous={c.orders_placed} versus={versus} /> : null}
              />
              <Tile
                label="Average order"
                value={formatUsd(s.average_order_value_usd)}
                khr={s.average_order_value_khr}
                detail="delivered orders"
                change={c ? <Change percent={c.change_percent.average_order_value} previous={Number(c.average_order_value_usd)} versus={versus} /> : null}
              />
              <Tile
                label="New customers"
                value={s.new_customers}
                detail="verified their account"
                change={c ? <Change percent={c.change_percent.new_customers} previous={c.new_customers} versus={versus} /> : null}
              />
            </div>
          </div>

          <Panel id="sales-chart" title="Net revenue by day" action={<span className="text-sm text-muted-foreground">by delivery date, less refunds</span>}>
            {sales.isError ? (
              <InlineError error={sales.error} onRetry={() => sales.refetch()} />
            ) : sales.data ? (
              <SalesChart days={sales.data} />
            ) : (
              <Skeleton className="h-60 rounded-md" />
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
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

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel id="order-mix" title="Orders placed by status" action={<span className="text-sm text-muted-foreground">{s.open_returns} open {s.open_returns === 1 ? "return" : "returns"}</span>}>
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                {Object.entries(s.orders_by_status).map(([status, n]) => (
                  <li key={status} className="flex items-center gap-2 text-[15px] tabular-nums">
                    <OrderStatusBadge status={status as OrderStatus} />
                    <span className="font-semibold">{n}</span>
                  </li>
                ))}
              </ul>
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

          {session?.user.role === "admin" ? <SystemHealthCard /> : null}
        </div>
      )}
    </AdminPage>
  );
}
