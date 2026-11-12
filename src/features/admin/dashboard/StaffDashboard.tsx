import { m, useReducedMotion } from "motion/react";
import { staggerDelay, transitions } from "@/lib/motion";
import { ArrowRight, BookCopy, BookPlus, Boxes, CalendarDays, CheckCircle2, CircleAlert, Headset, Package, RotateCcw, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { StaffUser } from "@/api/endpoints/staff";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import type { AdminTone } from "@/features/admin/adminNav";
import { RecentOrders } from "@/features/admin/dashboard/RecentOrders";
import { useMenuCounts } from "@/features/admin/menuCounts";
import { useT } from "@/i18n";

/*
 * Dashboard for staff (not admins). Sales, revenue and insights are admin-only on the API (403 for staff), so staff
 * get the day's work instead: a greeting band that says how much is waiting, one colour-coded card per queue
 * (GET /staff/dashboard/counts), the latest orders with their next step, and quick actions their permissions allow.
 */
const can = (user: StaffUser | undefined, permission: string) => !user?.permissions || user.permissions.includes(permission);

type Task = { to: string; label: string; hint: string; value?: number; Icon: LucideIcon; tone: AdminTone };

const greetingKey = (hour: number) => (hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening");

export function StaffDashboard({ user }: { user?: StaffUser }) {
  const { dict, locale } = useT();
  const t = dict.staffHome;
  const counts = useMenuCounts(true);
  const reducedMotion = useReducedMotion();
  const firstName = user?.name.split(" ")[0];
  const now = new Date();
  const today = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Phnom_Penh" }).format(now);
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Phnom_Penh" }).format(now));

  const tasks: Task[] = [
    can(user, "orders:view") && { to: "/admin/orders?status=pending", label: t.orders, hint: t.ordersHint, value: counts.data?.pending_orders, Icon: Package, tone: "blue" as const },
    can(user, "orders:view") && { to: "/admin/returns", label: t.returns, hint: t.returnsHint, value: counts.data?.open_returns, Icon: RotateCcw, tone: "amber" as const },
    can(user, "catalog:view") && { to: "/admin/stock?status=low", label: t.stock, hint: t.stockHint, value: counts.data?.low_stock, Icon: Boxes, tone: "rose" as const },
  ].filter(Boolean) as Task[];
  const busyTasks = tasks.filter((task) => (task.value ?? 0) > 0);
  const waiting = busyTasks.length;
  const next = counts.isPending ? undefined : busyTasks[0];
  const summary = counts.isPending ? null : waiting === 0 ? t.clear : waiting === 1 ? t.busyOne : t.busyMany.replace("{n}", String(waiting));

  const quick = [
    { show: can(user, "orders:view"), to: "/admin/orders", label: t.allOrders, Icon: Package, tone: "blue" },
    { show: can(user, "customers:view"), to: "/admin/customers", label: t.customers, Icon: Users, tone: "blue" },
    { show: can(user, "support:manage"), to: "/admin/support", label: t.support, Icon: Headset, tone: "teal" },
    { show: can(user, "catalog:view"), to: "/admin/books", label: t.books, Icon: BookCopy, tone: "amber" },
    { show: can(user, "catalog:manage"), to: "/admin/books/new", label: t.newBook, Icon: BookPlus, tone: "violet" },
    { show: can(user, "catalog:view"), to: "/admin/stock", label: t.stockPage, Icon: Boxes, tone: "rose" },
  ].filter((item) => item.show);

  const enter = (index: number) => ({
    initial: reducedMotion ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { ...transitions.enter, delay: reducedMotion ? 0 : staggerDelay(index) },
  });

  return (
    <AdminPage title="Dashboard" lead={`${t[greetingKey(hour)]}${firstName ? `, ${firstName}` : ""}.`}>
      <div className="grid grid-cols-1 gap-6">
        <section aria-label={t.today} className="admin-hero rounded-2xl px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="grid gap-2">
              <p className="admin-hero-chip inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold">
                <CalendarDays className="size-4" aria-hidden="true" /> {today}
              </p>
              <p className="max-w-xl text-[1.375rem] font-semibold leading-snug tracking-[-0.01em] sm:text-[1.6rem]" role="status">
                {summary ?? <Skeleton className="h-8 w-72 bg-white/15" />}
              </p>
            </div>
            {next ? (
              <Link
                to={next.to}
                className="group inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-[15px] font-semibold text-[#14207A] shadow-sm outline-none transition-transform hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-[#14207A] motion-reduce:transform-none"
              >
                {t.start} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </section>

        {tasks.length ? (
          <section aria-labelledby="to-do-title" className="grid gap-3">
            <h2 id="to-do-title" className="text-lg">{t.todo}</h2>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {tasks.map(({ to, label, hint, value, Icon, tone }, index) => {
                const busy = (value ?? 0) > 0;
                return (
                  <m.li key={to} data-tone={tone} {...enter(index)}>
                    <Link
                      to={to}
                      className="admin-task desk-card group flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="admin-task-icon grid size-11 place-items-center rounded-xl">
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        {counts.isPending ? null : (
                          <span className={busy ? "admin-task-status inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold" : "inline-flex items-center gap-1 rounded-full bg-success-tint px-2.5 py-1 text-xs font-bold text-success"}>
                            {busy ? <CircleAlert className="size-3.5" aria-hidden="true" /> : <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                            {busy ? t.needsAction : t.allClear}
                          </span>
                        )}
                      </span>
                      <span className="grid gap-1">
                        <span className="text-[15px] font-semibold">{label}</span>
                        {counts.isPending ? (
                          <Skeleton className="h-11 w-14" />
                        ) : (
                          <span className="text-[2.75rem] font-semibold leading-none tracking-[-0.02em] tabular-nums">{value ?? "—"}</span>
                        )}
                        <span className="text-sm text-muted-foreground">{hint}</span>
                      </span>
                      <span className="mt-auto flex items-center justify-between border-t border-border pt-3 text-sm font-semibold" style={{ color: "var(--tone-ink)" }}>
                        {t.open} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
                      </span>
                    </Link>
                  </m.li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <RecentOrders user={user} />
          {quick.length ? (
            <nav aria-labelledby="quick-title" className="desk-card grid content-start gap-3 rounded-xl border border-border bg-card p-5">
              <h2 id="quick-title">{t.quick}</h2>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-1">
                {quick.map(({ to, label, Icon, tone }) => (
                  <li key={to} data-tone={tone}>
                    <Link to={to} className="admin-quick group flex min-h-12 items-center gap-3 rounded-xl border border-transparent px-2.5 text-[15px] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="admin-quick-icon grid size-9 shrink-0 place-items-center rounded-lg"><Icon className="size-[18px]" aria-hidden="true" /></span>
                      <span className="min-w-0 truncate">{label}</span>
                      <ArrowRight className="admin-arrow ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
