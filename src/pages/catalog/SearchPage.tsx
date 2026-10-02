import { useState, type FormEvent } from "react";
import { Search, SearchX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/catalog/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/*
 * /search?q=: results by relevance (the API's default with a query) through the
 * shared catalogue browser, with a search field on the page to refine the query.
 */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setDraft(q);
  }
  useDocumentTitle(q ? `Search: ${q}` : "Search");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    setParams(next ? { q: next } : {});
  };

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: "Home", to: "/" }, { label: "Search" }]}
        title={q ? <>Results for “{q}”</> : "Search the catalogue"}
        lead={q ? undefined : "Find a book by its title, author, series or category."}
      />

      <form role="search" onSubmit={submit} className="mb-10 flex max-w-2xl gap-3">
        <label htmlFor="search-page-field" className="sr-only">
          Search books
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="search-page-field"
            type="search"
            enterKeyHint="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Title, author, series…"
            className="h-12 w-full rounded-md border border-input bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <Button type="submit" size="lg">
          Search
        </Button>
      </form>

      {q ? (
        <CatalogBrowser
          noun="results"
          empty={
            <EmptyState
              icon={SearchX}
              title={`No books match “${q}”`}
              description="Try a shorter title, an author's surname, or check the spelling."
              action={
                <Link to="/books" className={buttonVariants()}>
                  Browse all books
                </Link>
              }
            />
          }
        />
      ) : null}
    </div>
  );
}
