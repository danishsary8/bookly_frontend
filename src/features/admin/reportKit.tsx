import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { DashboardPeriod, DashboardRange } from "@/api/endpoints/staff";
import { Button } from "@/components/ui/button";
import { rangeProblem, shopToday } from "@/features/admin/dashboardRange";
import { cn } from "@/lib/utils";
import { formatKhr } from "@/stores/currency";

/*
 * Pieces shared by the dashboard and the reports: the period picker and custom days, figure tiles with the
 * change against the previous period, and titled panels.
 */

const PERIODS: Array<{ value: DashboardPeriod | "custom"; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "custom", label: "Custom" },
];

/** "≈ 207,050 ៛" under a USD amount; nothing until the shop has set a USD→KHR rate. */
export function Khr({ value, className }: { value?: string | null; className?: string }) {
  return value == null ? null : <span className={cn("block text-sm text-muted-foreground tabular-nums", className)}>≈ {formatKhr(value)}</span>;
}

/**
 * Change against the previous period of the same length. Up is green and down is red, except where more is worse
 * (refunds). The API reports "nothing before, something now" as 100%, which reads better as "New".
 */
export function Change({ percent, previous, versus, moreIsBetter = true }: { percent?: number; previous?: number; versus: string; moreIsBetter?: boolean }) {
  if (percent === undefined || previous === undefined) return null;
  if (previous === 0 && percent !== 0) {
    return (
      <span className="text-sm font-semibold text-muted-foreground">
        New <span className="font-normal">{versus}</span>
      </span>
    );
  }
  if (percent === 0) {
    return <span className="text-sm text-muted-foreground">No change {versus}</span>;
  }
  const up = percent > 0;
  const good = up === moreIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  const amount = `${Math.abs(percent).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1 text-sm tabular-nums">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", good ? "text-success" : "text-destructive")}>
        <Icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{up ? "up" : "down"} </span>
        {amount}
      </span>{" "}
      <span className="text-muted-foreground">{versus}</span>
    </span>
  );
}

export function Tile({ label, value, khr, detail, change }: { label: string; value: string | number; khr?: string | null; detail?: string; change?: ReactNode }) {
  return (
    <div className="grid content-start gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-[1.75rem] font-semibold leading-tight tabular-nums">{value}</p>
      <Khr value={khr} />
      {detail ? <p className="text-sm text-muted-foreground">{detail}</p> : null}
      {change}
    </div>
  );
}

export function Panel({ id, title, action, children, className }: { id: string; title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={id} className={cn("grid content-start gap-4 rounded-xl border border-border bg-card p-5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={id} className="font-sans text-[1.0625rem] font-semibold tracking-normal">
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
        <input type="date" value={from} max={to || today} onChange={(e) => setFrom(e.target.value)} className={field} aria-invalid={!!error} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        To
        <input type="date" value={to} min={from || undefined} max={today} onChange={(e) => setTo(e.target.value)} className={field} aria-invalid={!!error} />
      </label>
      <Button type="submit" variant="outline">
        Apply
      </Button>
      {error ? (
        <p role="alert" className="basis-full text-sm font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}


/** Today / 7 days / 30 days / Custom as one radio group. */
export function PeriodPicker({ active, onPick }: { active: DashboardPeriod | "custom"; onPick: (value: DashboardPeriod | "custom") => void }) {
  return (
    <div role="radiogroup" aria-label="Period" className="inline-flex rounded-md border border-border bg-card p-1">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          type="button"
          role="radio"
          aria-checked={active === p.value}
          onClick={() => onPick(p.value)}
          className={cn(
            "min-h-9 rounded-[4px] px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
            active === p.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
