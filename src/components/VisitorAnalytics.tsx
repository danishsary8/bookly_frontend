import { lazy, Suspense } from "react";
import { cleanEvent } from "@/lib/analyticsEvent";

/*
 * Visitor statistics with Vercel Web Analytics (owner's choice 2026-11-04): pages viewed, countries, devices.
 * No cookies and no personal data: the script and its reports stay on our own address (/_vercel/insights), so the
 * Content-Security-Policy needs no change. Only on builds made by Vercel (local copies and tests load nothing).
 *
 * Before anything is sent, `cleanEvent` drops the query string and staff pages (src/lib/analyticsEvent.ts).
 */

const Analytics = lazy(() => import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })));

export function VisitorAnalytics() {
  if (!import.meta.env.VITE_ON_VERCEL) return null;
  return (
    <Suspense fallback={null}>
      <Analytics beforeSend={cleanEvent} />
    </Suspense>
  );
}
