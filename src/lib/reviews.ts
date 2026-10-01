export interface BookReview {
  id: string;
  rating: number;
  comment: string;
  userLabel: string;
  createdAt: string;
}

const reviewKey = (bookId: number) => `bookly:reviews:${bookId}`;

export const loadBookReviews = (bookId: number): BookReview[] => {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(reviewKey(bookId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((review) => typeof review?.rating === "number" && typeof review?.comment === "string");
  } catch {
    return [];
  }
};

export const saveBookReviews = (bookId: number, reviews: BookReview[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(reviewKey(bookId), JSON.stringify(reviews));
};

export const averageRating = (reviews: BookReview[]): number => {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
};

