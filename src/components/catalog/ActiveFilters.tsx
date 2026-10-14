import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { FILTER_KEYS, clearFilters, withFilter } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";
import { formatName, useT } from "@/i18n";

/*
 * Removable chips for the filters in effect, plus "Clear all". Ids are shown by
 * name (category, publisher, author, series), read from cached lookups.
 */

type Props = { filters: BookFilters; onChange: (next: BookFilters) => void; locked?: Partial<BookFilters> };

export function ActiveFilters({ filters, onChange, locked = {} }: Props) {
  const categories = useQuery(catalogQueries.categories());
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const author = useQuery({ ...catalogQueries.author(filters.author_id ?? 0), enabled: filters.author_id !== undefined });
  const series = useQuery({ ...catalogQueries.series(filters.series_id ?? 0), enabled: filters.series_id !== undefined });
  const { dict } = useT();
  const t = dict.browse;

  const chips: { key: (typeof FILTER_KEYS)[number]; label: string }[] = [];
  const add = (key: (typeof FILTER_KEYS)[number], label: string) => {
    if (filters[key] !== undefined && locked[key] === undefined) chips.push({ key, label });
  };
  add("category_id", categories.data?.find((c) => c.id === filters.category_id)?.name ?? t.category);
  add("author_id", author.data?.name ? t.byAuthor(author.data.name) : t.author);
  add("series_id", series.data?.name ? t.seriesName(series.data.name) : t.series);
  add("publisher_id", publishers.data?.data.find((p) => p.id === filters.publisher_id)?.name ?? t.publisher);
  add("format", formatName(dict, filters.format));
  add("language", filters.language ?? "");
  if (filters.min_price !== undefined && filters.max_price !== undefined) {
    chips.push({ key: "min_price", label: `${formatUsd(filters.min_price)}–${formatUsd(filters.max_price)}` });
  } else {
    add("min_price", t.from(formatUsd(filters.min_price)));
    add("max_price", t.upTo(formatUsd(filters.max_price)));
  }
  add("in_stock", t.inStock);

  if (chips.length === 0) return null;

  const remove = (key: (typeof FILTER_KEYS)[number]) => {
    let next = withFilter(filters, key, undefined);
    if (key === "min_price" && filters.max_price !== undefined && filters.min_price !== undefined) next = withFilter(next, "max_price", undefined);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t.activeFilters} role="group">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={() => remove(chip.key)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card pl-3 pr-2 text-sm font-medium transition-colors duration-150 hover:border-input hover:bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={t.removeFilter(chip.label)}
        >
          {chip.label}
          <X className="size-4 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange({ ...clearFilters(filters), ...locked })}
        className="inline-flex h-9 items-center rounded-md px-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        {t.clearAll}
      </button>
    </div>
  );
}
