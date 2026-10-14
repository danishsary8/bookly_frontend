import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MessageSquareText } from "lucide-react";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Review } from "@/api/types";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { SkeletonGroup, SkeletonRow } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { orderDate } from "@/features/orders/format";
import { useT } from "@/i18n";

/*
 * Reviews on the book page: rating summary with a per-star breakdown, then the
 * reviews (newest / highest / lowest), 5 at a time with "Show more". Writing a
 * review comes with the orders phase (verified purchases only).
 */

type ReviewSort = "newest" | "highest" | "lowest";
const PAGE = 5;

function ReviewItem({ review }: { review: Review }) {
  const { dict, locale } = useT();
  return (
    <li className="grid gap-2 border-t border-border py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StarRating value={review.rating} summary={false} />
        <span className="font-semibold">{review.reviewer_name ?? dict.reviews.aReader}</span>
        {review.verified_purchase ? (
          <span className="inline-flex items-center gap-1 text-sm text-success">
            <BadgeCheck className="size-4" aria-hidden="true" /> {dict.reviews.verifiedPurchase}
          </span>
        ) : null}
        {review.created_at ? <time dateTime={review.created_at} className="text-sm text-muted-foreground">{orderDate(review.created_at, locale)}</time> : null}
      </div>
      {review.comment ? <p className="max-w-prose whitespace-pre-line leading-7 text-foreground">{review.comment}</p> : null}
    </li>
  );
}

export function ReviewsSection({ bookId }: { bookId: number }) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [shown, setShown] = useState(PAGE);
  const reviews = useQuery(catalogQueries.bookReviews(bookId, { sort, per_page: shown }));
  const summary = reviews.data?.meta.rating_summary;
  const total = summary?.count ?? 0;
  const { dict } = useT();
  const t = dict.reviews;

  if (reviews.isPending) {
    return (
      <SkeletonGroup label={t.loading} className="grid gap-6">
        <SkeletonRow thumb="none" />
        <SkeletonRow thumb="none" />
      </SkeletonGroup>
    );
  }
  if (reviews.isError && !reviews.data) return <InlineError error={reviews.error} onRetry={() => reviews.refetch()} />;

  if (total === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        headingLevel="h3"
        title={t.none}
        description={t.noneLead}
        className="py-6"
      />
    );
  }

  const list = reviews.data?.data ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
      <div className="grid content-start gap-4">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-5xl tabular-nums">{(summary?.average ?? 0).toFixed(1)}</span>
          <span className="text-muted-foreground">{t.outOf5}</span>
        </p>
        <StarRating value={summary?.average} count={total} size="lg" />
        <dl className="grid gap-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = summary?.distribution?.[String(star)] ?? 0;
            const pct = total ? Math.round((n / total) * 100) : 0;
            return (
              <div key={star} className="grid grid-cols-[3.5rem_1fr_2.5rem] items-center gap-3 text-sm">
                <dt className="text-muted-foreground">{t.stars(star)}</dt>
                <dd className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <span className="block h-full rounded-full bg-star" style={{ width: `${pct}%` }} />
                </dd>
                <dd className="text-right tabular-nums text-muted-foreground">
                  <span className="sr-only">{t.stars(star)}: </span>
                  {n}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      <div className="grid content-start gap-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold">
            {t.count(total)}
          </h3>
          <Select
            value={sort}
            onValueChange={(v) => {
              setSort(v as ReviewSort);
              setShown(PAGE);
            }}
          >
            <SelectTrigger aria-label={t.sort} className="h-11 w-44 text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="newest">{t.newest}</SelectItem>
              <SelectItem value="highest">{t.highest}</SelectItem>
              <SelectItem value="lowest">{t.lowest}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ul className={reviews.isPlaceholderData ? "opacity-60 transition-opacity" : undefined}>
          {list.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
        {list.length < (reviews.data?.meta.total ?? 0) ? (
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)} loading={reviews.isFetching} className="justify-self-start">
            {t.more}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
