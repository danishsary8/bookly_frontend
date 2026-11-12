import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { collectionQueries, collectionText } from "@/api/endpoints/collections";
import { ApiError } from "@/api/errors";
import { BookGrid } from "@/components/catalog/BookGrid";
import { CatalogueHeader } from "@/components/catalog/CatalogueHeader";
import { NotFoundState } from "@/components/catalog/NotFoundState";
import { RelatedShelf } from "@/components/catalog/RelatedShelf";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ui/error-state";
import { orderDate } from "@/features/orders/format";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useScrollMemory } from "@/hooks/useScrollMemory";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { useT } from "@/i18n";

/* /collections/:slug (pages/catalogue-v2.md §4): a seasonal collection ("Rainy season reads") with all its books in
   the admin's order, when it ends, a way back to every book, then books like these. */
export default function CollectionPage() {
  const slug = useParams().slug ?? "";
  const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug);
  const collection = useQuery({ ...collectionQueries.bySlug(slug), enabled: valid });
  const showSkeleton = useSkeletonVisible(collection.isPending);
  useScrollMemory(Boolean(collection.data));
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
  const ids = books.map((b) => b.id);
  return (
    <div className="container-shell pb-16">
      <CatalogueHeader
        variant="entity"
        crumbs={[{ label: p.home, to: "/" }, { label: p.books, to: "/books" }, { label: text?.title ?? c.eyebrow }]}
        eyebrow={c.eyebrow}
        title={text?.title ?? <span aria-hidden="true" className="skeleton inline-block h-10 w-72 max-w-full rounded-sm align-middle" />}
        blurb={text?.description}
        covers={books.map((b) => ({ src: b.cover_image_url, title: b.title }))}
        facts={
          collection.data ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{p.bookCount(collection.data.books_count)}</span>
              {ends ? <span className="text-muted-foreground">{c.endsOn(orderDate(ends, locale))}</span> : null}
              <Link to="/books" className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
                {dict.catalogue.seeAllBooks}
              </Link>
            </>
          ) : undefined
        }
      />
      <div className="grid gap-14">
        <BookGrid
          books={books}
          loading={collection.isPending && showSkeleton}
          headingLevel="h2"
          instancePrefix="collection"
          empty={collection.isPending ? null : <EmptyState icon={Sparkles} title={c.empty} description={p.checkBack} />}
        />
        {ids.length > 0 ? <RelatedShelf id={`collection-${slug}-similar`} title={dict.catalogue.moreLikeThese} source={{ kind: "similar", seeds: ids, exclude: ids }} /> : null}
      </div>
    </div>
  );
}
