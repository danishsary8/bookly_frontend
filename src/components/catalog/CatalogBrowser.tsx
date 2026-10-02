import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { BookFilters, BookSort } from "@/api/endpoints/catalog";
import { catalogQueries } from "@/api/endpoints/catalog";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { PER_PAGE, SORTS, activeFilterCount, clearFilters, effectiveSort, parseBookFilters, toSearchParams, withFilter } from "@/lib/catalog";
import { rangeSummary } from "@/lib/pagination";
import { ActiveFilters } from "./ActiveFilters";
import { BookGrid } from "./BookGrid";
import { CatalogFilters } from "./CatalogFilters";

/*
 * The catalogue body shared by /books, /search, category and publisher pages:
 * filters (sidebar ≥ 1024px, drawer below), active-filter chips, result count,
 * sort, the grid and pagination. Everything reads from and writes to the URL;
 * `locked` filters come from the page (e.g. the category being viewed).
 */

type Props = {
  locked?: Partial<BookFilters>;
  /** Noun for the result count ("books", "results"). */
  noun?: string;
  /** Replaces the default "no results" state. */
  empty?: ReactNode;
};

export function CatalogBrowser({ locked = {}, noun = "books", empty }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const urlFilters = parseBookFilters(searchParams);
  const filters: BookFilters = { ...urlFilters, ...locked };
  const query = useQuery(catalogQueries.books({ ...filters, per_page: PER_PAGE }));
  const showSkeleton = useSkeletonVisible(query.isPending);

  const apply = (next: BookFilters) => {
    const own = { ...next };
    for (const key of Object.keys(locked) as (keyof BookFilters)[]) delete own[key];
    setSearchParams(toSearchParams(own));
  };

  const sort = effectiveSort(filters);
  const sorts = SORTS.filter((s) => s.value !== "relevance" || filters.q);
  const count = activeFilterCount(urlFilters);
  const meta = query.data?.meta;
  const lastPage = meta?.last_page ?? 1;
  const hrefFor = (page: number) => `?${toSearchParams(withFilter(urlFilters, "page", page)).toString()}`;

  // A page number past the end (an old link, or fewer results now) → show the last page instead.
  const pageTooFar = Boolean(meta && urlFilters.page && urlFilters.page > lastPage);
  useEffect(() => {
    if (!pageTooFar) return;
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        if (lastPage > 1) next.set("page", String(lastPage));
        else next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [pageTooFar, lastPage, setSearchParams]);

  const filterPanel = (prefix: string) => <CatalogFilters filters={filters} onChange={apply} locked={locked} idPrefix={prefix} />;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100dvh-var(--header-h)-3rem)] overflow-y-auto pb-6 pr-2">
          <h2 className="mb-5 font-display text-xl">Filter</h2>
          {filterPanel("side")}
        </div>
      </aside>

      <div className="grid min-w-0 content-start gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-muted-foreground" role="status" aria-live="polite">
            {meta ? rangeSummary(meta.from, meta.to, meta.total ?? 0, noun) : " "}
          </p>
          <div className="flex items-center gap-2">
            <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <SlidersHorizontal aria-hidden="true" /> Filters
                  {count > 0 ? (
                    <Badge tone="info" shape="solid" className="ml-0.5 h-5 px-1.5 tracking-normal">
                      {count}
                    </Badge>
                  ) : null}
                </Button>
              </DrawerTrigger>
              <DrawerContent side="bottom" aria-describedby={undefined}>
                <DrawerHeader>
                  <DrawerTitle>Filters</DrawerTitle>
                </DrawerHeader>
                <DrawerBody>{filterPanel("sheet")}</DrawerBody>
                <DrawerFooter className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={() => apply({ ...clearFilters(filters), ...locked })} disabled={count === 0}>
                    Clear all
                  </Button>
                  <Button onClick={() => setFiltersOpen(false)}>
                    {meta ? `Show ${meta.total ?? 0} ${noun}` : "Show results"}
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
            <span id="sort-label" className="sr-only text-sm font-medium text-muted-foreground sm:not-sr-only">
              Sort by
            </span>
            <Select value={sort} onValueChange={(value) => apply(withFilter(filters, "sort", value as BookSort))}>
              <SelectTrigger aria-labelledby="sort-label" className="h-11 w-[12rem] text-[15px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {sorts.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ActiveFilters filters={filters} onChange={apply} locked={locked} />

        {query.isError && !query.data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <BookGrid
            books={query.data?.data ?? []}
            loading={query.isPending && showSkeleton}
            stale={query.isPlaceholderData}
            headingLevel="h2"
            empty={
              query.isPending ? null : (
                empty ?? (
                  <EmptyState
                    icon={SearchX}
                    title={filters.q ? `No books match "${filters.q}"` : "No books match these filters"}
                    description="Try a shorter title, an author's surname, or clear a filter."
                    action={
                      count > 0 ? (
                        <Button onClick={() => apply({ ...clearFilters(filters), ...locked })}>Clear filters</Button>
                      ) : undefined
                    }
                  />
                )
              )
            }
          />
        )}

        <Pagination page={meta?.current_page ?? 1} lastPage={lastPage} hrefFor={hrefFor} className="mt-4" />
      </div>
    </div>
  );
}
