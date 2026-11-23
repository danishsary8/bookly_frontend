import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderQueries } from "@/api/endpoints/orders";
import { useSession } from "@/api/session";
import type { Customer, Order, OrderStatus } from "@/api/types";
import { isVerified } from "@/features/auth/verification";

/*
 * Order activity notifications: tracks which order statuses the signed-in customer
 * has already seen on this browser. Active orders (pending, paid, processing, shipped)
 * or any order whose status changed since last visit raise a numeric badge on the
 * Account and Orders navigation links; viewing Orders (or the order detail) clears it.
 */

const STORAGE_PREFIX = "bookly.orders.seen.v1.";
const OPEN_STATUSES = new Set<OrderStatus>(["pending", "paid", "processing", "shipped"]);

let revision = 0;
const listeners = new Set<() => void>();

function emit() {
  revision += 1;
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith(STORAGE_PREFIX)) emit();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

const getRevision = () => revision;

function storageKey(customerId: number) {
  return `${STORAGE_PREFIX}${customerId}`;
}

export function readSeenOrderStatuses(customerId: number): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(storageKey(customerId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

function writeSeenOrderStatuses(customerId: number, map: Record<string, string>) {
  try {
    localStorage.setItem(storageKey(customerId), JSON.stringify(map));
  } catch {
    // Private mode or full storage: keep working silently without throwing.
  }
  emit();
}

/**
 * Returns the IDs of orders that have unseen activity.
 * - Before the customer has ever visited Orders on this browser (`seen === null`),
 *   active/open orders count as unread while old finished orders don't create noise.
 * - After the first visit, any new order or any order whose status changed counts as unread.
 */
export function getUnreadOrderIds(orders: Order[], seen: Record<string, string> | null): Set<number> {
  const unread = new Set<number>();
  for (const order of orders) {
    if (order.id == null || !order.status) continue;
    if (seen === null) {
      if (OPEN_STATUSES.has(order.status)) unread.add(order.id);
    } else if (seen[String(order.id)] !== order.status) {
      unread.add(order.id);
    }
  }
  return unread;
}

/** Mark the given orders' current statuses as seen by this customer. */
export function markOrdersSeen(customerId: number | undefined, orders: Order[]) {
  if (!customerId || orders.length === 0) return;
  const existing = readSeenOrderStatuses(customerId);
  const next: Record<string, string> = existing ? { ...existing } : {};
  let changed = existing === null;
  for (const order of orders) {
    if (order.id == null || !order.status) continue;
    const key = String(order.id);
    if (next[key] !== order.status) {
      next[key] = order.status;
      changed = true;
    }
  }
  if (changed) writeSeenOrderStatuses(customerId, next);
}

/** Mark a single order's current status as seen (e.g. when opening its detail page). */
export function markOrderSeen(customerId: number | undefined, order: Order | undefined) {
  if (!order) return;
  markOrdersSeen(customerId, [order]);
}

/** Hook returning the current customer's unseen order activity count and IDs. */
export function useOrderNotifications() {
  const session = useSession<Customer>("customer");
  const customerId = session?.user?.id;
  const enabled = Boolean(customerId) && isVerified(session?.user);
  const rev = useSyncExternalStore(subscribe, getRevision, getRevision);

  const query = useQuery({
    ...orderQueries.orders({ page: 1, per_page: 20 }),
    enabled,
    staleTime: 30_000,
    retry: false,
  });

  const orders = query.data?.data;

  const unreadIds = useMemo(() => {
    void rev;
    if (!enabled || !customerId || !orders?.length) return new Set<number>();
    return getUnreadOrderIds(orders, readSeenOrderStatuses(customerId));
  }, [enabled, customerId, orders, rev]);

  return {
    unreadCount: unreadIds.size,
    unreadIds,
    orders: orders ?? [],
    customerId,
    markAllSeen: () => markOrdersSeen(customerId, orders ?? []),
  };
}
