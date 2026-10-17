import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, Folder, Search, SearchX, TrendingUp, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/catalog/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";
import {
  addRecentSearch,
  clearRecentSearches,
  removeRecentSearch,
  useRecentSearches,
} from "@/stores/recentSearches";

/*
 * /search?q=: results by relevance (the API's default with a query) through the
 * shared catalogue browser, with recent searches, popular discovery topics,
 * and category exploration when no query is active.
 */
export default function SearchPage() {
  const { dict } = useT();
  const p = dict.pages;
  const s = dict.search;
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);

  const recentSearches = useRecentSearches();

  const categoriesQuery = useQuery({
    ...catalogQueries.categories(),
    enabled: !q,
  });

  if (lastQ !== q) {
    setLastQ(q);
    setDraft(q);
  }

  useDocumentTitle(q ? p.searchDoc(q) : s.title, { noindex: true });

  const executeSearch = (queryText: string) => {
    const next = queryText.trim();
    if (next) {
      addRecentSearch(next);
      setDraft(next);
      setParams({ q: next });
    } else {
      setDraft("");
      setParams({});
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    executeSearch(draft);
  };

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: s.title }]}
        title={q ? p.resultsFor(q) : s.title}
        lead={q ? undefined : p.searchLead}
      />

      <form role="search" onSubmit={submit} className="mb-6 flex max-w-2xl gap-3">
        <label htmlFor="search-page-field" className="sr-only">
          {s.title}
        </label>
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
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
        <Button type="submit" size="lg">
          {s.title}
        </Button>
      </form>

      {/* Discovery Hub when no search query is active */}
      {!q ? (
        <div className="max-w-4xl space-y-10">
          {/* Recent Searches */}
          {recentSearches.length > 0 ? (
            <section aria-labelledby="recent-searches-title" className="space-y-3">
              <div className="flex items-center justify-between">
                <h2
                  id="recent-searches-title"
                  className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  <Clock className="size-4 text-primary" aria-hidden="true" />
                  {s.recentSearches}
                </h2>
                <button
                  type="button"
                  onClick={clearRecentSearches}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.clearRecent}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    <button
                      type="button"
                      onClick={() => executeSearch(item)}
                      className="cursor-pointer text-left focus:outline-none"
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(item);
                      }}
                      aria-label={`Remove ${item}`}
                      className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Popular Searches */}
          <section aria-labelledby="popular-searches-title" className="space-y-3">
            <h2
              id="popular-searches-title"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <TrendingUp className="size-4 text-primary" aria-hidden="true" />
              {s.popularSearches}
            </h2>

            <div className="flex flex-wrap gap-2">
              {s.popularTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => executeSearch(tag)}
                  className="rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* Browse Categories */}
          <section aria-labelledby="browse-categories-title" className="space-y-4">
            <h2
              id="browse-categories-title"
              className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <BookOpen className="size-4 text-primary" aria-hidden="true" />
              {s.exploreCategories}
            </h2>

            {categoriesQuery.isPending ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-xl" />
                ))}
              </div>
            ) : categoriesQuery.data && categoriesQuery.data.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {categoriesQuery.data.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/books?category_id=${cat.id}`}
                    className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Folder className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                      {typeof cat.books_count === "number" ? (
                        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                          {cat.books_count}
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-3 font-semibold text-foreground group-hover:text-primary transition-colors text-sm line-clamp-1">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      ) : (
        /* Results View */
        <CatalogBrowser
          noun={dict.nouns.result}
          empty={
            <EmptyState
              icon={SearchX}
              title={p.noMatch(q)}
              description={p.noMatchLead}
              action={
                <Link to="/books" className={buttonVariants()}>
                  {p.browseAll}
                </Link>
              }
            />
          }
        />
      )}
    </div>
  );
}
