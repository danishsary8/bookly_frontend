import { useEffect, useSyncExternalStore } from "react";
import { useQueryClient, type Query, type QueryClient } from "@tanstack/react-query";

/*
 * Admin auto refresh (owner 2026-11-02, "Admin + customer orders"): the data on screen refreshes every 30 seconds and
 * when the staff member comes back to the tab, so new orders, payments and status changes show without the browser's
 * refresh button. Only queries on screen are fetched again (the rest are just marked old), the old data stays visible
 * until the new answer arrives, and a refresh is skipped while someone is typing, a dialog is open or a page has
 * unsaved changes (usePauseAutoRefresh).
 */

export const AUTO_REFRESH_MS = 30_000;

/** Admin data: everything under "staff" (plus the newsletter and lookup pages), not search boxes. */
export function isAdminData(query: Query): boolean {
  const key = query.queryKey;
  const parts = key.map((part) => (typeof part === "string" ? part : ""));
  if (parts.some((part) => part === "jump" || part.endsWith("search") || part === "customer-tags")) return false;
  return key[0] === "staff" || key[0] === "newsletter" || (key[0] === "catalog" && key[1] === "admin-lookup");
}

// A tiny store: when the data on screen was last refreshed, and how many pages ask to pause.
let lastUpdated = Date.now();
let pauses = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Someone is typing, a dialog is open, or a page said it has unsaved changes. */
function busy(): boolean {
  if (pauses > 0) return true;
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return true;
  const el = document.activeElement as HTMLElement | null;
  return Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));
}

export async function refreshAdminData(client: QueryClient, { force = false } = {}) {
  if (!force && busy()) return;
  await client.invalidateQueries({ predicate: isAdminData, refetchType: "active" });
  lastUpdated = Date.now();
  emit();
}

/** Mounted once in the admin shell. */
export function useAdminAutoRefresh(enabled: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState === "visible") void refreshAdminData(client);
    };
    const timer = window.setInterval(tick, AUTO_REFRESH_MS);
    // Back to the tab after a while: refresh at once.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastUpdated > 10_000) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [client, enabled]);
}

/** A page with unsaved changes (e.g. the book form) pauses the auto refresh while `active`. */
export function usePauseAutoRefresh(active: boolean) {
  useEffect(() => {
    if (!active) return;
    pauses += 1;
    return () => {
      pauses -= 1;
    };
  }, [active]);
}

export function useLastAdminRefresh(): number {
  return useSyncExternalStore(subscribe, () => lastUpdated);
}

/** Test helper. */
export function resetAutoRefreshForTests() {
  lastUpdated = Date.now();
  pauses = 0;
  emit();
}
