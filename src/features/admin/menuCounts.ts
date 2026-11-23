import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import type { Resource } from "@/api/types";

/*
 * Menu badges (BI design 2026-11-01, owner 5A): pending orders, open returns, low stock, from
 * GET /staff/dashboard/counts (every staff member, cached 60 s on the API). Checked once a minute while the admin is
 * open. On an API without the endpoint (404) or on any error there are simply no badges.
 */
export interface MenuCounts {
  pending_orders: number;
  open_returns: number;
  low_stock: number;
}

/** Which menu item shows which count (matches both /admin/* and /staff/* paths). */
const ORDERS_COUNT = { key: "pending_orders" as const, label: (n: number) => `${n} pending ${n === 1 ? "order" : "orders"}` };
const RETURNS_COUNT = { key: "open_returns" as const, label: (n: number) => `${n} open ${n === 1 ? "return" : "returns"}` };
const STOCK_COUNT = { key: "low_stock" as const, label: (n: number) => `${n} low on stock` };

export const COUNT_FOR: Record<string, { key: keyof MenuCounts; label: (n: number) => string }> = {
  "/admin/orders": ORDERS_COUNT,
  "/staff/orders": ORDERS_COUNT,
  "/admin/returns": RETURNS_COUNT,
  "/staff/returns": RETURNS_COUNT,
  "/admin/stock": STOCK_COUNT,
  "/staff/stock": STOCK_COUNT,
};

export function useMenuCounts(enabled: boolean) {
  return useQuery({
    queryKey: ["staff", "menu-counts"],
    queryFn: () => api.get<Resource<MenuCounts>>("/staff/dashboard/counts").then((r) => r.data),
    enabled,
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
  });
}

/** "99+" above 99. */
export const badgeText = (n: number) => (n > 99 ? "99+" : String(n));
