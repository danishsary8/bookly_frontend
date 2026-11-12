import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Barcode, Clock, Search, TrendingUp, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches } from "@/stores/recentSearches";

/*
 * /search?q= (pages/catalogue-v2.md §4). With a query: results by relevance through the shared catalogue browser
 * (filters, similar-spelling "Did you mean", ISBN line, no-results recovery). Without one: one search field, recent
 * and popular searches, the ISBN tip, the top-level categories and the shop's popular books.
 */

const pill =
  "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground outline-none transition-colors duration-150 hover:border-primary/50 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring";

function HubSection({ id, icon, title, action, children }: { id: string; icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="flex items-center gap-2 font-display text-xl">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function CategoryIndex() {
  const { dict } = useT();
  const tree = useQuery(catalogQueries.categoryTree());
  if (tree.isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
        ))}
      </div>
    );
  }
  const tops = (tree.data ?? []).filter((c) => (c.total_books ?? 0) > 0);
  if (tops.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tops.map((c) => (
        <li key={c.id}>
          <Link
            to={`/categories/${c.slug}`}
            className="shop-card group flex h-full min-h-[4.5rem] items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 outline-none transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="min-w-0">
              <span className="block font-semibold leading-snug [overflow-wrap:anywhere] group-hover:text-primary">{c.name}</span>
              <span className="text-sm tabular-nums text-muted-foreground">{dict.pages.bookCount(c.total_books ?? 0)}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transform-none" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function SearchPage() {
  const { dict } = useT();
  const p = dict.pages;
  const s = dict.search;
  const c = dict.catalogue;
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const recentSearches = useRecentSearches();

  // Back/Forward change the query under the field.
  if (lastQ !== q) {
    setLastQ(q);
    setDraft(q);
  }
  useDocumentTitle(q ? p.searchDoc(q) : s.title, { noindex: true });

  const run = (text: string) => {
    const next = text.trim();
    setDraft(next);
    if (next) {
      addRecentSearch(next);
      setParams({ q: next });
    } else {
      setParams({});
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    run(draft);
  };

  // The page's own field sits beside the title (one row on laptops), under it on phones.
  const searchForm = (
    <form role="search" onSubmit={submit} className="flex w-full max-w-xl gap-2 lg:w-[28rem]">
      <label htmlFor="search-page-field" className="sr-only">
        {s.title}
      </label>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="search-page-field"
          type="search"
          enterKeyHint="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={s.placeholder}
          className="h-12 w-full rounded-md border border-input bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        />
      </div>
      <Button type="submit" size="lg" className="shrink-0">
        {s.title}
      </Button>
    </form>
  );

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        crumbs={[{ label: p.home, to: "/" }, { label: s.title }]}
        title={q ? p.resultsFor(q) : s.title}
        lead={q ? undefined : p.searchLead}
        aside={searchForm}
      />


      {q ? (
        <CatalogBrowser searchBox={false} noun={dict.nouns.result} />
      ) : (
        <div className="grid gap-10">
          <div className="grid max-w-4xl gap-8">
            {recentSearches.length > 0 ? (
              <HubSection
                id="recent-searches-title"
                icon={<Clock className="size-5 text-primary" aria-hidden="true" />}
                title={s.recentSearches}
                action={
                  <button type="button" onClick={clearRecentSearches} className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                    {s.clearRecent}
                  </button>
                }
              >
                <ul className="flex flex-wrap gap-2">
                  {recentSearches.map((item) => (
                    <li key={item} className="inline-flex items-center rounded-full border border-border bg-card">
                      <button type="button" onClick={() => run(item)} className="inline-flex min-h-11 items-center rounded-l-full pl-4 pr-2 text-sm font-medium outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring">
                        {item}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeRecentSearch(item)}
                        aria-label={c.removeRecent(item)}
                        className="grid size-11 place-items-center rounded-r-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              </HubSection>
            ) : null}

            <HubSection id="popular-searches-title" icon={<TrendingUp className="size-5 text-primary" aria-hidden="true" />} title={s.popularSearches}>
              <ul className="flex flex-wrap gap-2">
                {s.popularTags.map((tag) => (
                  <li key={tag}>
                    <button type="button" onClick={() => run(tag)} className={pill}>
                      {tag}
                    </button>
                  </li>
                ))}
              </ul>
              <p className="flex items-start gap-2 text-[15px] text-muted-foreground">
                <Barcode className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden="true" />
                {c.isbnTip}
              </p>
            </HubSection>

            <HubSection id="search-categories-title" icon={null} title={s.exploreCategories}>
              <CategoryIndex />
            </HubSection>
          </div>
          <RelatedShelf id="search-popular" title={c.popularNow} source={{ kind: "similar" }} seeAllHref="/books?sort=best_selling" />
        </div>
      )}
    </div>
  );
}
