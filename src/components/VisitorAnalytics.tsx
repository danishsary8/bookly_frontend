import { lazy, Suspense } from "react";
import type { BeforeSendEvent } from "@vercel/analytics/react";

/*
 * Visitor statistics with Vercel Web Analytics (owner's choice 2026-11-04): pages viewed, countries, devices.
 * No cookies and no personal data: the script and its reports stay on our own address (/_vercel/insights), so the
 * Content-Security-Policy needs no change. Only on builds made by Vercel (local copies and tests load nothing).
 *
 * Before anything is sent:
 * - the part after "?" is removed (some links carry an email or a code, e.g. sign-up and password reset);
 * - staff pages (/admin) are not counted, so the numbers are about shoppers only.
 */

const Analytics = lazy(() => import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })));

export function cleanEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return null;
  url.search = "";
  url.hash = "";
  return { ...event, url: url.toString() };
}

export function VisitorAnalytics() {
  if (!import.meta.env.VITE_ON_VERCEL) return null;
  return (
    <Suspense fallback={null}>
      <Analytics beforeSend={cleanEvent} />
    </Suspense>
  );
}
