import { useEffect, useState, type FormEvent } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type { BookFilters } from "@/api/endpoints/catalog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import { activeFilterCount, clearFilters, effectiveSort, isbnDigits, parseBookFilters, toSearchParams, withFilter } from "@/lib/catalog";
import { rangeText, useT } from "@/i18n";
import { ActiveFilters } from "./ActiveFilters";
import { useFilterChips } from "./filterChips";
import { BookGrid } from "./BookGrid";
import { useCatalogListing } from "./catalogListing";
import { CatalogFilters } from "./CatalogFilters";
import { CategoryChips } from "./CategoryChips";
import { NoResults } from "./NoResults";
import { QuickFacets } from "./QuickFacets";
import { SearchNotices } from "./SearchNotices";
import { SortSelect } from "./SortSelect";

/*
 * The catalogue body shared by /books, /search, category, author and publisher pages (pages/catalogue-v2.md §3):
 * filters on a sticky card (≥ 1024px) or in a bottom sheet (phones), then one toolbar row (filters button, live
 * result count, sort; sticky under the header on phones), category chips or grade/level chips, search notices,
 * removable filter chips, the grid and pagination. Everything reads from and writes to the URL, so Back, Forward
 * and shared links restore the same listing; `locked` filters come from the page (the category being viewed).
 */

type Props = {
  locked?: Partial<BookFilters>;
  /** Noun for the result count, from the dictionary (dict.nouns.book, dict.nouns.result). */
  noun?: (n: number) => string;
  /** The search-in-catalogue field (off on /search, which has its own). */
  searchBox?: boolean;
};

function SearchWithin({ filters, onApply, idPrefix }: { filters: BookFilters; onApply: (q: string | undefined) => void; idPrefix: string }) {
  const { dict } = useT();
  const [term, setTerm] = useState(filters.q ?? "");
  const [termFor, setTermFor] = useState(filters.q);
  // Back/Forward change the URL under the field: show the query of the page now on screen.
  if (termFor !== filters.q) {
    setTermFor(filters.q);
    setTerm(filters.q ?? "");
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onApply(term.trim() || undefined);
  };
  const id = `${idPrefix}-catalog-search`;
  return (
    <form role="search" aria-label={dict.browse.searchWithinLabel} onSubmit={submit} className="relative">
      <label htmlFor={id} className="sr-only">
        {dict.browse.searchWithinLabel}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={dict.browse.searchWithin}
        className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
      />
    </form>
  );
}

export function CatalogBrowser({ locked = {}, noun: nounFor, searchBox = true }: Props) {
  const { dict } = useT();
  const t = dict.browse;
  const noun = nounFor ?? dict.nouns.book;
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const urlFilters = parseBookFilters(searchParams);
  const filters: BookFilters = { ...urlFilters, ...locked };
  const query = useCatalogListing(locked);
  const showSkeleton = useSkeletonVisible(query.isPending);
  useScrollMemory(Boolean(query.data));

  const apply = (next: BookFilters) => {
    const own = { ...next };
    for (const key of Object.keys(locked) as (keyof BookFilters)[]) delete own[key];
    setSearchParams(toSearchParams(own));
  };
  const clearAll = () => apply({ ...clearFilters(filters), ...locked });
  const chips = useFilterChips(filters, apply, locked);

  const count = activeFilterCount(urlFilters);
  const meta = query.data?.meta;
  const total = meta?.total ?? 0;
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

  // Category chips lead the listing until a page locks the category; inside a category (or once one is chosen)
  // the grade and level chips take that place when the books have them (Education).
  const categoryChips = locked.category_id === undefined;
  const audienceChips = filters.category_id !== undefined;
  const facets = query.data?.facets;
  const panel = (prefix: string) => (
    <div className="grid gap-5">
      {searchBox ? <SearchWithin filters={filters} idPrefix={prefix} onApply={(q) => apply(withFilter(filters, "q", q))} /> : null}
      <CatalogFilters filters={filters} onChange={apply} locked={locked} idPrefix={prefix} facets={facets} hideCategories={categoryChips} hideAudience={audienceChips} />
    </div>
  );
  const countBadge =
    count > 0 ? (
      <Badge tone="info" shape="solid" className="h-5 px-1.5 font-sans tracking-normal">
        {count}
      </Badge>
    ) : null;

  const isbn = isbnDigits(filters.q);
  const filterChips = chips.filter((c) => !c.sort);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10">
      <aside aria-label={t.filters} className="hidden lg:block">
        <div className="shop-card sticky top-[calc(var(--header-h)+1rem)] max-h-[calc(100dvh-var(--header-h)-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center justify-between gap-2 font-display text-xl">
            {t.filters}
            {countBadge}
          </h2>
          {panel("side")}
        </div>
      </aside>

      <section aria-labelledby="catalogue-results-heading" className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-4 short:gap-3">
        <h2 id="catalogue-results-heading" className="sr-only">
          {dict.catalogue.results}
        </h2>

        {/* Toolbar: sticky under the header on phones so filters and sort stay one tap away while scrolling. */}
        <div className="catalogue-toolbar sticky top-(--header-h) z-20 -mx-4 flex items-center gap-2 px-4 py-2 sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="shrink-0 bg-card lg:hidden">
                <SlidersHorizontal aria-hidden="true" /> {t.filters}
                {countBadge}
              </Button>
            </DrawerTrigger>
            <DrawerContent side="bottom" aria-describedby={undefined}>
              <DrawerHeader>
                <DrawerTitle>{t.filters}</DrawerTitle>
              </DrawerHeader>
              <DrawerBody>{panel("sheet")}</DrawerBody>
              <DrawerFooter className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={clearAll} disabled={count === 0}>
                  {t.clearAll}
                </Button>
                <Button onClick={() => setSheetOpen(false)}>{meta ? t.showN(total, noun(total)) : t.showResults}</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          {/* One live region for the count: the full "Showing 1–24 of 53 books", shortened to "53 books" on phones. */}
          <p className="min-w-0 flex-1 text-[15px] text-muted-foreground max-sm:shrink-0 max-sm:whitespace-nowrap sm:truncate" role="status" aria-live="polite">
            {meta ? (
              <>
                <span className="sm:hidden" aria-hidden="true">
                  {dict.catalogue.countShort(total, noun(total))}
                </span>
                <span className="max-sm:sr-only">{rangeText(dict, meta.from, meta.to, total, noun(total))}</span>
              </>
            ) : (
              " "
            )}
          </p>
          <SortSelect value={effectiveSort(filters)} searching={Boolean(filters.q)} onChange={(sort) => apply(withFilter(filters, "sort", sort))} className="ml-auto min-w-0 max-sm:flex-1 max-sm:justify-end" />
        </div>

        {categoryChips ? <CategoryChips filters={filters} onChange={apply} counts={filters.category_id === undefined ? facets?.categories : undefined} /> : null}
        {audienceChips ? <QuickFacets filters={filters} facets={facets} onChange={apply} /> : null}
        {filters.q ? <SearchNotices q={filters.q} typoTolerant={Boolean(query.data?.search?.typo_tolerant)} books={query.data?.data ?? []} /> : null}
        <ActiveFilters filters={filters} onChange={apply} locked={locked} />

        {query.isError && !query.data ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <BookGrid
            books={query.data?.data ?? []}
            loading={query.isPending && showSkeleton}
            stale={query.isPlaceholderData}
            headingLevel="h3"
            layout="sidebar"
            empty={
              query.isPending ? null : (
                <NoResults
                  title={filters.q ? t.noMatchQuery(filters.q) : t.noMatchFilters}
                  lead={isbn ? dict.catalogue.isbnNone : filterChips.length > 0 ? dict.catalogue.noMatchFiltersLead : filters.q ? dict.pages.noMatchLead : t.noMatchLead}
                  suggestions={filterChips}
                  onClearAll={clearAll}
                />
              )
            }
          />
        )}

        <Pagination page={meta?.current_page ?? 1} lastPage={lastPage} hrefFor={hrefFor} className="mt-6" />
      </section>
    </div>
  );
}
