import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { opsApi, opsQueries, type StaffOrder } from "@/api/endpoints/staffOps";
import type { StaffUser } from "@/api/endpoints/staff";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InlineError } from "@/components/ui/error-state";
import { canViewOrders } from "@/features/admin/orders/newOrders";
import { Panel } from "@/features/admin/reportKit";
import { useT } from "@/i18n";
import { formatUsd } from "@/stores/currency";
import { ArrowRight } from "lucide-react";
import { td, th } from "@/features/admin/listKit";

type Target = "processing" | "shipped";

export function RecentOrders({ user }: { user?: StaffUser }) {
  const { dict } = useT();
  const t = dict.recentOrders;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<{ order: StaffOrder; to: Target } | null>(null);
  const orders = useQuery({ ...opsQueries.orders({ per_page: 5 }), enabled: canViewOrders(user) });
  const change = useMutation({
    mutationFn: ({ order, to }: { order: StaffOrder; to: Target }) => opsApi.setOrderStatus(order.id!, to),
    onSuccess: () => {
      setSelected(null);
      void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard-insights"] });
    },
  });
  if (!canViewOrders(user)) return null;
  const canManage = !!user && (user.role === "admin" || !user.permissions || user.permissions.includes("orders:manage"));
  const actionFor = (order: StaffOrder): Target | undefined => {
    if (!canManage || !order.id || order.is_waiting_stock || (order.payment_method === "khqr" && order.status === "pending")) return undefined;
    if (order.allowed_next_statuses?.includes("processing")) return "processing";
    if (order.allowed_next_statuses?.includes("shipped")) return "shipped";
    return undefined;
  };

  return (
    <Panel id="recent-orders" title={t.title} action={<Link to="/admin/orders" className="group inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{dict.staffHome.viewAll}<ArrowRight className="admin-arrow size-4" aria-hidden="true" /></Link>}>
      {orders.isPending ? <p role="status">{t.loading}</p> : orders.isError ? <InlineError error={orders.error} onRetry={() => void orders.refetch()} /> : !orders.data.data.length ? <p>{t.empty}</p> : (
        <div role="group" aria-label={t.title} tabIndex={0} className="-mx-4 -mb-4 overflow-x-auto sm:-mx-5 sm:-mb-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <thead><tr>{[t.order, t.status, t.total, t.action].map((name) => <th scope="col" className={th} key={name}>{name}</th>)}</tr></thead>
            <tbody>{orders.data.data.map((order) => {
              const action = actionFor(order);
              return (
                <tr key={order.id} className="border-t border-border">
                  <th scope="row" className={td}><Link className="whitespace-nowrap font-semibold text-primary underline-offset-4 hover:underline" to={`/admin/orders/${order.id}`}>{order.order_number}</Link></th>
                  <td className={td}><OrderStatusBadge status={order.status} /></td>
                  <td className={`${td} font-semibold tabular-nums`}>{order.total_usd == null ? "–" : formatUsd(order.total_usd)}</td>
                  <td className={td}>
                    {action ? <Button size="sm" aria-label={`${t[action]} ${order.order_number}`} onClick={() => { change.reset(); setSelected({ order, to: action }); }}>{t[action]}</Button> : <span className="text-muted-foreground">–</span>}
                  </td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      )}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open && !change.isPending) setSelected(null); }}>
        {selected ? (
          <DialogContent size="sm">
            <DialogHeader><DialogTitle>{t.question}</DialogTitle><DialogDescription>{selected.order.order_number} · {t[selected.to]}</DialogDescription></DialogHeader>
            {change.isError ? <p role="alert">{t.failed}</p> : null}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelected(null)} disabled={change.isPending}>{t.cancel}</Button>
              <Button loading={change.isPending} onClick={() => change.mutate(selected)}>{t.confirm}</Button>
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>
    </Panel>
  );
}
