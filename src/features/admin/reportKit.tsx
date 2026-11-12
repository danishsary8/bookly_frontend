import { useId, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { DashboardPeriod, DashboardRange } from "@/api/endpoints/staff";
import { Button } from "@/components/ui/button";
import { rangeProblem, shopToday } from "@/features/admin/dashboardRange";
import { cn } from "@/lib/utils";
import { formatKhr } from "@/stores/currency";
import { Segmented } from "./listKit";
import { useT } from "@/i18n";

/*
 * Pieces shared by the dashboard and the reports: the period picker and custom days, figure tiles with the
 * change against the previous period, and titled panels.
 */

/** "≈ 207,050 ៛" under a USD amount; nothing until the shop has set a USD→KHR rate. */
export function Khr({ value, className }: { value?: string | null; className?: string }) {
  return value == null ? null : <span className={cn("block text-sm text-muted-foreground tabular-nums", className)}>≈ {formatKhr(value)}</span>;
}

/**
 * Change against the previous period of the same length. Up is green and down is red, except where more is worse
 * (refunds). The API reports "nothing before, something now" as 100%, which reads better as "New".
 */
export function Change({ percent, previous, versus, moreIsBetter = true, onDark = false }: { percent?: number; previous?: number; versus: string; moreIsBetter?: boolean; onDark?: boolean }) {
  if (percent === undefined || previous === undefined) return null;
  if (previous === 0 && percent !== 0) {
    return (
      <span className={cn("text-sm font-semibold", onDark ? "text-white" : "text-muted-foreground")}>
        New <span className="font-normal">{versus}</span>
      </span>
    );
  }
  if (percent === 0) {
    return <span className={cn("text-sm", onDark ? "admin-hero-muted" : "text-muted-foreground")}>No change {versus}</span>;
  }
  const up = percent > 0;
  const good = up === moreIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const amount = `${Math.abs(percent).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-sm tabular-nums">
      <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-semibold", onDark ? (good ? "bg-[#7EDDB0]/20 text-[#B7F5D6]" : "bg-[#FF9FB6]/20 text-[#FFD1DC]") : good ? "bg-success-tint text-success" : "bg-destructive-tint text-destructive")}>
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{up ? "up" : "down"} </span>
        {amount}
      </span>{" "}
      <span className={onDark ? "admin-hero-muted" : "text-muted-foreground"}>{versus}</span>
    </span>
  );
}

export function Tile({ label, value, khr, detail, change }: { label: string; value: string | number; khr?: string | null; detail?: string; change?: ReactNode }) {
  return (
    <div className="admin-metric grid content-start gap-2 desk-card rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-[1.75rem] font-semibold leading-tight tabular-nums">{value}</p>
      <Khr value={khr} />
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      {change}
    </div>
  );
}

/** Summarises only the loaded rows, so filters and pagination keep an honest scope. */
export function ResultSummary({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <section aria-label="Results on this page" className="grid gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Results on this page</p>
      <dl className="grid gap-3 sm:grid-cols-3">
        {items.map(({ label, value }) => <div key={label} className="admin-metric desk-card grid gap-2 rounded-xl border border-border bg-card p-4"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="text-2xl font-semibold tabular-nums">{value}</dd></div>)}
      </dl>
    </section>
  );
}

export function Panel({ id, title, action, children, className, icon: Icon, tone }: { id: string; title: string; action?: ReactNode; children: ReactNode; className?: string; icon?: ComponentType<{ className?: string }>; tone?: string }) {
  return (
    <section aria-labelledby={id} data-tone={tone} className={cn("admin-panel grid grid-cols-1 content-start gap-4 desk-card rounded-xl border border-border bg-card p-5", className)}>
      <div className="admin-panel-header flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-4">
        <h2 id={id} className="flex items-center gap-2.5 font-sans text-[1.0625rem] font-semibold tracking-normal">
          {Icon ? <span aria-hidden="true" className="admin-kpi-icon !size-8 !rounded-[10px]"><Icon className="size-4" /></span> : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Phnom Penh days From–To; Apply puts them in the URL (at most 366 days, the API's limit). */
export function CustomRange({ range, shown, onApply }: { range: DashboardRange; shown?: { from: string; to: string }; onApply: (from: string, to: string) => void }) {
  const errorId = useId();
  const today = shopToday();
  // Start from the days on screen, so "Custom" then Apply changes nothing until a day is changed.
  const [from, setFrom] = useState(range.period === "custom" ? range.from : (shown?.from ?? ""));
  const [to, setTo] = useState(range.period === "custom" ? range.to : (shown?.to ?? today));
  const [error, setError] = useState<string | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = rangeProblem(from, to);
    setError(problem);
    if (!problem) onApply(from, to);
  };
  const field = "h-11 rounded-md border border-input bg-card px-3 text-base font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <form onSubmit={submit} noValidate aria-label="Custom period" className="flex flex-wrap items-end gap-2">
      <label className="grid gap-1 text-sm font-semibold">
        From
        <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className={field} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        To
        <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} className={field} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} />
      </label>
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {error ? (
        <p id={errorId} role="alert" className="basis-full text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}


/** Today / 7 days / 30 days / Custom as one radio group. */
export function PeriodPicker({ active, onPick }: { active: DashboardPeriod | "custom"; onPick: (value: DashboardPeriod | "custom") => void }) {
  const { dict } = useT();
  const periods: Array<{ value: DashboardPeriod | "custom"; label: string }> = [
    { value: "today", label: "Today" },
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: dict.dashboardPeriods.ninetyDays },
    { value: "12m", label: dict.dashboardPeriods.twelveMonths },
    { value: "custom", label: "Custom" },
  ];
  return <Segmented label="Period" value={active} options={periods} onChange={onPick} />;
}
