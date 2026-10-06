import { useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * Building blocks for the admin list screens (pages/admin.md): a search box and
 * segmented filters that write to the URL, a table card that scrolls inside
 * itself on phones, and one loading / error / empty switch.
 */

export function SearchBox({ label, value, onSearch, placeholder, className }: { label: string; value: string; onSearch: (q: string) => void; placeholder?: string; className?: string }) {
  const [draft, setDraft] = useState(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(draft.trim());
  };
  return (
    <form onSubmit={submit} role="search" className={cn("relative min-w-0 flex-1 basis-64", className)}>
      <label className="sr-only" htmlFor={`search-${label}`}>
        {label}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={`search-${label}`}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-md border border-border bg-card p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-9 shrink-0 whitespace-nowrap rounded-[4px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Underline tabs (MASTER §6.16 look) that split one list into views, as links so each view has its own
 * address. The active tab is `aria-current="page"`; counts are optional (shown once loaded).
 */
export function ListTabs<T extends string>({
  label,
  value,
  tabs,
  hrefFor,
}: {
  label: string;
  value: T;
  tabs: Array<{ value: T; label: string; count?: number }>;
  hrefFor: (value: T) => string;
}) {
  return (
    <nav aria-label={label} className="no-scrollbar flex gap-6 overflow-x-auto border-b border-border">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Link
            key={tab.value}
            to={hrefFor(tab.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-md text-[15px] font-semibold outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count === undefined ? null : (
              <span
                className={cn(
                  "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums",
                  active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            )}
            {active ? <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function TableCard({ children, stale, minWidth = 720 }: { children: ReactNode; stale?: boolean; minWidth?: number }) {
  return (
    <div className={cn("relative overflow-x-auto rounded-xl border border-border bg-card", stale && "opacity-60 transition-opacity")}>
      <table className="w-full text-left text-[15px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "px-4 py-3 font-semibold";
export const thead = "border-b border-border bg-surface-2 text-sm text-muted-foreground";
export const td = "px-4 py-3";

/** Error, skeleton or empty state for a list, or the list itself. */
export function ListState({
  query,
  empty,
  children,
}: {
  query: { isError: boolean; isPending: boolean; error: unknown; data: unknown; refetch: () => unknown };
  empty: { when: boolean; icon: ComponentType<{ className?: string }>; title: string; description: string };
  children: ReactNode;
}) {
  if (query.isError && !query.data) return <ErrorState error={query.error} onRetry={() => void query.refetch()} headingLevel="h2" showHomeLink={false} />;
  if (query.isPending)
    return (
      <SkeletonGroup label="Loading…" className="grid gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-md" />
        ))}
      </SkeletonGroup>
    );
  if (empty.when) return <EmptyState icon={empty.icon} title={empty.title} description={empty.description} className="rounded-xl border border-dashed border-border" />;
  return <>{children}</>;
}
