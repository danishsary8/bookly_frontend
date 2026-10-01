import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, Loader2, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";

import Modal from "./ui/modal";
import { Button } from "./ui/button";
import BookCoverImage from "./BookCoverImage";
import { MorphCover } from "./MorphCover";
import { StarRating } from "./StarRating";
import { StockBadge } from "./BookBadge";
import { TextAreaField } from "./form/Field";
import { getAccessToken } from "../lib/session";
import { useCoverMorphNavigate, useMorphLayoutId } from "../lib/coverMorph";
import { formatOrderDate, formatPrice, toNumber } from "../lib/format";
import bookService from "../services/book.service";
import type { Book, BookReview } from "../types/book.types";
import { alertToast } from "../lib/alerts";
import { cn } from "@/lib/utils";

/*
 * Quick view: a fast look at a book without leaving the list. Same behaviour as before
 * (reviews load + submit, add to cart, link to the full page), restyled to MASTER tokens.
 * "View full details" morphs this cover into the /books/:id cover.
 */

interface BookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onAddToCart?: (book: Book) => void;
}

const QuickViewCover = ({ book }: { book: Book }) => {
  const layoutId = useMorphLayoutId(book.id, `quickview-${book.id}`);
  return (
    <MorphCover layoutId={layoutId} className="mx-auto aspect-[2/3] w-full max-w-[240px] overflow-hidden rounded-sm bg-surface-2 shadow-overlay">
      <BookCoverImage src={book.book_img} alt={`${book.title} cover`} className="h-full w-full object-cover" iconClassName="h-9 w-9" />
    </MorphCover>
  );
};

const BookDetailModal = ({ isOpen, onClose, book, onAddToCart }: BookDetailModalProps) => {
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const morphTo = useCoverMorphNavigate();

  const isLoggedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (!book || !isOpen) return;
    let isMounted = true;
    setIsLoadingReviews(true);
    setLoadError("");
    bookService
      .getBookReviews(book.id)
      .then((data) => isMounted && setReviews(data))
      .catch((error: any) => {
        if (!isMounted) return;
        setReviews([]);
        setLoadError(error?.response?.data?.message || "Reviews didn't load. Try again later.");
      })
      .finally(() => isMounted && setIsLoadingReviews(false));
    return () => { isMounted = false; };
  }, [book, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setComment("");
      setCommentError("");
    }
  }, [isOpen]);

  const avgRating = useMemo(() => {
    if (reviews.length > 0) return reviews.reduce((sum, r) => sum + toNumber(r.rating), 0) / reviews.length;
    return toNumber(book?.average_rating);
  }, [book?.average_rating, reviews]);
  const reviewCount = reviews.length > 0 ? reviews.length : toNumber(book?.review_count);

  if (!book) return null;

  const published = formatOrderDate(book.published_date);

  const handleSubmitFeedback = async (event: FormEvent) => {
    event.preventDefault();
    if (!isLoggedIn) {
      alertToast.info("Sign in to review", "Reviews come from customers who bought the book.");
      return;
    }
    if (!comment.trim()) {
      setCommentError("Write a few words about the book.");
      return;
    }
    setCommentError("");
    try {
      setIsSubmittingReview(true);
      await bookService.submitBookReview(book.id, { rating, comment: comment.trim() });
      setReviews(await bookService.getBookReviews(book.id));
      setComment("");
      setRating(5);
      alertToast.success("Review saved", "Thanks! Your review is now on this book.");
    } catch (error: any) {
      alertToast.error("Couldn't save your review", error?.response?.data?.message || "Try again in a moment.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quick view" maxWidthClass="max-w-5xl" bodyClassName="p-0">
      <div className="max-h-[84vh] overflow-y-auto">
        <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-8">
          <div className="rounded-xl bg-surface-2 px-6 py-8">
            <QuickViewCover book={book} />
          </div>

          <div className="flex flex-col">
            {book.category_name ? <p className="eyebrow">{book.category_name}</p> : null}
            <h3 className="mt-3 text-[clamp(1.75rem,3vw,2.45rem)] leading-[1.1] text-foreground">{book.title}</h3>
            <p className="mt-2 text-lg text-muted-foreground">by <span className="font-semibold text-foreground">{book.author_name}</span></p>
            <StarRating value={avgRating} count={reviewCount} className="mt-3" />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <p className="text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">{formatPrice(book.price)}</p>
              {book.stock !== undefined && toNumber(book.stock) > 5 ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success"><span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />In stock</span>
              ) : (
                <StockBadge stock={book.stock === undefined ? undefined : toNumber(book.stock)} />
              )}
            </div>

            {book.description ? <p className="mt-5 line-clamp-5 max-w-[60ch] text-base leading-7 text-foreground">{book.description}</p> : null}
            {published ? <p className="mt-3 text-sm text-muted-foreground">Published {published}</p> : null}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <Button variant="cta" size="lg" onClick={() => onAddToCart?.(book)} disabled={book.stock !== undefined && toNumber(book.stock) <= 0}>
                <ShoppingCart aria-hidden="true" />
                Add to cart
              </Button>
              <Link
                to={`/books/${book.id}`}
                onClick={(e) => morphTo(e, book, `quickview-${book.id}`, onClose, true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-semibold text-primary underline-offset-4 hover:underline"
              >
                View full details
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-t border-border p-6 md:grid-cols-2 md:p-8">
          <section aria-labelledby="qv-reviews-title">
            <h4 id="qv-reviews-title" className="font-display text-[1.563rem] font-normal leading-tight text-foreground">Reader reviews</h4>
            <div className="mt-4 grid max-h-80 gap-3 overflow-y-auto pr-1">
              {isLoadingReviews ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading reviews…</p>
              ) : loadError ? (
                <p className="text-sm text-destructive">{loadError}</p>
              ) : reviews.length === 0 ? (
                <p className="text-muted-foreground">No reviews yet.</p>
              ) : (
                reviews.map((review) => (
                  <article key={review.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{review.customer_name}</p>
                      <StarRating value={toNumber(review.rating)} summary={false} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {formatOrderDate(review.updated_at || review.created_at)}
                      {review.is_verified_purchase ? <span className="inline-flex items-center gap-1 font-semibold text-success"><BadgeCheck className="h-4 w-4" aria-hidden="true" />Verified purchase</span> : null}
                    </p>
                    <p className="mt-2 text-base leading-7 text-foreground">{review.comment}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section aria-labelledby="qv-write-title">
            <h4 id="qv-write-title" className="font-display text-[1.563rem] font-normal leading-tight text-foreground">Write a review</h4>
            <form onSubmit={handleSubmitFeedback} noValidate className="mt-4 grid gap-4">
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">Your rating</legend>
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <label
                      key={star}
                      className={cn(
                        "grid h-11 w-11 cursor-pointer place-items-center rounded-lg border transition-[background-color,border-color,scale] duration-150 active:scale-95 motion-reduce:active:scale-100",
                        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background",
                        star <= rating ? "border-star bg-star/10" : "border-input hover:bg-secondary",
                      )}
                    >
                      <input type="radio" name="qv-rating" value={star} checked={rating === star} onChange={() => setRating(star)} className="sr-only" />
                      <Star className={cn("h-5 w-5", star <= rating ? "fill-star text-star" : "text-muted-foreground")} aria-hidden="true" />
                      <span className="sr-only">{star} {star === 1 ? "star" : "stars"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <TextAreaField
                label="Your review"
                value={comment}
                onChange={(e) => { setComment(e.target.value); if (commentError) setCommentError(""); }}
                error={commentError}
                hint={isLoggedIn ? "Reviews from verified purchases are marked as such." : "Sign in with the account you bought it on to post a review."}
              />
              <div>
                <Button type="submit" disabled={isSubmittingReview} aria-busy={isSubmittingReview}>
                  {isSubmittingReview ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                  {isSubmittingReview ? "Posting…" : "Post review"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default BookDetailModal;
