import { useState, type FormEvent } from "react";
import { Search, SearchX } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";
import { PageHeader } from "@/components/catalog/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useT } from "@/i18n";

/*
 * /search?q=: results by relevance (the API's default with a query) through the
 * shared catalogue browser, with a search field on the page to refine the query.
 */
export default function SearchPage() {
  const { dict } = useT();
  const p = dict.pages;
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const [draft, setDraft] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  if (lastQ !== q) {
    setLastQ(q);
    setDraft(q);
  }
  useDocumentTitle(q ? p.searchDoc(q) : dict.search.title, { noindex: true });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next = draft.trim();
    setParams(next ? { q: next } : {});
  };

  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: dict.search.title }]}
        title={q ? p.resultsFor(q) : dict.search.title}
        lead={q ? undefined : p.searchLead}
      />

      <form role="search" onSubmit={submit} className="mb-10 flex max-w-2xl gap-3">
        <label htmlFor="search-page-field" className="sr-only">
          {dict.search.title}
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="search-page-field"
            type="search"
            enterKeyHint="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={dict.search.placeholder}
            className="h-12 w-full rounded-md border border-input bg-card pl-11 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
        <Button type="submit" size="lg">
          {dict.search.title}
        </Button>
      </form>

      {q ? (
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
      ) : null}
    </div>
  );
}
