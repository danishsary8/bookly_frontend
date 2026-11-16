import type { ReactNode } from "react";
import type { ReportGroup } from "@/api/endpoints/reports";
import { GROUPS } from "./reportData";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* Pieces every report tab uses: loading and error states, the empty line and the day / week / month switch. */

function Loading() {
  return (
    <SkeletonGroup label="Loading report…" className="grid gap-4">
      <div className="dash-kpi-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-52 rounded-[20px]" />
        <Skeleton className="h-52 rounded-[20px]" />
        <Skeleton className="h-52 rounded-[20px]" />
        <Skeleton className="h-52 rounded-[20px]" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </SkeletonGroup>
  );
}

export function State({ query, children }: { query: { isError: boolean; error: unknown; data: unknown; refetch: () => unknown; isPlaceholderData: boolean }; children: () => ReactNode }) {
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />;
  if (!query.data) return <Loading />;
  return <div className={cn("grid gap-6", query.isPlaceholderData && "opacity-60 transition-opacity")}>{children()}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-muted-foreground">{children}</p>;
}

/** Day / week / month for a chart, in the panel's tone. */
export function GroupPicker({ value, onChange, labels }: { value: ReportGroup; onChange: (value: ReportGroup) => void; labels?: Record<ReportGroup, string> }) {
  return (
    <div role="radiogroup" aria-label="Group by" className="inline-flex rounded-lg border border-border bg-surface-2 p-1">
      {GROUPS.map((g) => (
        <button
          key={g.value}
          type="button"
          role="radio"
          aria-checked={value === g.value}
          onClick={() => onChange(g.value)}
          className={cn("min-h-9 rounded-[6px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", value === g.value ? "bg-card text-[var(--tone-ink)] shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {labels?.[g.value] ?? g.label}
        </button>
      ))}
    </div>
  );
}
