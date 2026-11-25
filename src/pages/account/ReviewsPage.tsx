import { accountPage, useAccountPageBounds } from "@/features/account/pagination";
import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, PenLine, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { orderQueries } from "@/api/endpoints/orders";
import { BookCover } from "@/components/catalog/BookCover";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Pagination } from "@/components/ui/pagination";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { AccountSection } from "@/features/account/AccountSection";
import { orderDate } from "@/features/orders/format";
import { HiddenReviewNote } from "@/features/reviews/YourReview";
import { useDeleteReview } from "@/features/reviews/useDeleteReview";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import useSkeletonVisible from "@/hooks/useSkeletonVisible";
import { cn } from "@/lib/utils";
import { rangeText, useT } from "@/i18n";

const PER_PAGE = 10;

/*
 * /account/reviews: everything the customer has reviewed, including reviews the
 * shop has hidden (marked). Edit happens on the book page, where the review lives.
 */
export default function ReviewsPage() {
  const { dict, locale } = useT();
  const a = dict.account;
  useDocumentTitle(a.reviewsDocTitle);
  const [params] = useSearchParams();
  const page = accountPage(params.get("page"));
  const reviews = useQuery({ ...orderQueries.myReviews({ page, per_page: PER_PAGE }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(reviews.isPending);
  const { ask, dialog } = useDeleteReview();
  const meta = reviews.data?.meta;
  useAccountPageBounds(meta, reviews.isPlaceholderData);
  const list = reviews.data?.data ?? [];
  // Reviews carry only the book's id and title; one request for this page's books gives each review its cover.
  const ids = [...new Set(list.map((r) => r.book?.id ?? r.book_id).filter((id): id is number => typeof id === "number"))];
  const books = useQuery({ ...catalogQueries.books({ ids: ids.join(","), per_page: ids.length || 1 }), enabled: ids.length > 0 });
  const covers = new Map((books.data?.data ?? []).map((b) => [b.id, b.cover_image_url]));

  return (
    <AccountSection
      title={a.reviews}
      lead={meta && meta.total ? rangeText(dict, meta.from, meta.to, meta.total, dict.nouns.review(meta.total)) : a.reviewsLead}
    >
      {reviews.isError && !reviews.data ? (
        <ErrorState error={reviews.error} onRetry={() => reviews.refetch()} headingLevel="h2" showHomeLink={false} />
      ) : reviews.isPending ? (
        showSkeleton ? (
          <SkeletonGroup label={a.loadingReviews} className="grid gap-3">
            <SkeletonRow thumb="none" />
            <SkeletonRow thumb="none" />
          </SkeletonGroup>
        ) : null
      ) : list.length === 0 ? (
        <EmptyState
          icon={MessageSquareText}
          title={a.noReviews}
          description={a.noReviewsLead}
          action={
            <Link to="/account/orders?status=delivered" className={buttonVariants({ variant: "outline" })}>
              {a.deliveredOrders}
            </Link>
          }
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul className={cn("grid gap-3", reviews.isPlaceholderData && "opacity-60 transition-opacity")} aria-label={a.yourReviews}>
          {list.map((review) => {
            const bookId = review.book?.id ?? review.book_id;
            return (
              <li key={review.id} className="account-review shop-card flex gap-4 rounded-2xl border border-border bg-card p-4 sm:gap-5 sm:p-5">
                <Link to={`/books/${bookId}`} tabIndex={-1} aria-hidden="true" className="w-14 shrink-0 self-start overflow-hidden rounded-[3px] shadow-[0_10px_18px_-12px_rgb(20_16_10/0.6)] sm:w-16">
                  <BookCover src={bookId ? covers.get(bookId) : null} title={review.book?.title ?? ""} />
                </Link>
                <div className="grid min-w-0 flex-1 content-start gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                    <Link to={`/books/${bookId}`} className="font-display text-[1.15rem] leading-snug underline-offset-4 hover:underline">
                      {review.book?.title ?? a.bookGone}
                    </Link>
                    <span className="text-sm text-muted-foreground">{orderDate(review.updated_at ?? review.created_at, locale)}</span>
                  </div>
                  <StarRating value={review.rating} summary={false} />
                  {review.comment ? <p className="whitespace-pre-line text-[15px] leading-relaxed">{review.comment}</p> : null}
                  {review.is_visible === false ? <HiddenReviewNote /> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link to={`/books/${bookId}#your-review`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <PenLine aria-hidden="true" /> {dict.ui.edit}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => ask(review)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 aria-hidden="true" /> {dict.ui.delete}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={meta?.current_page ?? 1} lastPage={meta?.last_page ?? 1} hrefFor={(p) => (p > 1 ? `?page=${p}` : "?")} className="mt-4" />
      {dialog}
    </AccountSection>
  );
}
