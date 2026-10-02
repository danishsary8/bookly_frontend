import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { accountQueries } from "@/api/endpoints/account";
import { BookGrid } from "@/components/catalog/BookGrid";
import { EmptyState } from "@/components/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { AccountSection } from "@/features/account/AccountSection";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { rangeSummary } from "@/lib/pagination";

const PER_PAGE = 24;

/*
 * /account/wishlist: saved books as catalogue cards (the heart removes, with Undo
 * in the toast; the bag adds to cart). The page number lives in the URL.
 */
export default function WishlistPage() {
  useDocumentTitle("Wishlist");
  const [params] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const wishlist = useQuery({ ...accountQueries.wishlist({ page, per_page: PER_PAGE }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(wishlist.isPending);
  const meta = wishlist.data?.meta;

  return (
    <AccountSection title="Wishlist" lead={meta && meta.total ? rangeSummary(meta.from, meta.to, meta.total, meta.total === 1 ? "book" : "books") : "Books you've saved for later."}>
      {wishlist.isError && !wishlist.data ? (
        <ErrorState error={wishlist.error} onRetry={() => wishlist.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : (
        <BookGrid
          books={wishlist.data?.data ?? []}
          loading={wishlist.isPending && showSkeleton}
          stale={wishlist.isPlaceholderData}
          headingLevel="h2"
          instancePrefix="wishlist"
          className="md:grid-cols-3 xl:grid-cols-3"
          empty={
            wishlist.isPending ? null : (
              <EmptyState
                icon={Heart}
                title="Nothing saved yet"
                description="Tap the heart on any book to keep it here for later."
                action={
                  <Link to="/books" className={buttonVariants()}>
                    Discover books
                  </Link>
                }
                className="rounded-xl border border-dashed border-border"
              />
            )
          }
        />
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={(p) => (p > 1 ? `?page=${p}` : "?")} className="mt-4" />
    </AccountSection>
  );
}
