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
import { useT } from "@/i18n";

const SPINES = ["#14207A", "#7A2E2A", "#2F5D4A", "#8A5A3B", "#4C5378", "#1E4E5C", "#5B3A66"];

/* /series (pages/catalogue.md): each series as a card with decorative cloth spines, one per book (up to 7). */
export default function SeriesListPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(p.series, { description: p.seriesMeta });
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const series = useQuery({ ...catalogQueries.seriesList({ page, per_page: 24 }), placeholderData: (prev) => prev });
  const showSkeleton = useSkeletonVisible(series.isPending);
  const meta = series.data?.meta;

  return (
    <div className="container-shell pb-16">
      <PageHeader crumbs={[{ label: p.home, to: "/" }, { label: p.series }]} eyebrow={p.readInOrder} title={p.series} lead={p.seriesLead} />

      {series.isError && !series.data ? (
        <ErrorState error={series.error} onRetry={() => series.refetch()} />
      ) : series.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={p.loadingSeries} className="grid gap-5 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </SkeletonGroup>
        ) : null
      ) : series.data.data.length === 0 ? (
        <EmptyState icon={Library} title={p.noSeries} description={p.noSeriesLead} />
      ) : (
        <Stagger as="ul" className="grid gap-5 md:grid-cols-2">
          {series.data.data.map((s, index) => (
            <StaggerItem as="li" key={s.id} index={index}>
              <Link
                to={`/series/${s.id}`}
                className="shop-card group grid h-full grid-cols-[auto_minmax(0,1fr)] gap-x-6 rounded-2xl border border-border bg-card p-6 outline-none transition-[border-color,translate] duration-300 hover:-translate-y-1 hover:border-input focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
              >
                {/* Decorative cloth spines, one per book (up to 7): the series as it would stand on a shelf. */}
                <span className="row-span-5 flex h-36 items-end gap-[3px] self-start" aria-hidden="true">
                  {Array.from({ length: Math.min(7, Math.max(1, s.books_count ?? 1)) }, (_, i) => (
                    <span
                      key={i}
                      className="w-[18px] rounded-[2px] shadow-[inset_-2px_0_0_rgb(0_0_0/0.18),inset_1px_0_0_rgb(255_255_255/0.18)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 motion-reduce:transform-none"
                      style={{ height: `${86 + ((((s.id ?? 0) + i) * 37) % 15)}%`, background: SPINES[((s.id ?? 0) + i) % SPINES.length], transitionDelay: `${i * 40}ms` }}
                    >
                      <span className="mx-auto mt-3 block h-px w-2.5 bg-[#F2C84B]/70" />
                    </span>
                  ))}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">
                  {p.bookCount(s.books_count ?? 0)}
                </span>
                <span className="font-display text-[1.563rem] leading-tight underline-offset-4 group-hover:underline">{s.name}</span>
                {s.description ? <span className="line-clamp-3 text-muted-foreground">{s.description}</span> : null}
                <span className="mt-2 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary">
                  {p.readInOrder} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
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
