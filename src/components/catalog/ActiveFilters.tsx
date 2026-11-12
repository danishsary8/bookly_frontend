import { ArrowDownUp, X } from "lucide-react";
import type { BookFilters } from "@/api/endpoints/catalog";
import { clearFilters } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { useFilterChips } from "./filterChips";

/*
 * Removable chips for the filters in effect (pages/catalogue-v2.md §3). Ids are shown by name (category, publisher,
 * author, series), read from cached lookups. A sort the visitor chose (e.g. "Best selling" from a home "See all")
 * is a chip too, so they can see why the order looks the way it does. The chips come from `useFilterChips`, which
 * the no-results state shares.
 */

type Props = { filters: BookFilters; onChange: (next: BookFilters) => void; locked?: Partial<BookFilters> };

export function ActiveFilters({ filters, onChange, locked = {} }: Props) {
  const { dict } = useT();
  const t = dict.browse;
  const chips = useFilterChips(filters, onChange, locked);
  if (chips.length === 0) return null;
  const filterChips = chips.filter((c) => !c.sort);

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t.activeFilters} role="group">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border pl-3.5 pr-2.5 text-sm font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
            chip.sort ? "border-dashed border-input bg-transparent hover:bg-secondary" : "border-primary/25 bg-lapis-tint text-primary hover:border-primary/50",
          )}
          aria-label={t.removeFilter(chip.label)}
        >
          {chip.sort ? <ArrowDownUp className="size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
          {chip.label}
          <X className="size-4 opacity-70" aria-hidden="true" />
        </button>
      ))}
      {filterChips.length > 1 ? (
        <button
          type="button"
          onClick={() => onChange({ ...clearFilters(filters), ...locked })}
          className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t.clearAll}
        </button>
      ) : null}
    </div>
  );
}
