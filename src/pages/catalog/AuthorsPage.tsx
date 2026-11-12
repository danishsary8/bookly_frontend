import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRoundSearch } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { rangeText, useT } from "@/i18n";

const PER_PAGE = 24;

/*
 * /authors (pages/catalogue-v2.md §4): search by name (in the URL), then author cards: portrait or initials, name,
 * the first lines of the bio when there is one, and the book count. Cards lift on hover.
 */
export default function AuthorsPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(p.authors, { description: p.authorsMeta });
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const [draftFor, setDraftFor] = useState(q);
  // Back/Forward change the query under the field.
  if (draftFor !== q) {
    setDraftFor(q);
    setDraft(q);
  }
  const authors = useQuery({ ...catalogQueries.authors({ q: q || undefined, page, per_page: PER_PAGE }), placeholderData: (prev) => prev });
  const showSkeleton = useSkeletonVisible(authors.isPending);
  useScrollMemory(Boolean(authors.data));
  const meta = authors.data?.meta;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  };
  const hrefFor = (n: number) => {
    const next = new URLSearchParams(params);
    if (n > 1) next.set("page", String(n));
    else next.delete("page");
    return `?${next.toString()}`;
  };

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader crumbs={[{ label: p.home, to: "/" }, { label: p.authors }]} eyebrow={p.writers} title={p.authors} lead={p.authorsLead} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <form role="search" onSubmit={submit} className="flex w-full max-w-md gap-2">
          <label htmlFor="author-search" className="sr-only">
            {p.searchAuthors}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="author-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={p.searchByName}
              className="h-11 w-full rounded-full border border-input bg-card pl-10 pr-4 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="outline" className="shrink-0 bg-card">
            {p.search}
          </Button>
        </form>
        <p className="text-[15px] text-muted-foreground" role="status" aria-live="polite">
          {meta ? rangeText(dict, meta.from, meta.to, meta.total ?? 0, p.authorsNoun(meta.total ?? 0)) : " "}
        </p>
      </div>

      {authors.isError && !authors.data ? (
        <ErrorState error={authors.error} onRetry={() => authors.refetch()} />
      ) : authors.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={p.loadingAuthors} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </SkeletonGroup>
        ) : null
      ) : authors.data.data.length === 0 ? (
        <EmptyState
          icon={UserRoundSearch}
          title={p.noAuthors(q)}
          description={p.noAuthorsLead}
          action={
            <Link to={`/search?q=${encodeURIComponent(q)}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
              {dict.catalogue.searchBooksFor(q)}
            </Link>
          }
        />
      ) : (
        <Stagger as="ul" key={`${q}-${page}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.data.data.map((author, index) => (
            <StaggerItem as="li" key={author.id} index={index}>
              <Link
                to={`/authors/${author.id}`}
                className="shop-card group flex h-full items-start gap-4 rounded-2xl border border-border bg-card p-5 outline-none transition-[border-color,translate] duration-300 hover:-translate-y-1 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
              >
                <AuthorAvatar name={author.name ?? ""} photoUrl={author.photo_url} className="size-16 text-xl ring-4 ring-lapis-tint" />
                <span className="grid min-w-0 gap-1">
                  <span className="font-display text-xl leading-tight [overflow-wrap:anywhere] underline-offset-4 group-hover:underline">{author.name}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.bookCount(author.books_count ?? 0)}</span>
                  {author.bio ? <span className="line-clamp-2 text-sm text-muted-foreground">{author.bio}</span> : null}
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={hrefFor} className="mt-10" />
    </div>
  );
}
