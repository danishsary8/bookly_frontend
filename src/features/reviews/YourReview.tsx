import { useEffect, useRef, useState } from "react";
import { EyeOff, PenLine, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { orderDate } from "@/features/orders/format";
import { withNext } from "@/lib/forms";
import { ReviewForm } from "./ReviewForm";
import { useDeleteReview } from "./useDeleteReview";
import { useReviewState } from "./useReviews";

export function HiddenReviewNote() {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <EyeOff className="size-4" aria-hidden="true" /> Hidden by our team: only you can see it.
    </p>
  );
}

/*
 * The customer's own review of this book at the top of the Reviews tab: theirs
 * with Edit / Delete, a "Write a review" button once they've received the book,
 * or a short note on when they can. #your-review links (from an order) scroll here.
 */
export function YourReview({ bookId }: { bookId: number }) {
  const state = useReviewState(bookId);
  const [editing, setEditing] = useState(false);
  const { ask, dialog } = useDeleteReview();
  const { pathname, hash } = useLocation();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (hash === "#your-review" && !state.loading) ref.current?.scrollIntoView({ block: "start" });
  }, [hash, state.loading]);

  if (!state.signedIn) {
    return (
      <p className="text-[15px] text-muted-foreground">
        Bought this book?{" "}
        <Link to={withNext("/login", `${pathname}#your-review`)} className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in to review it
        </Link>
      </p>
    );
  }
  if (!state.verified) return null;

  const body = () => {
    if (state.loading) return <Skeleton className="h-11 w-48" />;
    if (state.error) return <InlineError error={state.error} onRetry={state.retry} />;
    if (editing) return <ReviewForm bookId={bookId} review={state.review} onDone={() => setEditing(false)} />;
    if (state.review) {
      const r = state.review;
      return (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StarRating value={r.rating} summary={false} size="lg" />
            <span className="text-sm text-muted-foreground">{orderDate(r.updated_at ?? r.created_at)}</span>
          </div>
          {r.comment ? <p className="whitespace-pre-line">{r.comment}</p> : <p className="text-muted-foreground">No comment, just a rating.</p>}
          {r.is_visible === false ? <HiddenReviewNote /> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <PenLine aria-hidden="true" /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => ask(r)}>
              <Trash2 aria-hidden="true" /> Delete
            </Button>
          </div>
        </div>
      );
    }
    if (state.canWrite) {
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setEditing(true)}>
            <PenLine aria-hidden="true" /> Write a review
          </Button>
          <span className="text-sm text-muted-foreground">You've received this book: tell other readers what you thought.</span>
        </div>
      );
    }
    return (
      <p className="text-[15px] text-muted-foreground">
        You can review this book once an order with it has been delivered.{" "}
        <Link to="/account/reviews" className="font-semibold text-primary underline-offset-4 hover:underline">
          Your reviews
        </Link>
      </p>
    );
  };

  return (
    <section id="your-review" ref={ref} aria-labelledby="your-review-title" className="scroll-mt-[calc(var(--header-h)+1rem)] grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 id="your-review-title" className="font-display text-[1.563rem] leading-tight">
        {editing && !state.review ? "Write a review" : "Your review"}
      </h3>
      {body()}
      {dialog}
    </section>
  );
}
