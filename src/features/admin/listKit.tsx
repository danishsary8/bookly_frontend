import { useEffect, useId, useRef, useState, type ComponentType, type FormEvent, type ReactNode } from "react";
import { ChevronDown, LoaderCircle, Search, X } from "lucide-react";
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

/**
 * Search that updates the list as you type (350ms after the last key), plus Enter for at once. The URL stays the
 * source of truth: a value changed elsewhere (back button, a "Clear" link) flows back into the box.
 */
export function SearchBox({ label, value, onSearch, placeholder, className, busy }: { label: string; value: string; onSearch: (q: string) => void; placeholder?: string; className?: string; busy?: boolean }) {
  const inputId = useId();
  const [draft, setDraft] = useState(value);
  const last = useRef(value);
  // The latest callback, so a parent re-render never restarts the typing timer.
  const searchRef = useRef(onSearch);
  useEffect(() => {
    searchRef.current = onSearch;
  });
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setDraft(value);
    }
  }, [value]);
  useEffect(() => {
    const next = draft.trim();
    if (next === last.current) return;
    const timer = window.setTimeout(() => {
      last.current = next;
      searchRef.current(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    last.current = draft.trim();
    onSearch(draft.trim());
  };
  return (
    <form onSubmit={submit} role="search" aria-label={label} className={cn("relative min-w-0 flex-1 basis-64", className)}>
      <label className="sr-only" htmlFor={inputId}>
        {label}
      </label>
      {busy ? (
        <LoaderCircle className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      )}
      <input
        id={inputId}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="admin-search h-11 w-full rounded-md border border-input bg-card pl-10 pr-11 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => {
            setDraft("");
            last.current = "";
            onSearch("");
          }}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}

/** A compact labelled dropdown for list filters; the label stays visible above the value. */
type FilterOption = { value: string; label: string; indent?: boolean };

/** Indented options belong to the plain option before them (a parent category and its sub-categories). */
function groupOptions(options: FilterOption[]) {
  const groups: Array<{ option: FilterOption; children: FilterOption[] }> = [];
  for (const o of options) {
    if (o.indent && groups.length) groups[groups.length - 1].children.push(o);
    else groups.push({ option: o, children: [] });
  }
  return groups;
}

export function FilterSelect({ label, value, onChange, options, className }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string; indent?: boolean }>; className?: string }) {
  const id = useId();
  const active = value !== "";
  return (
    <label htmlFor={id} className={cn("admin-filter relative grid min-w-0 cursor-pointer rounded-md border bg-card px-3 pb-1.5 pt-1 transition-colors", active ? "border-primary/60 bg-lapis-tint/40" : "border-input hover:border-primary/50", className)}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-6 text-[15px] font-semibold text-foreground outline-none">
        {groupOptions(options).map((g) =>
          g.children.length ? (
            // A parent with sub-options: a bold group heading, then "All <parent>" (the parent itself) and its children.
            <optgroup key={g.option.value} label={g.option.label}>
              <option value={g.option.value}>All {g.option.label.toLowerCase()}</option>
              {g.children.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ) : (
            <option key={g.option.value} value={g.option.value}>
              {g.option.label}
            </option>
          ),
        )}
      </select>
      <ChevronDown className="pointer-events-none absolute bottom-2.5 right-2.5 size-4 text-muted-foreground" aria-hidden="true" />
    </label>
  );
}

/** Marks the searched words inside a title so a match is easy to spot. */
export function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[3px] bg-gold/35 px-0.5 text-inherit">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="admin-segmented inline-flex max-w-full overflow-x-auto rounded-lg border border-border bg-surface-2/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          tabIndex={value === opt.value ? 0 : -1}
          onKeyDown={(event) => {
            const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
            if (!direction && event.key !== "Home" && event.key !== "End") return;
            event.preventDefault();
            const current = options.findIndex((option) => option.value === opt.value);
            const index = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (current + direction + options.length) % options.length;
            onChange(options[index].value);
            event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
          }}
          onClick={() => onChange(opt.value)}
          className={cn(
            "min-h-11 shrink-0 whitespace-nowrap rounded-[4px] px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value ? "bg-card text-primary shadow-xs" : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
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

/**
 * A table in a card. Laptops: a normal table that scrolls sideways if it must. Phones (the card under 640px wide):
 * every row becomes a card (admin.css `.admin-table`): the first cell on top, each other cell under a small label
 * taken from its column heading, the action cell across the bottom. Pass `label` when the table has no link or
 * button inside: keyboard users can then focus the card to scroll it (WCAG 2.1.1, axe "scrollable-region-focusable").
 */
export function TableCard({ children, stale, minWidth = 720, label }: { children: ReactNode; stale?: boolean; minWidth?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Copy each column heading onto its cells (data-label), so the phone card layout can name every value.
  useEffect(() => {
    const table = ref.current?.querySelector("table");
    if (!table) return;
    const label = () => {
      const heads = [...table.querySelectorAll<HTMLElement>("thead tr:last-child > th")].map((th) => (th.querySelector("input, [role=\"checkbox\"]") ? "" : (th.textContent ?? "").trim()));
      table.querySelectorAll<HTMLTableRowElement>("tbody > tr").forEach((row) => {
        let col = 0;
        for (const cell of row.cells) {
          const text = heads[col] ?? "";
          if (!cell.hasAttribute("data-label") || cell.dataset.autoLabel === "1") {
            if (text) {
              cell.setAttribute("data-label", text);
              cell.dataset.autoLabel = "1";
            } else if (cell.dataset.autoLabel === "1") cell.removeAttribute("data-label");
          }
          col += cell.colSpan || 1;
        }
      });
    };
    label();
    const observer = new MutationObserver(label);
    observer.observe(table, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("admin-table relative overflow-x-auto desk-card rounded-xl border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background", stale && "opacity-60 transition-opacity")}
      {...(label ? { role: "region", "aria-label": label, tabIndex: 0 } : {})}
    >
      <table className="w-full text-left text-[15px]" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "px-5 py-3.5 font-semibold whitespace-nowrap";
export const thead = "sticky top-0 border-b border-border bg-surface-1 text-xs uppercase tracking-[0.08em] text-muted-foreground";
export const td = "px-5 py-4 align-middle";

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
