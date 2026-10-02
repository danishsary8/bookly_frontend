import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Library } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { PageHeader } from "@/components/catalog/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";

export default function SeriesListPage() {
  useDocumentTitle("Series");
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const series = useQuery({ ...catalogQueries.seriesList({ page, per_page: 24 }), placeholderData: (prev) => prev });
  const showSkeleton = useSkeletonVisible(series.isPending);
  const meta = series.data?.meta;

  return (
    <div className="container-shell pb-16">
      <PageHeader crumbs={[{ label: "Home", to: "/" }, { label: "Series" }]} eyebrow="Read in order" title="Series" lead="Stories that continue from book to book, listed in reading order." />

      {series.isError && !series.data ? (
        <ErrorState error={series.error} onRetry={() => series.refetch()} />
      ) : series.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label="Loading series…" className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </SkeletonGroup>
        ) : null
      ) : series.data.data.length === 0 ? (
        <EmptyState icon={Library} title="No series yet" description="Series will appear here as they are added to the catalogue." />
      ) : (
        <Stagger as="ul" className="grid gap-5 md:grid-cols-2">
          {series.data.data.map((s, index) => (
            <StaggerItem as="li" key={s.id} index={index}>
              <Link
                to={`/series/${s.id}`}
                className="group grid h-full content-start gap-3 rounded-xl border border-border bg-card p-6 transition-[border-color,box-shadow] duration-150 hover:border-input hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">
                  {s.books_count ?? 0} {s.books_count === 1 ? "book" : "books"}
                </span>
                <span className="font-display text-[1.563rem] leading-tight underline-offset-4 group-hover:underline">{s.name}</span>
                {s.description ? <span className="line-clamp-3 text-muted-foreground">{s.description}</span> : null}
                <span className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary">
                  Read in order <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={(p) => (p > 1 ? `?page=${p}` : "?")} className="mt-10" />
    </div>
  );
}
