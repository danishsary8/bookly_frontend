import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, PenLine, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { orderQueries } from "@/api/endpoints/orders";
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
  const page = Math.max(1, Number(params.get("page")) || 1);
  const reviews = useQuery({ ...orderQueries.myReviews({ page, per_page: PER_PAGE }), placeholderData: (previous) => previous });
  const showSkeleton = useSkeletonVisible(reviews.isPending);
  const { ask, dialog } = useDeleteReview();
  const meta = reviews.data?.meta;
  const list = reviews.data?.data ?? [];

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
              <li key={review.id} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link to={`/books/${bookId}`} className="font-semibold underline-offset-4 hover:underline">
                    {review.book?.title ?? a.bookGone}
                  </Link>
                  <span className="text-sm text-muted-foreground">{orderDate(review.updated_at ?? review.created_at, locale)}</span>
                </div>
                <StarRating value={review.rating} summary={false} />
                {review.comment ? <p className="whitespace-pre-line text-[15px]">{review.comment}</p> : null}
                {review.is_visible === false ? <HiddenReviewNote /> : null}
                <div className="flex flex-wrap gap-2">
                  <Link to={`/books/${bookId}#your-review`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                    <PenLine aria-hidden="true" /> {dict.ui.edit}
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => ask(review)}>
                    <Trash2 aria-hidden="true" /> {dict.ui.delete}
                  </Button>
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
