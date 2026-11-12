import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AlertTriangle, ArrowRight, BarChart3, BellRing, BookOpen, Boxes, CheckCircle2, ClipboardList, CreditCard, DollarSign, FolderTree, LineChart, MapPin, PieChart as PieIcon, Receipt, ShoppingBag, Star, Tablet, Trophy, UserPlus, Users, type LucideIcon } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { staggerDelay, transitions } from "@/lib/motion";
import { Link, useSearchParams } from "react-router-dom";
import { insightsQueries, type TrendDay } from "@/api/endpoints/dashboardInsights";
import { staffQueries } from "@/api/endpoints/staff";
import { ErrorState, InlineError } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { IncomeChart } from "@/features/admin/dashboard/IncomeChart";
import { InsightsWidgets } from "@/features/admin/dashboard/InsightsWidgets";
import { PaymentMethods } from "@/features/admin/dashboard/PaymentMethods";
import { DashboardActivity } from "@/features/admin/dashboard/DashboardActivity";
import { RecentOrders } from "@/features/admin/dashboard/RecentOrders";
import { Sparkline } from "@/features/admin/dashboard/Sparkline";
import { StatusDonut } from "@/features/admin/dashboard/StatusDonut";
import { SalesChart } from "@/features/admin/SalesChart";
import { day, rangeFromParams, rangeToParams } from "@/features/admin/dashboardRange";
import { Change, CustomRange, Khr, Panel, PeriodPicker } from "@/features/admin/reportKit";
import { SystemHealthCard } from "@/features/admin/SystemHealthCard";
import { StaffDashboard } from "@/features/admin/dashboard/StaffDashboard";
import { useStaff } from "@/features/admin/staffSession";
import { useT } from "@/i18n";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatKhr, formatUsd } from "@/stores/currency";
import type { ReactNode } from "react";

type Tone = "blue" | "teal" | "violet" | "amber" | "rose" | "green" | "slate";

/** A KPI tile: tinted icon, label, figure, change vs the previous period, a trend line in the tile's colour and a "View …" link. */
function Kpi({ id, label, value, khr, detail, change, trend, view, icon: Icon, tone }: {
  id: string;
  label: string;
  value: ReactNode;
  khr?: string | null;
  detail?: string;
  change?: ReactNode;
  trend?: number[];
  view: { to: string; label: string };
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <section aria-labelledby={id} data-tone={tone} className="admin-kpi admin-task flex flex-col gap-2.5 desk-card rounded-2xl border border-border bg-card p-5">
      <div className="admin-kpi-top">
        <h2 id={id} className="font-sans text-sm font-semibold tracking-normal text-muted-foreground">{label}</h2>
        <span className="admin-kpi-icon" aria-hidden="true"><Icon className="size-[18px]" /></span>
      </div>
      <p className="text-[1.875rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value}</p>
      <Khr value={khr} />
      {change}
      {detail ? <p className="text-sm text-muted-foreground tabular-nums">{detail}</p> : null}
      {trend ? <Sparkline values={trend} color="var(--tone-ink)" className="mt-1 h-10" /> : null}
      <Link to={view.to} className="group mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: "var(--tone-ink)" }}>
        {view.label} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

/** The lead figure: net revenue on the lapis→violet band, with a large trend line. */
function RevenueHero({ value, khr, change, detail, trend }: { value: string; khr?: string | null; change?: ReactNode; detail: string; trend?: number[] }) {
  return (
    <section aria-labelledby="net-revenue" className="admin-hero admin-kpi relative flex flex-col gap-3 overflow-hidden rounded-2xl p-6 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 id="net-revenue" className="flex items-center gap-2 font-sans text-[15px] font-semibold tracking-normal text-white">
          <span aria-hidden="true" className="admin-hero-chip grid size-9 place-items-center rounded-xl"><DollarSign className="size-[18px]" /></span>
          Net revenue
        </h2>
        <span className="admin-hero-chip rounded-full px-2.5 py-1 text-xs font-semibold">USD</span>
      </div>
      <p className="text-[clamp(2.4rem,4vw,3.5rem)] font-semibold leading-none tracking-[-0.03em] tabular-nums text-white">{value}</p>
      {khr ? <span className="admin-hero-muted block text-[15px] tabular-nums">≈ {formatKhr(khr)}</span> : null}
      {change}
      <p className="admin-hero-muted text-sm tabular-nums">{detail}</p>
      {trend ? <Sparkline values={trend} color="#ffffff" fill={0.28} className="mt-auto h-28" /> : null}
      <Link to="/admin/reports" className="group inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-[#14207A] outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#14207A]">
        View sales report <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

/** A ranked list with a bar per row (best sellers, top categories). The numbers are in the table cells. */
function RankTable({ head, rows }: { head: [string, string, string]; rows: Array<{ key: number; name: ReactNode; copies: number; sales: string; khr?: string | null }> }) {
  const max = Math.max(1, ...rows.map((r) => r.copies));
  return (
    <table className="w-full text-left text-[15px] tabular-nums">
      <thead className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
        <tr>
          <th scope="col" className="pb-2 font-semibold">{head[0]}</th>
          <th scope="col" className="pb-2 pl-4 text-right font-semibold">{head[1]}</th>
          <th scope="col" className="pb-2 pl-4 text-right font-semibold">{head[2]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key} className="border-t border-border/70">
            <th scope="row" className="py-2.5 pr-3 font-normal">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", i === 0 ? "bg-gold text-[#0E1335]" : "admin-task-icon")}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {r.name}
                  <span aria-hidden="true" className="mt-1.5 block h-1.5 rounded-full bg-secondary"><span className="block h-full rounded-full" style={{ width: `${(Math.max(0, r.copies) / max) * 100}%`, background: "linear-gradient(90deg, color-mix(in oklab, var(--tone-ink) 55%, var(--card)), var(--tone-ink))" }} /></span>
                </span>
              </span>
            </th>
            <td className="py-2.5 pl-4 text-right">{r.copies}</td>
            <td className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">{r.sales}<Khr value={r.khr} className="font-normal" /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"><span>{children}</span><span aria-hidden="true" className="h-px flex-1 bg-border" /></p>;
}

const series = (days: TrendDay[] | undefined, pick: (d: TrendDay) => number) => (days?.length ? days.map(pick) : undefined);

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
  const s = summary.data;
  const firstName = session?.user.name.split(" ")[0];
  const c = s?.comparison;
  const versus = c ? `vs ${day(c.period.from)}${c.period.from !== c.period.to ? ` – ${day(c.period.to)}` : ""}` : "";
  const reducedMotion = useReducedMotion();
  const rise = (index: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { ...transitions.enter, delay: reducedMotion ? 0 : staggerDelay(index) },
  });

  return (
    <AdminPage
      title="Dashboard"
      lead={s ? `${day(s.period.from)}${s.period.from !== s.period.to ? ` to ${day(s.period.to)}` : ""} · Phnom Penh time` : `Hello${firstName ? `, ${firstName}` : ""}`}
      actions={
        <div className="grid justify-items-end gap-3">
          <Link to="/admin/purchases" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"><ClipboardList className="size-4" aria-hidden="true" />{dict.purchaseList.title}</Link>
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
        <SkeletonGroup label="Loading dashboard…" className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-80 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Skeleton className="h-full min-h-36 rounded-2xl" />
            <Skeleton className="h-full min-h-36 rounded-2xl" />
            <Skeleton className="h-full min-h-36 rounded-2xl" />
          </div>
        </SkeletonGroup>
      ) : (
        <div className={cn("grid grid-cols-1 gap-6", summary.isPlaceholderData && "opacity-60 transition-opacity")}>
          {/* 1 · Performance: the lead figure on the left, supporting tiles on the right (bento). */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <m.div className="grid" {...rise(0)}>
              <RevenueHero
                value={formatUsd(s.revenue.net_usd)}
                khr={s.revenue.net_khr}
                change={c ? <Change onDark percent={c.change_percent.net_revenue} previous={Number(c.revenue.net_usd)} versus={versus} /> : null}
                detail={`${formatUsd(s.revenue.gross_usd)} from ${s.delivered_orders} delivered ${s.delivered_orders === 1 ? "order" : "orders"}${Number(s.revenue.refunds_usd) > 0 ? `, less ${formatUsd(s.revenue.refunds_usd)} refunded` : ""}`}
                trend={series(trend, (d) => Number(d.net_revenue_usd))}
              />
            </m.div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <m.div className="grid" {...rise(1)}>
                <Kpi id="orders-placed" label="Orders placed" value={s.orders_placed} icon={ShoppingBag} tone="blue"
                  change={c ? <Change percent={c.change_percent.orders_placed} previous={c.orders_placed} versus={versus} /> : null}
                  trend={series(trend, (d) => d.orders_placed)} view={{ to: "/admin/orders", label: "View orders" }} />
              </m.div>
              <m.div className="grid" {...rise(2)}>
                <Kpi id="average-order" label="Average order" value={formatUsd(s.average_order_value_usd)} khr={s.average_order_value_khr} detail="delivered orders" icon={Receipt} tone="violet"
                  change={c ? <Change percent={c.change_percent.average_order_value} previous={Number(c.average_order_value_usd)} versus={versus} /> : null}
                  trend={series(trend, (d) => Number(d.average_order_usd))} view={{ to: "/admin/reports?tab=orders", label: "View order report" }} />
              </m.div>
              <m.div className="grid" {...rise(3)}>
                <Kpi id="new-customers" label="New customers" value={s.new_customers} detail="verified their account" icon={UserPlus} tone="teal"
                  change={c ? <Change percent={c.change_percent.new_customers} previous={c.new_customers} versus={versus} /> : null}
                  trend={series(trend, (d) => d.new_customers)} view={{ to: "/admin/customers", label: "View customers" }} />
              </m.div>
              {s.books_sold !== undefined && s.ebooks_sold !== undefined ? (
                <>
                  <m.div className="grid" {...rise(4)}>
                    <Kpi id="books-sold" label={dict.dashboardCopies.books} value={s.books_sold} detail={dict.dashboardCopies.detail} icon={BookOpen} tone="amber"
                      change={c ? <Change percent={c.change_percent.books_sold} previous={c.books_sold} versus={versus} /> : null}
                      trend={trend?.every((d) => d.books_sold !== undefined) ? series(trend, (d) => d.books_sold ?? 0) : undefined}
                      view={{ to: "/admin/reports?tab=products", label: dict.dashboardCopies.view }} />
                  </m.div>
                  <m.div className="grid" {...rise(5)}>
                    <Kpi id="ebooks-sold" label={dict.dashboardCopies.ebooks} value={s.ebooks_sold} detail={dict.dashboardCopies.detail} icon={Tablet} tone="rose"
                      change={c ? <Change percent={c.change_percent.ebooks_sold} previous={c.ebooks_sold} versus={versus} /> : null}
                      trend={trend?.every((d) => d.ebooks_sold !== undefined) ? series(trend, (d) => d.ebooks_sold ?? 0) : undefined}
                      view={{ to: "/admin/reports?tab=products", label: dict.dashboardCopies.view }} />
                  </m.div>
                </>
              ) : null}
              {ins?.order_ratings ? (
                <m.div className="grid" {...rise(6)}>
                  <section aria-labelledby="order-rating" data-tone="amber" className="admin-kpi desk-card flex flex-col gap-2.5 rounded-2xl border border-border bg-card p-5">
                    <div className="admin-kpi-top">
                      <h2 id="order-rating" className="font-sans text-sm font-semibold tracking-normal text-muted-foreground">{dict.ratings.title}</h2>
                      <span className="admin-kpi-icon" aria-hidden="true"><Star className="size-[18px]" /></span>
                    </div>
                    <p className="text-[1.875rem] font-semibold leading-none tabular-nums">{ins.order_ratings.average ?? "—"}<span className="text-base font-normal text-muted-foreground"> / 5</span></p>
                    <p className="text-sm text-muted-foreground tabular-nums">{h.ratings.replace("{n}", String(ins.order_ratings.count))}</p>
                    <Link to="/admin/ratings" className="group mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: "var(--tone-ink)" }}>{h.viewRatings} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>
                  </section>
                </m.div>
              ) : null}
            </div>
          </div>

          {/* 2 · Sales over time and where orders are. */}
          <SectionLabel>{h.sales}</SectionLabel>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {trend?.length ? (
              <Panel id="sales-chart" title="Income report" icon={LineChart} tone="violet" action={<span className="text-sm text-muted-foreground">this period vs the previous one · by delivery date, less refunds</span>}>
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
              tone="blue"
              action={
                <Link to="/admin/orders" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">
                  {s.open_returns} open {s.open_returns === 1 ? "return" : "returns"} · View orders <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
                </Link>
              }
            >
              <StatusDonut counts={s.orders_by_status} />
            </Panel>
          </div>

          {/* 3 · Books: what sells, which shelves, what runs out. */}
          <SectionLabel>{h.catalogue}</SectionLabel>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,4fr)]">
            <Panel id="best-sellers" title="Best sellers" icon={Trophy} tone="amber">
              {s.best_sellers.length === 0 ? (
                <p className="text-[15px] text-muted-foreground">No delivered sales in this period yet.</p>
              ) : (
                <RankTable head={["Book", "Copies", "Sales"]} rows={s.best_sellers.map((b) => ({ key: b.book_id, copies: b.copies_sold, sales: formatUsd(b.sales_usd), khr: b.sales_khr, name: <Link to={`/admin/books/${b.book_id}`} className="font-semibold underline-offset-4 hover:text-primary hover:underline">{b.title}</Link> }))} />
              )}
            </Panel>
            <Panel id="top-categories" title="Top categories" icon={FolderTree} tone="violet" action={<span className="text-sm text-muted-foreground">by copies in orders placed</span>}>
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
              tone="rose"
              className="lg:col-span-2 2xl:col-span-1"
              action={<Link to="/admin/stock" className="group inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline">{h.allStock} <ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>}
            >
              {s.low_stock.length === 0 ? (
                <p className="flex items-center gap-2 text-[15px] text-success"><CheckCircle2 className="size-4" aria-hidden="true" />Every active format is above its low-stock level.</p>
              ) : (
                <ul className="grid gap-2">
                  {s.low_stock.map((v) => (
                    <li key={v.book_variant_id}>
                      <Link to={`/admin/books/${v.book_id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-[15px] outline-none transition-colors hover:bg-[var(--tone-tint)] focus-visible:ring-2 focus-visible:ring-ring">
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{v.title}</span>
                          <span className="block text-sm text-muted-foreground">{formatLabel(v.format)} · {v.sku}</span>
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

          {/* 4 · Customers and how they pay. */}
          {ins?.payment_methods || ins?.cart_reminder_recovery || ins?.repeat_customer_rate || ins?.delivery_areas ? (
            <>
              <SectionLabel>{h.customers}</SectionLabel>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {ins.payment_methods ? (
                  <Panel id="payment-methods" title={dict.dashboardAnalysis.payments} icon={CreditCard} tone="rose" action={<span className="text-sm text-muted-foreground">{dict.dashboardAnalysis.paymentNote}</span>}>
                    <PaymentMethods rows={ins.payment_methods} />
                  </Panel>
                ) : null}
                <div className="grid content-start gap-6">
                  {ins.repeat_customer_rate ? (
                    <Panel id="buyers" title={dict.dashboardBuyers.title} icon={Users} tone="teal">
                      <dl className="grid grid-cols-2 gap-3">
                        <Stat label={dict.dashboardPrint.firstTime} value={ins.repeat_customer_rate.customers - ins.repeat_customer_rate.returning} />
                        <Stat label={dict.dashboardPrint.returning} value={ins.repeat_customer_rate.returning} />
                      </dl>
                    </Panel>
                  ) : null}
                  {ins.delivery_areas ? (
                    <Panel id="delivery-areas" title={dict.dashboardAreas.title} icon={MapPin} tone="green" action={<span className="text-sm text-muted-foreground">{dict.dashboardAreas.note}</span>}>
                      <dl className="grid grid-cols-3 gap-3">
                        <Stat label={dict.dashboardAreas.phnomPenh} value={ins.delivery_areas.phnom_penh} />
                        <Stat label={dict.dashboardAreas.provinces} value={ins.delivery_areas.provinces} />
                        <Stat label={dict.dashboardAreas.unknown} value={ins.delivery_areas.unknown} />
                      </dl>
                    </Panel>
                  ) : null}
                  {ins.cart_reminder_recovery ? (
                    <Panel id="reminder-recovery" title={dict.dashboardAnalysis.reminder} icon={BellRing} tone="violet">
                      <p className="text-sm text-muted-foreground">{dict.dashboardAnalysis.reminderNote}</p>
                      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Stat label={dict.dashboardAnalysis.recovered} value={`${ins.cart_reminder_recovery.recovered} (${ins.cart_reminder_recovery.percent}%)`} />
                        <Stat label={dict.dashboardAnalysis.sent} value={ins.cart_reminder_recovery.sent} />
                        {ins.promotions?.gift_orders !== undefined ? <Stat label={dict.dashboardAnalysis.gifts} value={ins.promotions.gift_orders} /> : null}
                      </dl>
                    </Panel>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}

          {/* 5 · Operations: what needs attention, latest orders, deeper insights and health. */}
          <SectionLabel>{h.operations}</SectionLabel>
          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            {ins ? <DashboardActivity data={ins} /> : null}
            <RecentOrders user={session?.user} />
          </div>

          {ins?.dead_stock && ins.stock_value && ins.promotions && ins.repeat_customer_rate && ins.top_authors && ins.provinces ? <InsightsWidgets data={ins} /> : null}

          <SystemHealthCard />
        </div>
      )}
    </AdminPage>
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
