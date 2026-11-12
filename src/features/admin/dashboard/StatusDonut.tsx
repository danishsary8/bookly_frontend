import { useState } from "react";
import { useReducedMotion } from "motion/react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { OrderStatus } from "@/api/types";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

/*
 * Orders placed by status as a donut with the total in the middle (owner's sample). The legend beside it is the full
 * text alternative (badge + count + share), so colour is never the only signal and screen readers read the list.
 */

const COLOURS: Record<string, string> = {
  pending: "var(--warning)",
  paid: "var(--chart-2)",
  processing: "var(--chart-5)", // slate: chart-3 was a green too close to "delivered"
  shipped: "var(--primary)",
  delivered: "var(--success)",
  cancelled: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)", // light grey, apart from processing
  returned: "var(--destructive)",
};

export function StatusDonut({ counts }: { counts: Record<string, number> }) {
  // Only real counts: an API answer damaged by a cache bug (fixed 2026-11-01) must never print as text here.
  const rows = Object.entries(counts ?? {})
    .filter(([status, n]) => /^[a-z_]+$/.test(status) && typeof n === "number" && Number.isFinite(n))
    .map(([status, n]) => ({ status, n }));
  const total = rows.reduce((s, r) => s + r.n, 0);
  const shown = rows.filter((r) => r.n > 0);
  const [active, setActive] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const current = rows.find((r) => r.status === active);
  const name = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <div className="grid items-center gap-6 sm:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[12rem_minmax(0,1fr)]">
      <div className="relative mx-auto size-48" aria-hidden="true" onMouseLeave={() => setActive(null)}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Nothing in this aria-hidden picture may take focus (axe aria-hidden-focus): Recharts makes the chart and the
              pie focusable by default. The list beside it is the accessible version. */}
          <PieChart accessibilityLayer={false}>
            <Pie
              rootTabIndex={-1}
              data={shown.length ? shown : [{ status: "none", n: 1 }]}
              dataKey="n"
              nameKey="status"
              innerRadius="72%" cornerRadius={6}
              outerRadius="100%"
              paddingAngle={shown.length > 1 ? 2 : 0}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={!reducedMotion}
              animationDuration={700}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActive((shown.length ? shown : [])[index]?.status ?? null)}
            >
              {(shown.length ? shown : [{ status: "none", n: 1 }]).map((r) => (
                <Cell key={r.status} fill={COLOURS[r.status] ?? "var(--border)"} className="cursor-pointer transition-opacity duration-200" opacity={active && active !== r.status ? 0.28 : 1} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="text-[2rem] font-semibold leading-none tabular-nums">{current ? current.n : total}</span>
          <span className="mt-1 text-xs font-semibold text-muted-foreground">{current ? `${name(current.status)} · ${total ? Math.round((current.n / total) * 100) : 0}%` : "orders"}</span>
        </div>
      </div>
      <ul className="grid gap-2" aria-label={`Orders placed by status, ${total} in total`}>
        {rows.map((r) => (
          <li key={r.status} onMouseEnter={() => setActive(r.n > 0 ? r.status : null)} onMouseLeave={() => setActive(null)} className={`-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-0.5 text-[15px] tabular-nums transition-[background-color,opacity] duration-200 ${active === r.status ? "bg-secondary" : active ? "opacity-50" : ""}`}>
            <span className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLOURS[r.status] ?? "var(--border)" }} aria-hidden="true" />
              <OrderStatusBadge status={r.status as OrderStatus} />
            </span>
            <span>
              <span className="font-semibold">{r.n}</span>
              <span className="ml-2 inline-block w-12 text-right text-sm text-muted-foreground">{total ? `${Math.round((r.n / total) * 100)}%` : "–"}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
