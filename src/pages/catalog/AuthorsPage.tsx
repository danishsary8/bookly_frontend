import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRoundSearch } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { AuthorAvatar } from "@/components/catalog/AuthorAvatar";
import { PageHeader } from "@/components/catalog/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { rangeSummary } from "@/lib/pagination";

const PER_PAGE = 24;

export default function AuthorsPage() {
  useDocumentTitle("Authors", { description: "Find books by author at Bookly." });
  const [params, setParams] = useSearchParams();
  const q = params.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [draft, setDraft] = useState(q);
  const authors = useQuery({ ...catalogQueries.authors({ q: q || undefined, page, per_page: PER_PAGE }), placeholderData: (prev) => prev });
  const showSkeleton = useSkeletonVisible(authors.isPending);
  const meta = authors.data?.meta;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setParams(draft.trim() ? { q: draft.trim() } : {});
  };
  const hrefFor = (p: number) => {
    const next = new URLSearchParams(params);
    if (p > 1) next.set("page", String(p));
    else next.delete("page");
    return `?${next.toString()}`;
  };

  return (
    <div className="container-shell pb-16">
      <PageHeader crumbs={[{ label: "Home", to: "/" }, { label: "Authors" }]} eyebrow="Writers" title="Authors" lead="Browse the writers in our catalogue and every book we stock by them." />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <form role="search" onSubmit={submit} className="flex w-full max-w-md gap-2">
          <label htmlFor="author-search" className="sr-only">
            Search authors
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="author-search"
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search by name"
              className="h-11 w-full rounded-md border border-input bg-card pl-10 pr-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
        <p className="text-[15px] text-muted-foreground" role="status">
          {meta ? rangeSummary(meta.from, meta.to, meta.total ?? 0, "authors") : " "}
        </p>
      </div>

      {authors.isError && !authors.data ? (
        <ErrorState error={authors.error} onRetry={() => authors.refetch()} />
      ) : authors.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label="Loading authors…" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </SkeletonGroup>
        ) : null
      ) : authors.data.data.length === 0 ? (
        <EmptyState icon={UserRoundSearch} title={`No authors match “${q}”`} description="Try a shorter name or just the surname." />
      ) : (
        <Stagger as="ul" key={`${q}-${page}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {authors.data.data.map((author, index) => (
            <StaggerItem as="li" key={author.id} index={index}>
              <Link
                to={`/authors/${author.id}`}
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-4 transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AuthorAvatar name={author.name ?? ""} photoUrl={author.photo_url} className="size-16 text-xl" />
                <span className="min-w-0">
                  <span className="block font-display text-xl leading-tight underline-offset-4 group-hover:underline">{author.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {author.books_count ?? 0} {author.books_count === 1 ? "book" : "books"}
                  </span>
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
