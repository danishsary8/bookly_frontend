import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BellRing, Boxes, CheckCircle2, ClipboardList, CreditCard, DollarSign, FolderTree, LineChart, PieChart as PieIcon, Receipt, ShoppingBag, Trophy, UserPlus } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { staggerDelay, transitions } from "@/lib/motion";
import { Link, useSearchParams } from "react-router-dom";
import { insightsQueries, type TrendDay } from "@/api/endpoints/dashboardInsights";
import { staffQueries } from "@/api/endpoints/staff";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { IncomeChart } from "@/features/admin/dashboard/IncomeChart";
import { PaymentMethods } from "@/features/admin/dashboard/PaymentMethods";
import { StatusDonut } from "@/features/admin/dashboard/StatusDonut";
import { SalesChart } from "@/features/admin/SalesChart";
import { day, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { Change, CustomRange, Panel, PeriodPicker } from "@/features/admin/reportKit";
import { Kpi, RankTable, SectionLabel } from "@/features/admin/dashboard/DashKit";
import { SystemHealthCard } from "@/features/admin/SystemHealthCard";
import { StaffDashboard } from "@/features/admin/dashboard/StaffDashboard";
import { AnimatedNumber } from "@/features/admin/dashboard/AnimatedNumber";
import { GlanceBento } from "@/features/admin/dashboard/GlanceBento";
import { ProfitGlance } from "@/features/admin/dashboard/ProfitGlance";
import { GoalCard } from "@/features/admin/dashboard/GoalCard";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/stores/currency";
import type { ReactNode } from "react";
import "@/features/admin/dashboard/dashboard.css";

const usd = (n: number) => formatUsd(n.toFixed(2));
const count = (n: number) => Math.round(n).toLocaleString("en-US");

/*
 * A KPI trend line stays readable with any amount of data (owner 2026-11-17: "prepare for big data"): up to 45 days
 * draw one point a day; longer periods are grouped into weeks (90 days) or fortnights (12 months), summed, or averaged for
 * per-order figures, so a year is ~52 smooth points instead of 365 spikes.
 */
const MAX_POINTS = 45;
const bucketSize = (days: TrendDay[] | undefined) => ((days?.length ?? 0) > MAX_POINTS ? 7 * Math.ceil((days?.length ?? 0) / (MAX_POINTS * 7)) : 1);
const series = (days: TrendDay[] | undefined, pick: (d: TrendDay) => number, mode: "sum" | "mean" = "sum") => {
  if (!days?.length) return undefined;
  const size = bucketSize(days);
  if (size === 1) return days.map(pick);
  const out: number[] = [];
  for (let i = 0; i < days.length; i += size) {
    const group = days.slice(i, i + size).map(pick).filter(Number.isFinite);
    const sum = group.reduce((a, b) => a + b, 0);
    const nonZero = group.filter((v) => v > 0);
    out.push(mode === "sum" ? sum : nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0);
  }
  return out;
};
const seriesLabels = (days: TrendDay[] | undefined, label: (date: string) => string) => {
  if (!days?.length) return undefined;
  const size = bucketSize(days);
  if (size === 1) return days.map((d) => label(d.date));
  const out: string[] = [];
  for (let i = 0; i < days.length; i += size) {
    const group = days.slice(i, i + size);
    out.push(`${label(group[0].date)} – ${label(group[group.length - 1].date)}`);
  }
  return out;
};

/*
 * /admin: how the shop is doing over today / 7 / 30 days or chosen days (Phnom Penh days, from
 * the API). Revenue counts delivered orders, less refunds. KPI cards with a trend line, change vs the previous
 * period and a "View" link; the income chart (this period solid, the previous one dashed, Income/Orders switch);
 * best sellers, low stock, an orders-by-status donut and top categories (BI design 2026-11-01, branch 2).
 */
/** Admins get the sales dashboard; staff get their to-do dashboard (the sales endpoints are admin-only). */
export default function DashboardPage() {
  const session = useStaff();
  return session?.user.role === "admin" ? <AdminDashboard /> : <StaffDashboard user={session?.user} />;
}

function AdminDashboard() {
  const { dict } = useT();
  const h = dict.adminHome;
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
  const ins = insights.data;
  const labels = seriesLabels(trend, day);
  const s = summary.data;
  const firstName = session?.user.name.split(" ")[0];
  const c = s?.comparison;
  const versus = c ? `vs ${day(c.period.from)}${c.period.from !== c.period.to ? ` – ${day(c.period.to)}` : ""}` : "";
  const reducedMotion = useReducedMotion();
  // The opening flourish (numbers count up, trend lines draw in) plays once, when the figures first arrive. Cards
  // re-created later (a new period, a refetch) show their values at once, so nothing replays or shifts the page.
  const [opening, setOpening] = useState(true);
  const arrived = Boolean(s);
  useEffect(() => {
    if (!arrived) return;
    const done = window.setTimeout(() => setOpening(false), 1800);
    return () => window.clearTimeout(done);
  }, [arrived]);
  const rise = (index: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { ...transitions.enter, delay: reducedMotion ? 0 : staggerDelay(index) },
  });

  return (
    <div className="dash-overview">
    <AdminPage
      title="Dashboard"
      lead={s ? `${day(s.period.from)}${s.period.from !== s.period.to ? ` to ${day(s.period.to)}` : ""} · Phnom Penh time` : `Hello${firstName ? `, ${firstName}` : ""}`}
      actions={
        <Link to="/admin/purchases" className="dash-purchase-link inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline"><ClipboardList className="size-4" aria-hidden="true" />{dict.purchaseList.title}</Link>
      }
    >
      <div className="dash-toolbar">
        <div className="dash-period-control">
          <span className="dash-toolbar-label">Time period</span>
          <PeriodPicker
            active={active}
            onPick={(value) => {
              if (value === "custom") return setPicking(true);
              setPicking(false);
              setParams(rangeToParams({ period: value }), { replace: true });
            }}
          />
        </div>
        {c ? <p id="dashboard-comparison" className="dash-comparison">Changes {versus}</p> : null}
        {picking ? <div className="dash-custom-range"><CustomRange range={range} shown={s?.period} onApply={(from, to) => setParams(rangeToParams({ period: "custom", from, to }), { replace: true })} /></div> : null}
      </div>
      {summary.isError && !s ? (
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : !s ? (
        <SkeletonGroup label="Loading dashboard…" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-full min-h-36 rounded-2xl" />
            <Skeleton className="h-full min-h-36 rounded-2xl" />
            <Skeleton className="h-full min-h-36 rounded-2xl" />
          </div>
        </SkeletonGroup>
      ) : (
        <div className="dash-content relative grid grid-cols-1 gap-6" aria-busy={summary.isPlaceholderData || undefined}>
          {/* A new period loads in place: a slim bar runs along the top while the old figures stay, then everything glides to the new values. */}
          <span aria-hidden="true" className={cn("admin-loadbar pointer-events-none absolute inset-x-0 -top-3 h-0.5 overflow-hidden rounded-full transition-opacity duration-300", summary.isPlaceholderData || insights.isPlaceholderData ? "opacity-100" : "opacity-0")} />
          {/* 1 · Performance: four KPI cards in the sample's colours (revenue coral, orders saffron, average sky, customers sea). */}
          <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <m.div className="grid" {...rise(0)}>
              <Kpi opening={opening} id="net-revenue" label="Net revenue" value={<AnimatedNumber countUp={opening} value={Number(s.revenue.net_usd)} format={usd} />} khr={s.revenue.net_khr} icon={DollarSign} tone="coral"
                detail={`${formatUsd(s.revenue.gross_usd)} from ${s.delivered_orders} delivered ${s.delivered_orders === 1 ? "order" : "orders"}${Number(s.revenue.refunds_usd) > 0 ? `, less ${formatUsd(s.revenue.refunds_usd)} refunded` : ""}`}
                comparisonId={c ? "dashboard-comparison" : undefined} change={c ? <Change percent={c.change_percent.net_revenue} previous={Number(c.revenue.net_usd)} versus={versus} /> : null}
                trend={series(trend, (d) => Number(d.net_revenue_usd))} labels={labels} format={usd} view={{ to: "/admin/reports", label: "View sales report" }} />
            </m.div>
            <m.div className="grid" {...rise(1)}>
              <Kpi opening={opening} id="orders-placed" label="Orders placed" value={<AnimatedNumber countUp={opening} value={s.orders_placed} format={count} />} icon={ShoppingBag} tone="saffron"
                comparisonId={c ? "dashboard-comparison" : undefined} change={c ? <Change percent={c.change_percent.orders_placed} previous={c.orders_placed} versus={versus} /> : null}
                trend={series(trend, (d) => d.orders_placed)} labels={labels} view={{ to: "/admin/orders", label: "View orders" }} />
            </m.div>
            <m.div className="grid" {...rise(2)}>
              <Kpi opening={opening} id="average-order" label="Average order" value={<AnimatedNumber countUp={opening} value={Number(s.average_order_value_usd)} format={usd} />} khr={s.average_order_value_khr} detail="per delivered order" icon={Receipt} tone="sky"
                comparisonId={c ? "dashboard-comparison" : undefined} change={c ? <Change percent={c.change_percent.average_order_value} previous={Number(c.average_order_value_usd)} versus={versus} /> : null}
                trend={series(trend, (d) => Number(d.average_order_usd), "mean")} labels={labels} format={usd} view={{ to: "/admin/reports?tab=orders", label: "View order report" }} />
            </m.div>
            <m.div className="grid" {...rise(3)}>
              <Kpi opening={opening} id="new-customers" label="New customers" value={<AnimatedNumber countUp={opening} value={s.new_customers} format={count} />} detail="verified their account" icon={UserPlus} tone="sea"
                comparisonId={c ? "dashboard-comparison" : undefined} change={c ? <Change percent={c.change_percent.new_customers} previous={c.new_customers} versus={versus} /> : null}
                trend={series(trend, (d) => d.new_customers)} labels={labels} view={{ to: "/admin/customers", label: "View customers" }} />
            </m.div>
          </div>

          {/* 2 · Sales over time and where orders are. */}
          <SectionLabel>{h.sales}</SectionLabel>
          <div className="dash-sales-grid grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {trend?.length ? (
              <Panel id="sales-chart" title="Income report" icon={LineChart} tone="coral" action={<span className="text-sm text-muted-foreground">this period vs the previous one · by delivery date, less refunds</span>}>
                <IncomeChart days={trend} />
              </Panel>
            ) : (
              <Panel id="sales-chart" title="Net revenue by day" icon={BarChart3} tone="blue" action={<span className="text-sm text-muted-foreground">by delivery date, less refunds</span>}>
                {sales.isError ? <InlineError error={sales.error} onRetry={() => sales.refetch()} /> : sales.data ? <SalesChart days={sales.data} /> : <Skeleton className="h-60 rounded-md" />}
              </Panel>
            )}
            <Panel
              id="order-mix"
              title="Orders placed by status"
              icon={PieIcon}
              tone="sky"
              action={
                <Link to="/admin/orders" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {s.open_returns} open {s.open_returns === 1 ? "return" : "returns"} · View orders <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
                </Link>
              }
            >
              <StatusDonut counts={s.orders_by_status} />
            </Panel>
          </div>

          {/* 2a · Profit for the same days (Reports → Profit, owner 2026-11-16). */}
          {/* 2a · This month's goal next to the profit for the chosen days (Phase 4). */}
          <div className="dash-money-grid grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <GoalCard opening={opening} />
            <ProfitGlance opening={opening} versus={versus} from={s.period.from} to={s.period.to} link={`/admin/reports?${new URLSearchParams({ ...rangeToParams(range), tab: "profit" }).toString()}`} />
          </div>

          {/* 2b · At a glance: the React Bits MagicBento with the shop's own figures (owner 2026-11-15). */}
          <SectionLabel>{h.glance}</SectionLabel>
          <GlanceBento s={s} ins={ins} />

          {/* 3 · Books: what sells, which shelves, what runs out. */}
          <SectionLabel>{h.catalogue}</SectionLabel>
          <div className="dash-catalogue-grid grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
            <Panel id="best-sellers" title="Best sellers" icon={Trophy} tone="saffron">
              {s.best_sellers.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">No delivered sales in this period yet.</p>
              ) : (
                <RankTable head={["Book", "Copies", "Sales"]} rows={s.best_sellers.map((b) => ({ key: b.book_id, copies: b.copies_sold, sales: formatUsd(b.sales_usd), khr: b.sales_khr, name: <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{b.title}</Link> }))} />
              )}
            </Panel>
            {/* Top categories and low stock share the right column, beside the longer best sellers list. */}
            <div className="grid content-start gap-6">
            <Panel id="top-categories" title="Top categories" icon={FolderTree} tone="sky" action={<span className="text-sm text-muted-foreground">by copies in orders placed</span>}>
              {!s.top_categories || s.top_categories.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">No categorised sales in this period yet.</p>
              ) : (
                <RankTable head={["Category", "Copies", "Sales"]} rows={s.top_categories.map((t) => ({ key: t.category_id, copies: t.copies_sold, sales: formatUsd(t.sales_usd), khr: t.sales_khr, name: <span className="font-semibold">{t.name}</span> }))} />
              )}
            </Panel>
            <Panel
              id="low-stock"
              title="Low stock"
              icon={Boxes}
              tone="coral"
              action={<Link to="/admin/stock" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">{h.allStock} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>}
            >
              {s.low_stock.length === 0 ? (
                <p className="flex items-center gap-2 text-[15px] text-success"><CheckCircle2 className="size-4" aria-hidden="true" />Every active format is above its low-stock level.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2">
                  {s.low_stock.map((v) => (
                    <li key={v.book_variant_id} className="min-w-0">
                      <Link to={`/admin/books/${v.book_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{v.title}</span>
                          <span className="block truncate text-sm text-muted-foreground">{formatLabel(v.format)} · {v.sku}</span>
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
          </div>

          {/* 4 · Customers and how they pay. */}
          {ins?.payment_methods || ins?.cart_reminder_recovery ? (
            <>
              <SectionLabel>{h.customers}</SectionLabel>
              <div className="dash-customers-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
                {ins.payment_methods ? (
                  <Panel id="payment-methods" title={dict.dashboardAnalysis.payments} icon={CreditCard} tone="rose" action={<span className="text-sm text-muted-foreground">{dict.dashboardAnalysis.paymentNote}</span>}>
                    <PaymentMethods rows={ins.payment_methods} />
                  </Panel>
                ) : null}
                <div className="grid content-start gap-6">
                  {ins.cart_reminder_recovery ? (
                    <Panel id="reminder-recovery" title={dict.dashboardAnalysis.reminder} icon={BellRing} tone="violet">
                      <p className="text-sm text-muted-foreground">{dict.dashboardAnalysis.reminderNote}</p>
                      <dl className="dash-reminder-metrics grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Stat label={dict.dashboardAnalysis.recovered} value={`${ins.cart_reminder_recovery.recovered} (${ins.cart_reminder_recovery.percent}%)`} />
                        <Stat label={dict.dashboardAnalysis.sent} value={<AnimatedNumber countUp={opening} value={ins.cart_reminder_recovery.sent} format={count} />} />
                        {ins.promotions?.gift_orders !== undefined ? <Stat label={dict.dashboardAnalysis.gifts} value={<AnimatedNumber countUp={opening} value={ins.promotions.gift_orders} format={count} />} /> : null}
                      </dl>
                    </Panel>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          <SystemHealthCard />
        </div>
      )}
    </AdminPage>
    </div>
  );
}

/** A small figure inside a panel: label above, number below (the label's next element is the value). */
function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl bg-[var(--tone-tint)] px-3.5 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
