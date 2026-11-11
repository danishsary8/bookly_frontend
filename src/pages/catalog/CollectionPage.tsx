import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { collectionQueries, collectionText } from "@/api/endpoints/collections";
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
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useT } from "@/i18n";

/* /collections/:slug: a seasonal collection ("Rainy season reads") with all its books, in the admin's order. */
export default function CollectionPage() {
  const slug = useParams().slug ?? "";
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const collection = useQuery({ ...collectionQueries.bySlug(slug), enabled: valid });
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const showSkeleton = useSkeletonVisible(collection.isPending);
  const { dict, lang, locale } = useT();
  const c = dict.collections;
  const p = dict.pages;
  const text = collection.data ? collectionText(collection.data, lang) : null;
  useDocumentTitle(text?.title, { description: text?.description ?? null });

  if (!valid || (collection.isError && ApiError.from(collection.error).kind === "not_found")) {
    return <NotFoundState what={c.what} backTo="/books" backLabel={dict.homePage.allBooks} />;
  }
  if (collection.isError) return <div className="container-shell py-16"><ErrorState error={collection.error} onRetry={() => collection.refetch()} headingLevel="h1" /></div>;

  const books = collection.data?.books ?? [];
  const ends = collection.data?.ends_at;
  return (
    <div className="container-shell pb-16">
      <PageHeader
        crumbs={[{ label: p.home, to: "/" }, { label: text?.title ?? c.eyebrow }]}
        eyebrow={collection.data ? c.pageEyebrow(collection.data.books_count) : c.eyebrow}
        title={text?.title ?? <span aria-hidden="true" className="skeleton inline-block h-12 w-72 max-w-full rounded-sm align-middle" />}
        lead={[text?.description, ends ? c.endsOn(orderDate(ends, locale)) : null].filter(Boolean).join(" · ") || undefined}
        variant="panel"
        covers={books.filter((b) => b.cover_image_url).slice(0, 5).map((b) => ({ src: b.cover_image_url, title: b.title }))}
      />

      {collection.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={p.loadingBooks} className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <BookCardSkeleton key={i} />
            ))}
          </SkeletonGroup>
        ) : null
      ) : books.length === 0 ? (
        <EmptyState icon={Sparkles} title={c.empty} description={p.checkBack} />
      ) : (
        <Stagger as="ul" className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
          {books.map((book, index) => (
            <StaggerItem as="li" key={book.id} index={index}>
              <BookCard
                book={book}
                instanceKey={`collection-${book.id}`}
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
