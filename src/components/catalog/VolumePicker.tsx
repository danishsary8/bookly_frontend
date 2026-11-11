import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, AlertCircle, ShoppingCart, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { cartApi, cartKeys } from "@/api/endpoints/cart";
import type { SeriesBook, SeriesDetail } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { SetOfferBanner } from "@/features/offers/SetOfferBanner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toast";
import { useT } from "@/i18n";

interface VolumePickerProps {
  currentBookId: number;
  series: SeriesDetail;
  className?: string;
}

export function VolumePicker({ currentBookId, series, className }: VolumePickerProps) {
  const { dict } = useT();
  const vDict = dict.seriesVolumes;
  const queryClient = useQueryClient();
  const seriesId = series.id ?? 0;
  const books = (series.books ?? []) as SeriesBook[];

  // Query next volume
  const nextVolumeQuery = useQuery(catalogQueries.nextVolume(currentBookId));
  const nextBook = nextVolumeQuery.data;

  // Complete the set mutation
  const [isAddingSet, setIsAddingSet] = useState(false);
  const completeSetMutation = useMutation({
    // With a set offer every volume goes in (also ones already owned): the offer needs the whole set in one order.
    mutationFn: () => cartApi.addSeries(seriesId, Boolean(series.set_offer)),
    onMutate: () => setIsAddingSet(true),
    onSettled: () => setIsAddingSet(false),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
      void queryClient.invalidateQueries({ queryKey: ["catalog", "series", seriesId] });
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

  if (books.length === 0) return null;

  return (
    <section
      aria-label={vDict.volumePicker}
      className={cn("rounded-xl border border-border bg-card p-5 sm:p-6", className)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            {vDict.volumePicker}
          </span>
          <h2 className="font-display text-xl sm:text-2xl mt-0.5">
            {series.name}
          </h2>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isAddingSet || completeSetMutation.isPending}
          onClick={() => completeSetMutation.mutate()}
          className="self-start sm:self-auto shrink-0 gap-1.5"
        >
          {isAddingSet ? (
            <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          ) : (
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
          )}
          <span>{vDict.completeSet}</span>
        </Button>
      </div>

      <SetOfferBanner offer={series.set_offer} onAdd={() => completeSetMutation.mutate()} pending={isAddingSet || completeSetMutation.isPending} className="mt-4" />

      {/* Horizontal scrollable volume picker */}
      <div className="mt-4 flex gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x">
        {books.map((book: SeriesBook, index: number) => {
          const isCurrent = book.id === currentBookId;
          const volNumber = book.series_order ?? index + 1;
          const isOwned = Boolean(book.is_owned);
          const isInCart = Boolean(book.is_in_cart);
          const isOutOfStock = !book.in_stock;

          return (
            <Link
              key={book.id}
              to={`/books/${book.id}`}
              className={cn(
                "group relative flex w-32 shrink-0 flex-col rounded-lg border p-2 text-left transition snap-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm"
                  : "border-border bg-surface-1 hover:border-primary/40 hover:bg-surface-2"
              )}
              aria-current={isCurrent ? "page" : undefined}
            >
              {/* Cover thumbnail */}
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-surface-2">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title ?? ""}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                    {book.title}
                  </div>
                )}

                {/* Status chip over thumbnail */}
                {isOwned ? (
                  <span className="absolute top-1 left-1">
                    <Badge tone="success" shape="solid" size="sm" className="h-5 px-1.5 text-[10px]">
                      <Check className="size-3" aria-hidden="true" />
                      {vDict.owned}
                    </Badge>
                  </span>
                ) : isInCart ? (
                  <span className="absolute top-1 left-1">
                    <Badge tone="info" shape="solid" size="sm" className="h-5 px-1.5 text-[10px]">
                      <ShoppingCart className="size-3" aria-hidden="true" />
                      {vDict.inCart}
                    </Badge>
                  </span>
                ) : isOutOfStock ? (
                  <span className="absolute top-1 left-1">
                    <Badge tone="danger" shape="outline" size="sm" className="h-5 px-1.5 text-[10px]">
                      <AlertCircle className="size-3" aria-hidden="true" />
                      {vDict.outOfStock}
                    </Badge>
                  </span>
                ) : null}
              </div>

              {/* Volume info */}
              <div className="mt-2 flex flex-col">
                <span
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {vDict.volumeNumber(volNumber)}
                </span>
                <span className="line-clamp-2 text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                  {book.title}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Next volume prompt if available */}
      {nextBook ? (
        <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
          <div className="flex items-center gap-3">
            {nextBook.cover_image_url ? (
              <img
                src={nextBook.cover_image_url}
                alt={nextBook.title}
                className="h-14 w-10 shrink-0 rounded object-cover shadow-xs"
              />
            ) : null}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {vDict.nextVolumeEyebrow}
              </span>
              <p className="font-semibold text-sm text-foreground line-clamp-1">{nextBook.title}</p>
              <p className="text-xs text-muted-foreground">{vDict.continueReading}</p>
            </div>
          </div>
          <Link
            to={`/books/${nextBook.id}`}
            className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0 gap-1" })}
          >
            <span>{vDict.nextVolume}</span>
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
