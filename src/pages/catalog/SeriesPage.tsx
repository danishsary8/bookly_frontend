import { useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { useParams } from "react-router-dom";
import { catalogKeys, catalogQueries } from "@/api/endpoints/catalog";
import { cartApi, cartKeys } from "@/api/endpoints/cart";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/stores/toast";
import { ApiError } from "@/api/errors";
import { BookCard } from "@/components/catalog/BookCard";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { PageHeader } from "@/components/catalog/PageHeader";
import { useAddToCart, useWishlist } from "@/components/catalog/useCatalogActions";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useT } from "@/i18n";

/* A series in reading order (pages/catalogue.md): a header panel with the volumes' covers and "Complete the set",
   then each card labelled with a numbered disc, "Book 1", "Book 2", … */
export default function SeriesPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const series = useQuery({ ...catalogQueries.series(id), enabled: valid });
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const showSkeleton = useSkeletonVisible(series.isPending);
  const { dict } = useT();
  const vDict = dict.seriesVolumes;
  const p = dict.pages;
  const queryClient = useQueryClient();

  const completeSetMutation = useMutation({
    mutationFn: () => cartApi.addSeries(id),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: catalogKeys.series(id) });
      const addedCount = data.added.length;
      const skippedCount = data.skipped.length;
      if (addedCount > 0) {
        toast.success(vDict.setAddedToast(addedCount, skippedCount));
      } else {
        toast.info(vDict.noMissingVolumes);
      }
    },
    onError: () => {
      toast.error(dict.common.error);
    },
  });
  useDocumentTitle(series.data?.name, { description: series.data?.description || (series.data ? p.seriesBookMeta(series.data.name ?? "") : null) });

  if (!valid || (series.isError && ApiError.from(series.error).kind === "not_found")) {
    return <NotFoundState what={p.whatSeries} backTo="/series" backLabel={p.allSeries} />;
  }
  if (series.isError) return <div className="container-shell py-16"><ErrorState error={series.error} onRetry={() => series.refetch()} headingLevel="h1" /></div>;

  const books = series.data?.books ?? [];
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: p.series, to: "/series" }, { label: series.data?.name ?? p.series }]}
        eyebrow={series.data ? p.seriesEyebrow(books.length) : p.series}
        title={series.data?.name ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-72 max-w-full rounded-sm align-middle" />}
        lead={series.data?.description ?? undefined}
        variant="panel"
        covers={books.filter((b) => b.cover_image_url).slice(0, 5).map((b) => ({ src: b.cover_image_url, title: b.title }))}
        meta={
          books.length > 0 && !series.isPending ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-dashed border-border pt-4">
              <Button onClick={() => completeSetMutation.mutate()} disabled={completeSetMutation.isPending} className="gap-1.5">
                {completeSetMutation.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
                <span>{vDict.completeSet}</span>
              </Button>
              <span className="max-w-sm text-sm text-muted-foreground">{vDict.completeSetDesc}</span>
            </div>
          ) : undefined
        }
      />

      {series.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={p.loadingBooks} className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        ) : null
      ) : books.length === 0 ? (
        <EmptyState icon={Library} title={p.noSeriesBooks} description={p.checkBack} />
      ) : (
        <Stagger as="ol" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {books.map((book, index) => (
            <StaggerItem as="li" key={book.id} index={index} className="grid content-start gap-3">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <span className="grid size-7 place-items-center rounded-full bg-primary font-sans text-[13px] tracking-normal text-primary-foreground" aria-hidden="true">{index + 1}</span>
                {p.bookN(index + 1)}
              </p>
              <BookCard
                book={book}
                instanceKey={`series-${book.id}`}
                headingLevel="h2"
                saved={wishlist.isSaved(book.id)}
                adding={cart.pendingBookId === book.id}
                onAddToCart={cart.add}
                onToggleWishlist={wishlist.toggle}
              />
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}
