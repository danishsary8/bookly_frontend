import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Library, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { catalogKeys, catalogQueries } from "@/api/endpoints/catalog";
import { cartApi, cartKeys } from "@/api/endpoints/cart";
import { ApiError } from "@/api/errors";
import { BookGrid } from "@/components/catalog/BookGrid";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { SetOfferBanner } from "@/features/offers/SetOfferBanner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { openShellPanel } from "@/stores/shell";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

/*
 * /series/:id (pages/catalogue-v2.md §4): the series on a sheet (blurb, who wrote it, volume count, every series)
 * with the set offer banner or Complete the set; the volumes in reading order, each under a numbered disc; then more
 * by the series' author. Completing the set adds the missing volumes and opens the cart drawer.
 */
export default function SeriesPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const series = useQuery({ ...catalogQueries.series(id), enabled: valid });
  const showSkeleton = useSkeletonVisible(series.isPending);
  useScrollMemory(Boolean(series.data));
  const { dict } = useT();
  const v = dict.seriesVolumes;
  const p = dict.pages;
  const c = dict.catalogue;
  const queryClient = useQueryClient();

  const completeSet = useMutation({
    mutationFn: () => cartApi.addSeries(id, Boolean(series.data?.set_offer)),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.series(id) });
      if (data.added.length > 0) {
        toast.success(v.setAddedToast(data.added.length, data.skipped.length));
        openShellPanel("cart");
      } else {
        toast.info(v.noMissingVolumes);
      }
    },
    onError: (error) => toast.error(ApiError.from(error).message || dict.common.error),
  });
  useDocumentTitle(series.data?.name, { description: series.data?.description || (series.data ? p.seriesBookMeta(series.data.name ?? "") : null) });

  if (!valid || (series.isError && ApiError.from(series.error).kind === "not_found")) {
    return <NotFoundState what={p.whatSeries} backTo="/series" backLabel={p.allSeries} />;
  }
  if (series.isError) return <div className="container-shell py-16"><ErrorState error={series.error} onRetry={() => series.refetch()} headingLevel="h1" /></div>;

  const books = series.data?.books ?? [];
  // Who wrote the series: every author of its volumes, first appearance first.
  const authors = Array.from(new Map(books.flatMap((b) => b.authors ?? []).filter((a) => a.id && a.name).map((a) => [a.id, a])).values());
  const lead = authors[0];
  const volumeIds = books.map((b) => b.id);

  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.series, to: "/series" }, { label: series.data?.name ?? p.series }]}
        eyebrow={p.series}
        title={series.data?.name ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-72 max-w-full rounded-sm align-middle" />}
        blurb={series.data?.description}
        covers={books.map((b) => ({ src: b.cover_image_url, title: b.title }))}
        facts={
          series.data ? (
            <>
              {authors.length > 0 ? (
                <span>
                  {c.writtenBy}{" "}
                  {authors.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 ? ", " : null}
                      <Link to={`/authors/${a.id}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                        {a.name}
                      </Link>
                    </span>
                  ))}
                </span>
              ) : null}
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{c.volumes(books.length)}</span>
              <Link to="/series" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                {p.allSeries}
              </Link>
            </>
          ) : undefined
        }
        actions={
          books.length === 0 ? undefined : series.data?.set_offer ? (
            <SetOfferBanner offer={series.data.set_offer} onAdd={() => completeSet.mutate()} pending={completeSet.isPending} />
          ) : (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button onClick={() => completeSet.mutate()} loading={completeSet.isPending}>
                <Sparkles aria-hidden="true" /> {v.completeSet}
              </Button>
              <span className="max-w-sm text-sm text-muted-foreground">{v.completeSetDesc}</span>
            </div>
          )
        }
      />

      <div className="grid gap-14">
        <BookGrid
          books={books}
          loading={series.isPending && showSkeleton}
          skeletonCount={4}
          ordered
          headingLevel="h2"
          instancePrefix="series"
          above={(book, index) => (
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-[13px] tracking-normal text-primary-foreground" aria-hidden="true">
                {book.series_order ?? index + 1}
              </span>
              {p.bookN(book.series_order ?? index + 1)}
            </p>
          )}
          empty={series.isPending ? null : <EmptyState icon={Library} title={p.noSeriesBooks} description={p.checkBack} />}
        />
        {lead?.id ? (
          <RelatedShelf
            id={`series-${id}-author`}
            title={c.moreBy(lead.name ?? "")}
            source={{ kind: "filter", filters: { author_id: lead.id, sort: "best_selling" }, exclude: volumeIds }}
            seeAllHref={`/authors/${lead.id}`}
          />
        ) : null}
      </div>
    </div>
  );
}
