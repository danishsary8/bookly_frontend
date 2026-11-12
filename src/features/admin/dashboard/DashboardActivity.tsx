import { Activity, Boxes, Clock, Headset, MessageSquareText, Package, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardInsights } from "@/api/endpoints/dashboardInsights";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Panel } from "@/features/admin/reportKit";
import { orderDateTime } from "@/features/orders/format";
import { useT } from "@/i18n";

export function DashboardActivity({ data }: { data: DashboardInsights }) {
  const t = useT().dict.dashboardActivity;
  if (!data.attention || !data.activity) return null;
  const a = data.attention;
  const rows = [
    [t.pending, a.pending_orders, "/admin/orders?status=pending", Package, "blue"],
    [t.returns, a.open_returns, "/admin/returns", RotateCcw, "amber"],
    [t.stock, a.low_stock, "/admin/stock", Boxes, "rose"],
    [t.waiting, a.waiting_orders, "/admin/orders?status=waiting", Clock, "violet"],
    [t.reviews, a.recent_reviews, "/admin/reviews", MessageSquareText, "teal"],
    [t.chats, a.open_chats, "/admin/support", Headset, "teal"],
  ] as const;

  return (
    <Panel id="dashboard-activity" title={t.title} icon={Activity} tone="teal">
      <Tabs defaultValue="attention">
        <TabsList><TabsTrigger value="attention">{t.attention}</TabsTrigger><TabsTrigger value="activity">{t.activity}</TabsTrigger></TabsList>
        <TabsContent value="attention">
          <ul className="grid gap-2 sm:grid-cols-2">
            {rows.map(([label, count, to, Icon, tone]) => (
              <li key={to} data-tone={tone}>
                <Link to={to} className="admin-quick flex min-h-14 items-center gap-3 rounded-xl border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span aria-hidden="true" className="admin-quick-icon grid size-9 shrink-0 place-items-center rounded-lg"><Icon className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1 text-[15px]">{label}</span>
                  <span className="text-lg font-semibold tabular-nums">{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="activity">
          {data.activity.length ? (
            <ol className="relative grid gap-4 border-l-2 border-border pl-5">
              {data.activity.map((event) => (
                <li key={event.id} className="relative text-sm">
                  <span aria-hidden="true" className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-[var(--tone-ink)]" />
                  <span className="font-semibold">{event.staff_name ?? t.unknown}</span> · {event.action} · {event.entity_type} #{event.entity_id}
                  <br />
                  <time dateTime={event.created_at} className="text-muted-foreground">{orderDateTime(event.created_at)}</time>
                </li>
              ))}
            </ol>
          ) : <p className="text-muted-foreground">{t.empty}</p>}
        </TabsContent>
      </Tabs>
    </Panel>
  );
}
