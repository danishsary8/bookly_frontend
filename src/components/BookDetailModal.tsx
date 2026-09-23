import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, LoaderCircle, MessageSquareText, ShoppingCart, Star } from "lucide-react";

import Modal from "./ui/modal";
import { Button } from "./ui/button";
import BookCoverImage from "./BookCoverImage";
import { getAccessToken } from "../lib/session";
import bookService from "../services/book.service";
import type { Book, BookReview } from "../types/book.types";
import { alertToast } from "../lib/alerts";

interface BookDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book | null;
  onAddToCart?: (book: Book) => void;
}

const BookDetailModal = ({ isOpen, onClose, book, onAddToCart }: BookDetailModalProps) => {
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isLoggedIn = Boolean(getAccessToken());

  useEffect(() => {
    if (!book || !isOpen) {
      return;
    }

    let isMounted = true;

    const loadReviews = async () => {
      try {
        setIsLoadingReviews(true);
        setReviewError("");
        const reviewData = await bookService.getBookReviews(book.id);
        if (isMounted) {
          setReviews(reviewData);
        }
      } catch (loadError: any) {
        if (isMounted) {
          setReviews([]);
          setReviewError(loadError?.response?.data?.message || "Unable to load customer reviews right now.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingReviews(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, [book, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setComment("");
      setReviewError("");
    }
  }, [isOpen]);

  const avgRating = useMemo(() => {
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      return total / reviews.length;
    }

    return Number(book?.average_rating ?? 0);
  }, [book?.average_rating, reviews]);

  const reviewCount = reviews.length > 0 ? reviews.length : Number(book?.review_count ?? 0);

  if (!book) {
    return null;
  }

  const publishedLabel = book.published_date ? new Date(book.published_date).toLocaleDateString() : "N/A";

  const handleSubmitFeedback = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!isLoggedIn) {
      alertToast.info("Login required", "Please login first to submit a verified review.");
      return;
    }

    if (!comment.trim()) {
      alertToast.warning("Review needed", "Please write a short review before submitting.");
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError("");

      await bookService.submitBookReview(book.id, {
        rating,
        comment: comment.trim(),
      });

      const refreshedReviews = await bookService.getBookReviews(book.id);
      setReviews(refreshedReviews);
      setComment("");
      setRating(5);
      alertToast.success("Review saved", "Your feedback has been added to this book.");
    } catch (submitError: any) {
      alertToast.error("Unable to save review", submitError?.response?.data?.message || "Please try again.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Details"
      maxWidthClass="max-w-6xl"
      bodyClassName="p-0 overflow-hidden"
    >
      <div className="max-h-[84vh] overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_20%_15%,#fff4de_0%,#fef7ec_36%,#fff_100%)] p-5 sm:p-6 xl:border-b-0 xl:border-r">
                <div className="relative flex h-[22rem] items-center justify-center overflow-hidden rounded-2xl border border-orange-100 bg-white p-6 lg:h-[25rem]">
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-100/50 blur-2xl" />
                  <BookCoverImage
                    src={book.book_img}
                    alt={book.title}
                    author={book.author_name}
                    className="relative z-10 max-h-full w-auto object-contain drop-shadow-[0_22px_30px_rgba(15,23,42,0.18)]"
                    iconClassName="h-9 w-9"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Curated Pick
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Reader Favorite
                  </span>
                </div>
              </div>

              <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-600">Editor Pick</p>
                  <h2 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">{book.title}</h2>
                  <p className="mt-1.5 text-xl text-slate-600">by {book.author_name}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {avgRating > 0 ? avgRating.toFixed(1) : "New"} rating
                    </span>
                    <span>{reviewCount} review(s)</span>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[15px] leading-relaxed text-slate-700">
                      {book.description || "No description available for this book."}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Category</p>
                      <p className="mt-1 font-semibold text-slate-900">{book.category_name}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Published</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-slate-900">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                        {publishedLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Format</p>
                      <p className="mt-1 font-semibold text-slate-900">Paperback</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Availability</p>
                      <p className="mt-1 inline-flex items-center gap-1.5 font-semibold text-slate-900">
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {book.stock && book.stock > 0 ? "In stock" : "Available"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl bg-slate-900 p-4 text-white sm:p-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">Price</p>
                    <p className="mt-1 text-4xl font-black leading-none">${Number(book.price).toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={() => onAddToCart?.(book)}
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 font-semibold text-white hover:bg-orange-600"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold text-slate-900">{avgRating > 0 ? avgRating.toFixed(1) : "0.0"} / 5</span>
                </div>
                <span className="text-sm text-slate-500">{reviewCount} review(s)</span>
              </div>

              <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`grid h-10 w-10 place-items-center rounded-lg border transition ${
                        star <= rating
                          ? "border-amber-300 bg-amber-50"
                          : "border-slate-200 bg-white hover:border-amber-200"
                      }`}
                      aria-label={`Rate ${star} stars`}
                    >
                      <Star className={`h-4 w-4 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Share your feedback about this book..."
                  className="min-h-32 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-orange-200"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                    <MessageSquareText className="h-4 w-4" />
                    {isLoggedIn
                      ? "Verified-purchase reviews are saved to the store database."
                      : "Login with a purchasing account to submit a review."}
                  </span>
                  <Button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="h-10 rounded-lg bg-orange-500 px-5 font-semibold text-white hover:bg-orange-600 disabled:opacity-70"
                  >
                    {isSubmittingReview ? "Saving..." : "Submit"}
                  </Button>
                </div>
              </form>

              {reviewError ? <p className="mt-2 text-sm font-semibold text-rose-700">{reviewError}</p> : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <h4 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">Customer Feedback</h4>
              <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {isLoadingReviews ? (
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading reviews...
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{review.customer_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{new Date(review.updated_at || review.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                            ))}
                          </div>
                          {review.is_verified_purchase ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
                              Verified purchase
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No reviews yet. Verified customer reviews will appear here.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
};

export default BookDetailModal;
