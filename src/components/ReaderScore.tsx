import { Star } from "lucide-react";
import type { BookCard } from "@/api/types";
import { StarRating } from "@/components/StarRating";
import { toNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * The rating line for a book card. Customer reviews win (stars + "4.5 (12)"). With none, the shop's Reader rating
 * shows as one star, the score and its source ("4.3 · Goodreads"), clearly labelled as coming from elsewhere.
 * With neither, nothing renders (no "No reviews yet" noise in rows).
 */
export function ReaderScore({ book, className }: { book: BookCard; className?: string }) {
  const { dict } = useT();
  const h = dict.homePage;
  if (toNumber(book.review_count) > 0 && toNumber(book.rating_avg) > 0) return <StarRating value={book.rating_avg} count={book.review_count} compact className={className} />;
  const score = toNumber(book.reader_rating);
  if (!(score > 0)) return null;
  const source = book.reader_rating_source || h.readers;
  return (
    <p className={cn("inline-flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Star className="size-4 fill-star text-star" aria-hidden="true" />
      <span className="sr-only">{h.readerRatingLabel(score.toFixed(1), source)}</span>
      <span aria-hidden="true">
        <span className="font-semibold tabular-nums text-foreground">{score.toFixed(1)}</span> · {source}
      </span>
    </p>
  );
}

