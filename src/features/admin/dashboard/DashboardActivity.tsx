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
    [t.pending, a.pending_orders, "/admin/orders?status=pending"], [t.returns, a.open_returns, "/admin/returns"],
    [t.stock, a.low_stock, "/admin/stock"], [t.waiting, a.waiting_orders, "/admin/orders?status=waiting"],
    [t.reviews, a.recent_reviews, "/admin/reviews"], [t.chats, a.open_chats, "/admin/support"],
  ] as const;

  return <Panel id="dashboard-activity" title={t.title}>
    <Tabs defaultValue="attention">
      <TabsList><TabsTrigger value="attention">{t.attention}</TabsTrigger><TabsTrigger value="activity">{t.activity}</TabsTrigger></TabsList>
      <TabsContent value="attention"><ul className="grid gap-2 sm:grid-cols-2">{rows.map(([label, count, to]) => <li key={to}><Link to={to} className="flex justify-between gap-4 rounded-md border border-border p-3 hover:bg-secondary"><span>{label}</span><span className="font-semibold tabular-nums">{count}</span></Link></li>)}</ul></TabsContent>
      <TabsContent value="activity">{data.activity.length ? <ol className="divide-y divide-border">{data.activity.map((event) => <li key={event.id} className="py-2 text-sm"><span className="font-semibold">{event.staff_name ?? t.unknown}</span> · {event.action} · {event.entity_type} #{event.entity_id}<br /><time dateTime={event.created_at} className="text-muted-foreground">{orderDateTime(event.created_at)}</time></li>)}</ol> : <p>{t.empty}</p>}</TabsContent>
    </Tabs>
  </Panel>;
}
