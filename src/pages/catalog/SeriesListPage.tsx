import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Library } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { rangeText, useT } from "@/i18n";

/*
 * /series (pages/catalogue-v2.md §4): each series as a card with decorative cloth spines, one per volume (up to 7;
 * the API has no covers for a series list, so nothing pretends to be a cover), the volume count, the blurb and
 * "Read in order".
 */
export default function SeriesListPage() {
  const { dict } = useT();
  const p = dict.pages;
  useDocumentTitle(p.series, { description: p.seriesMeta });
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const series = useQuery({ ...catalogQueries.seriesList({ page, per_page: 24 }), placeholderData: (prev) => prev });
  const showSkeleton = useSkeletonVisible(series.isPending);
  useScrollMemory(Boolean(series.data));
  const meta = series.data?.meta;

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader crumbs={[{ label: p.home, to: "/" }, { label: p.series }]} eyebrow={p.readInOrder} title={p.series} lead={p.seriesLead} />
      <p className="mb-5 text-[15px] text-muted-foreground" role="status" aria-live="polite">
        {meta ? rangeText(dict, meta.from, meta.to, meta.total ?? 0, dict.catalogue.seriesNoun) : " "}
      </p>

      {series.isError && !series.data ? (
        <ErrorState error={series.error} onRetry={() => series.refetch()} />
      ) : series.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={p.loadingSeries} className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
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
                <span className="row-span-4 flex h-32 items-end gap-[3px] self-start" aria-hidden="true">
                  {Array.from({ length: Math.min(7, Math.max(1, s.books_count ?? 1)) }, (_, i) => (
                    <span key={i} className="series-spine" data-cloth={((s.id ?? 0) + i) % 7} style={{ height: `${86 + ((((s.id ?? 0) + i) * 37) % 15)}%`, transitionDelay: `${i * 40}ms` }} />
                  ))}
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{dict.catalogue.volumes(s.books_count ?? 0)}</span>
                <span className="mt-1 font-display text-[1.563rem] leading-tight [overflow-wrap:anywhere] underline-offset-4 group-hover:underline">{s.name}</span>
                {s.description ? <span className="mt-1 line-clamp-2 text-muted-foreground">{s.description}</span> : <span />}
                <span className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-semibold text-primary">
                  {p.readInOrder} <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}

      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={(n) => (n > 1 ? `?page=${n}` : "?")} className="mt-10" />
    </div>
  );
}
