/** Published within the last 60 days (and not in the future by more than a day). */
export function isNewRelease(publishDate: string | null | undefined, now = Date.now()) {
  if (!publishDate) return false;
  const time = Date.parse(publishDate);
  if (Number.isNaN(time)) return false;
  const age = now - time;
  return age >= -86_400_000 && age <= 60 * 86_400_000;
}

export const authorNames = (authors: { name?: string }[] | undefined) =>
  (authors ?? []).map((a) => a.name).filter(Boolean).join(", ");

/** True when the book has any rating to show (its own reviews or the shop's Reader rating). */
export const hasScore = (book: { review_count?: unknown; rating_avg?: unknown; reader_rating?: unknown }) =>
  (Number(book.review_count) > 0 && Number(book.rating_avg) > 0) || Number(book.reader_rating) > 0;
