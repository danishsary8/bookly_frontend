import { ArrowRight, type LucideIcon } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Khr } from "@/features/admin/reportKit";
import { Sparkline } from "@/features/admin/dashboard/Sparkline";
import { cn } from "@/lib/utils";

/*
 * Dashboard building blocks shared with the reports (owner 2026-11-16: reports in the dashboard's style):
 * tinted KPI cards with a trend line, ranked tables with a bar per row, and section labels.
 */

export type DashTone = "coral" | "saffron" | "sky" | "sea";

/**
 * A KPI card in the sample's style: label and a round tinted icon, the figure gliding to new values, the change
 * against the period before, a smooth trend line in the card's colour and a "View …" link. A soft spotlight follows
 * the pointer and the card lifts on hover.
 */
export function Kpi({ id, label, value, khr, detail, change, comparisonId, trend, labels, format, view, icon: Icon, tone }: {
  id: string;
  label: string;
  value: ReactNode;
  khr?: string | null;
  detail?: string;
  change?: ReactNode;
  comparisonId?: string;
  trend?: number[];
  labels?: string[];
  format?: (n: number) => string;
  view?: { to: string; label: string };
  icon: LucideIcon;
  tone: DashTone;
}) {
  return (
    <section
      aria-labelledby={id}
      aria-describedby={comparisonId}
      data-tone={tone}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--spot-x", `${event.clientX - box.left}px`);
        event.currentTarget.style.setProperty("--spot-y", `${event.clientY - box.top}px`);
      }}
      className="dash-kpi desk-card flex h-full flex-col gap-2 overflow-hidden rounded-[20px] border border-border bg-card p-5"
    >
      <div className="dash-kpi-heading flex items-start justify-between gap-3">
        <h2 id={id} className="pt-1 font-sans text-sm font-semibold tracking-normal text-muted-foreground">{label}</h2>
        <span className="dash-kpi-icon shrink-0" aria-hidden="true"><Icon className="size-[18px]" /></span>
      </div>
      <div className="dash-kpi-amount">
        <p className="text-[2rem] font-semibold leading-none tracking-[-0.03em] tabular-nums">{value}</p>
        <Khr value={khr} />
      </div>
      <div className="dash-kpi-context">
        {change ? <div className="dash-kpi-change">{change}</div> : null}
        {detail ? <p className="text-sm text-muted-foreground tabular-nums">{detail}</p> : null}
      </div>
      {trend ? <Sparkline values={trend} labels={labels} format={format} name={`${label} trend`} color="var(--tone-fill)" fill={0.18} className="dash-kpi-trend mt-auto h-10" /> : null}
      {view ? (
        <Link to={view.to} className="dash-kpi-link group inline-flex items-center gap-1 pt-1 text-sm font-semibold underline-offset-4 hover:underline" style={{ color: "var(--tone-ink)" }}>
          {view.label} <ArrowRight className="admin-arrow size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </section>
  );
}

/** A ranked list with a bar per row (best sellers, top categories). The numbers are in the table cells. */
export function RankTable({ head, rows }: { head: [string, string, string]; rows: Array<{ key: number | string; name: ReactNode; copies: number; sales: string; khr?: string | null; bar?: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.bar ?? r.copies));
  return (
    <div className="dash-ranking-table" role="group" aria-label={`${head[0]} ranking`} tabIndex={0}>
    <table className="w-full text-left text-[15px] tabular-nums">
      <thead className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
        <tr>
          <th scope="col" className="pb-2 font-semibold">{head[0]}</th>
          <th scope="col" className="pb-2 pl-4 text-right font-semibold">{head[1]}</th>
          <th scope="col" className="pb-2 pl-4 text-right font-semibold">{head[2]}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.key} className="border-t border-border/70">
            <th scope="row" className="py-2.5 pr-3 font-normal">
              <span className="flex items-center gap-3">
                <span aria-hidden="true" className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", i === 0 ? "bg-gold text-[#0E1335]" : "admin-task-icon")}>{i + 1}</span>
                <span className="min-w-0 flex-1">
                  {r.name}
                  <span aria-hidden="true" className="mt-1.5 block h-1.5 rounded-full bg-secondary"><span className="admin-bar block h-full rounded-full" style={{ animationDelay: `${i * 70}ms`, width: `${(Math.max(0, r.bar ?? r.copies) / max) * 100}%`, background: "linear-gradient(90deg, color-mix(in oklab, var(--tone-ink) 55%, var(--card)), var(--tone-ink))" }} /></span>
                </span>
              </span>
            </th>
            <td className="py-2.5 pl-4 text-right">{r.copies}</td>
            <td className="whitespace-nowrap py-2.5 pl-4 text-right font-semibold">{r.sales}<Khr value={r.khr} className="font-normal" /></td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="dash-section-label flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"><span>{children}</span><span aria-hidden="true" className="h-px flex-1 bg-border" /></p>;
}


/**
 * A dashboard section that rises into place the first time it scrolls into view (owner 2026-11-16: motion when the
 * dashboard opens). Once only; reduced motion shows it at once.
 */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </m.div>
  );
}
