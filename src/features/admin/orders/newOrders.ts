import { useEffect, useRef, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { opsApi } from "@/api/endpoints/staffOps";
import type { StaffUser } from "@/api/endpoints/staff";
import { toast } from "@/stores/toast";

/*
 * New orders without a page refresh. While an admin tab is visible, the shell asks
 * for the single newest order every 30 s (one small request; paused while the tab is
 * hidden, so no websocket server is needed). When a newer order shows up, staff get a
 * toast, the order lists and dashboard reload, and those orders get a "New" badge.
 */

export const NEW_ORDER_POLL_MS = 30_000;

/** The newest order id when this admin tab first loaded; orders above it are "new". */
let firstSeenId: number | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const setFirstSeen = (id: number) => {
  if (firstSeenId !== null) return;
  firstSeenId = id;
  listeners.forEach((listener) => listener());
};

/** Tests only: forget the first-seen order. */
export const resetNewOrders = () => {
  firstSeenId = null;
  listeners.forEach((listener) => listener());
};

/** True for an order placed after this admin tab opened. */
export function useIsNewOrder() {
  const first = useSyncExternalStore(subscribe, () => firstSeenId);
  return (id: number | undefined) => first !== null && id !== undefined && id > first;
}

/** Same rule as the API: admins see everything; staff need "orders:view" (the default set has it). */
export const canViewOrders = (user: StaffUser | undefined) =>
  !!user && (user.role === "admin" || !user.permissions || user.permissions.includes("orders:view"));

export function useNewOrderWatch(user: StaffUser | undefined) {
  const queryClient = useQueryClient();
  const newest = useQuery({
    queryKey: ["staff", "new-order-watch"],
    queryFn: () => opsApi.orders({ per_page: 1 }),
    enabled: canViewOrders(user),
    refetchInterval: NEW_ORDER_POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });
  const last = useRef<{ id: number; total: number } | null>(null);

  useEffect(() => {
    if (!newest.data) return;
    const top = newest.data.data[0];
    const id = top?.id ?? 0; // a shop with no orders yet: every order is newer than 0
    const total = newest.data.meta.total ?? 0;
    const before = last.current;
    last.current = { id, total };
    setFirstSeen(id);
    if (!top || !before || id <= before.id) return;

    const count = Math.max(1, total - before.total);
    toast.info({
      title: count === 1 ? `New order ${top.order_number}` : `${count} new orders`,
      description: count === 1 ? [top.customer?.name, top.item_count === 1 ? "1 item" : `${top.item_count} items`].filter(Boolean).join(" · ") : undefined,
      action: { label: count === 1 ? "View order" : "View orders", href: count === 1 ? `/admin/orders/${id}` : "/admin/orders" },
    });
    void queryClient.invalidateQueries({ queryKey: ["staff", "orders"] });
    void queryClient.invalidateQueries({ queryKey: ["staff", "dashboard"] });
  }, [newest.data, queryClient]);
}
