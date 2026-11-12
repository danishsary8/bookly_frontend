import type { BeforeSendEvent } from "@vercel/analytics/react";

/*
 * What Vercel Web Analytics may send (src/components/VisitorAnalytics.tsx):
 * - the part after "?" is removed (some links carry an email or a code, e.g. sign-up and password reset);
 * - staff pages (/admin) are not counted, so the numbers are about shoppers only.
 */
export function cleanEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return null;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}
