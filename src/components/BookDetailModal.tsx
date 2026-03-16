import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CalendarDays, MessageSquareText, ShoppingCart, Star } from "lucide-react";
import Cookies from "js-cookie";

import Modal from "./ui/modal";
import { Button } from "./ui/button";
import type { Book } from "../types/book.types";
import { averageRating, loadBookReviews, saveBookReviews, type BookReview } from "../lib/reviews";

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
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    if (!book) return;
    setReviews(loadBookReviews(book.id));
    setFeedbackMessage("");
  }, [book]);

  const avgRating = useMemo(() => averageRating(reviews), [reviews]);
  const isLoggedIn = Boolean(Cookies.get("token"));

  if (!book) return null;

  const publishedLabel = book.published_date ? new Date(book.published_date).toLocaleDateString() : "N/A";

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setFeedbackMessage("Please login first to rate and review this book.");
      return;
    }
    if (!comment.trim()) {
      setFeedbackMessage("Please write a short feedback.");
      return;
    }

    const nextReview: BookReview = {
      id: `${Date.now()}`,
      rating,
      comment: comment.trim(),
      userLabel: "Customer",
      createdAt: new Date().toISOString()
    };

    const updated = [nextReview, ...reviews];
    setReviews(updated);
    saveBookReviews(book.id, updated);
    setComment("");
    setRating(5);
    setFeedbackMessage("Thanks for your feedback.");
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-[radial-gradient(circle_at_20%_15%,#fff4de_0%,#fef7ec_36%,#fff_100%)] p-5 sm:p-6 border-b xl:border-b-0 xl:border-r border-slate-200">
                <div className="rounded-2xl border border-orange-100 bg-white h-[22rem] lg:h-[25rem] p-6 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-orange-100/40 blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-amber-100/50 blur-2xl" />
                  <img
                    src={book.book_img}
                    alt={book.title}
                    className="relative z-10 max-h-full w-auto object-contain drop-shadow-[0_22px_30px_rgba(15,23,42,0.18)]"
                  />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Curated Pick
                  </span>
                  <span className="rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    Reader Favorite
                  </span>
                </div>
              </div>

              <div className="p-5 sm:p-6 flex flex-col justify-between gap-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-orange-600 font-bold">Editor Pick</p>
                  <h2 className="mt-2 text-3xl sm:text-4xl font-black leading-tight text-slate-900">{book.title}</h2>
                  <p className="mt-1.5 text-xl text-slate-600">by {book.author_name}</p>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[15px] leading-relaxed text-slate-700">
                      {book.description || "No description available for this book."}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Category</p>
                      <p className="mt-1 text-slate-900 font-semibold">{book.category_name}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Published</p>
                      <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
                        {publishedLabel}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Format</p>
                      <p className="mt-1 text-slate-900 font-semibold">Paperback</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500 font-semibold">Availability</p>
                      <p className="mt-1 text-slate-900 font-semibold inline-flex items-center gap-1.5">
                        <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                        {book.stock && book.stock > 0 ? "In stock" : "Available"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-slate-300 font-semibold">Price</p>
                    <p className="mt-1 text-4xl font-black leading-none">${Number(book.price).toFixed(2)}</p>
                  </div>
                  <Button
                    onClick={() => onAddToCart?.(book)}
                    className="h-11 px-6 rounded-xl bg-orange-500 text-white hover:bg-orange-600 font-semibold inline-flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                  <span className="text-lg font-bold text-slate-900">{avgRating > 0 ? avgRating.toFixed(1) : "0.0"} / 5</span>
                </div>
                <span className="text-sm text-slate-500">{reviews.length} review(s)</span>
              </div>

              <form onSubmit={handleSubmitFeedback} className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`h-10 w-10 rounded-lg border grid place-items-center transition ${
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
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your feedback about this book..."
                  className="w-full min-h-32 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-orange-200"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-slate-500 inline-flex items-center gap-1.5">
                    <MessageSquareText className="h-4 w-4" />
                    {isLoggedIn ? "Your review will be saved instantly." : "Login required to submit feedback."}
                  </span>
                  <Button type="submit" className="h-10 px-5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold">
                    Submit
                  </Button>
                </div>
              </form>

              {feedbackMessage && <p className="mt-3 text-sm font-semibold text-orange-700">{feedbackMessage}</p>}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <h4 className="text-sm uppercase tracking-[0.1em] text-slate-500 font-semibold">Customer Feedback</h4>
              <div className="mt-3 max-h-80 overflow-y-auto pr-1 space-y-2">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">{review.userLabel}</p>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className={`h-3.5 w-3.5 ${star <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                    No feedback yet. Be the first to rate this book.
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
