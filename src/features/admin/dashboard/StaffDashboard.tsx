import { ArrowRight, Boxes, MessageSquareText, Package, RotateCcw, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { StaffUser } from "@/api/endpoints/staff";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPage } from "@/features/admin/AdminPage";
import { RecentOrders } from "@/features/admin/dashboard/RecentOrders";
import { useMenuCounts } from "@/features/admin/menuCounts";

/*
 * Dashboard for staff (not admins). Sales, revenue and insights are admin-only on the API (403 for staff), so staff
 * get the day's work instead: what needs handling now (pending orders, open returns, low stock, from
 * GET /staff/dashboard/counts), the latest orders, and shortcuts to the pages their permissions allow.
 */
const can = (user: StaffUser | undefined, permission: string) => !user?.permissions || user.permissions.includes(permission);

export function StaffDashboard({ user }: { user?: StaffUser }) {
  const counts = useMenuCounts(true);
  const firstName = user?.name.split(" ")[0];
  const tiles = [
    { show: can(user, "orders:view"), to: "/admin/orders?status=pending", label: "Orders to process", value: counts.data?.pending_orders, Icon: Package },
    { show: can(user, "orders:view"), to: "/admin/returns", label: "Open returns", value: counts.data?.open_returns, Icon: RotateCcw },
    { show: can(user, "catalog:view"), to: "/admin/stock?status=low", label: "Low on stock", value: counts.data?.low_stock, Icon: Boxes },
  ].filter((t) => t.show);
  const shortcuts = [
    { show: can(user, "orders:view"), to: "/admin/orders", label: "Orders", Icon: Package },
    { show: can(user, "customers:view"), to: "/admin/customers", label: "Customers", Icon: Users },
    { show: can(user, "catalog:view"), to: "/admin/books", label: "Books", Icon: Boxes },
    { show: can(user, "support:manage"), to: "/admin/support", label: "Support inbox", Icon: MessageSquareText },
  ].filter((s) => s.show);

  return (
    <AdminPage title="Dashboard" lead={`Hello${firstName ? `, ${firstName}` : ""}. Here is what needs your attention today.`}>
      <div className="grid grid-cols-1 gap-6">
        {tiles.length ? (
          <section aria-labelledby="to-do-title" className="grid gap-3">
            <h2 id="to-do-title" className="font-display text-[1.563rem] leading-tight">To do</h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {tiles.map(({ to, label, value, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="desk-card group flex min-h-28 items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="grid gap-1">
                      <span className="text-[15px] font-semibold text-muted-foreground">{label}</span>
                      {counts.isPending ? (
                        <Skeleton className="h-9 w-12" />
                      ) : (
                        <span className="font-display text-[2.25rem] leading-none tabular-nums">{value ?? "—"}</span>
                      )}
                    </span>
                    <span className="grid size-11 place-items-center rounded-full bg-lapis-tint text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <RecentOrders user={user} />

        {shortcuts.length ? (
          <nav aria-label="Shortcuts" className="desk-card grid gap-3 rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-[1.375rem] leading-tight">Shortcuts</h2>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shortcuts.map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link to={to} className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-[15px] font-semibold text-primary hover:bg-lapis-tint">
                    <Icon className="size-4" aria-hidden="true" /> {label} <ArrowRight className="ml-auto size-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </AdminPage>
  );
}
