import { useQuery } from "@tanstack/react-query";
import type { BookFilters } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { AGE_BANDS, customSort, sortLabel, withFilter } from "@/lib/catalog";
import { formatUsd } from "@/stores/currency";
import { formatName, useT } from "@/i18n";

/*
 * The filters in effect as removable chips, named in the shop's language (ids are shown by name from cached lookups).
 * Used by the chip row above the grid and by the no-results state ("try removing"). Locked filters (the page's own
 * category, author, …) are never offered for removal.
 */
export type FilterChip = { key: string; label: string; remove: () => void; sort?: boolean };

export function useFilterChips(filters: BookFilters, onChange: (next: BookFilters) => void, locked: Partial<BookFilters> = {}): FilterChip[] {
  const categories = useQuery(catalogQueries.categories());
  const publishers = useQuery(catalogQueries.publishers({ per_page: 100 }));
  const author = useQuery({ ...catalogQueries.author(filters.author_id ?? 0), enabled: filters.author_id !== undefined && locked.author_id === undefined });
  const series = useQuery({ ...catalogQueries.series(filters.series_id ?? 0), enabled: filters.series_id !== undefined && locked.series_id === undefined });
  const { dict } = useT();
  const t = dict.browse;

  const chips: FilterChip[] = [];
  const add = (key: keyof BookFilters, label: string, remove = () => onChange(withFilter(filters, key, undefined))) => {
    if (filters[key] !== undefined && locked[key] === undefined) chips.push({ key, label, remove });
  };
  add("category_id", categories.data?.find((c) => c.id === filters.category_id)?.name ?? t.category);
  add("author_id", author.data?.name ? t.byAuthor(author.data.name) : t.author);
  add("series_id", series.data?.name ? t.seriesName(series.data.name) : t.series);
  add("publisher_id", publishers.data?.data.find((p) => p.id === filters.publisher_id)?.name ?? t.publisher);
  add("format", formatName(dict, filters.format));
  add("language", t.languages[filters.language ?? ""] ?? filters.language ?? "");
  if (filters.min_price !== undefined && filters.max_price !== undefined) {
    add("min_price", `${formatUsd(filters.min_price)}–${formatUsd(filters.max_price)}`, () => onChange(withFilter(withFilter(filters, "min_price", undefined), "max_price", undefined)));
  } else {
    add("min_price", t.from(formatUsd(filters.min_price)));
    add("max_price", t.upTo(formatUsd(filters.max_price)));
  }
  add("in_stock", t.inStock);
  add("has_ebook", dict.catalogFilters.hasEbook);
  add("coming_soon", dict.shopExtras.rows.coming_soon);
  const band = AGE_BANDS.find((b) => b.age === filters.age);
  add("age", dict.catalogFilters.agePrefix(band ? dict.catalogFilters.ages[band.key] : String(filters.age)));
  add("school_grade", dict.catalogFilters.gradeN(filters.school_grade ?? 0));
  add("level", dict.catalogFilters.levelN(filters.level ?? ""));

  const sort = customSort(filters);
  if (sort) chips.push({ key: "sort", label: dict.catalogue.sortedBy(sortLabel(dict, sort)), remove: () => onChange(withFilter(filters, "sort", undefined)), sort: true });
  return chips;
}
