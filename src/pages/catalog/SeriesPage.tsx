import { useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import { useParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
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

/* A series in reading order: each card is labelled "Book 1", "Book 2", … */
export default function SeriesPage() {
  const id = Number(useParams().id);
  const valid = Number.isInteger(id) && id > 0;
  const series = useQuery({ ...catalogQueries.series(id), enabled: valid });
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const showSkeleton = useSkeletonVisible(series.isPending);
  useDocumentTitle(series.data?.name, { description: series.data?.description || (series.data ? `Every book in the ${series.data.name} series, in reading order.` : null) });

  if (!valid || (series.isError && ApiError.from(series.error).kind === "not_found")) {
    return <NotFoundState what="series" backTo="/series" backLabel="All series" />;
  }
  if (series.isError) return <div className="container-shell py-16"><ErrorState error={series.error} onRetry={() => series.refetch()} headingLevel="h1" /></div>;

  const books = series.data?.books ?? [];
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: "Home", to: "/" }, { label: "Series", to: "/series" }, { label: series.data?.name ?? "Series" }]}
        eyebrow={series.data ? `Series · ${books.length} ${books.length === 1 ? "book" : "books"}` : "Series"}
        title={series.data?.name ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-72 max-w-full rounded-sm align-middle" />}
        lead={series.data?.description ?? undefined}
      />

      {series.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label="Loading books…" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        ) : null
      ) : books.length === 0 ? (
        <EmptyState icon={Library} title="No books in this series yet" description="Check back soon." />
      ) : (
        <Stagger as="ol" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {books.map((book, index) => (
            <StaggerItem as="li" key={book.id} index={index} className="grid gap-2">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">Book {index + 1}</p>
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
