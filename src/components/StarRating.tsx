import { cn } from "@/lib/utils";
import { toNumber } from "@/lib/format";

/*
 * MASTER §6.4: five stars at 16px (cards) / 20px (detail), --star fill, outline
 * empties in --input, halves clipped. The stars are one role="img" with a spoken
 * label; the number and count follow as real text. No reviews → "No reviews yet".
 */

const STAR = "M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z";

interface StarRatingProps {
  value: unknown;
  count?: unknown;
  size?: "sm" | "lg";
  /** false = stars only (a single review's rating), no "4.5 · 12 reviews" text. */
  summary?: boolean;
  className?: string;
}

export const StarRating = ({ value, count, size = "sm", summary = true, className }: StarRatingProps) => {
  const rating = Math.max(0, Math.min(5, toNumber(value)));
  const reviews = Math.trunc(toNumber(count));
  const px = size === "lg" ? 20 : 16;

  if (summary && (!reviews || rating <= 0)) {
    return <p className={cn("text-sm text-muted-foreground", className)}>No reviews yet</p>;
  }

  const rounded = Math.round(rating * 2) / 2;

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      <span role="img" aria-label={`Rated ${rating.toFixed(1)} out of 5`} className="inline-flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = rounded >= i + 1 ? 100 : rounded >= i + 0.5 ? 50 : 0;
          return (
            <span key={i} className="relative inline-block" style={{ width: px, height: px }}>
              <svg viewBox="0 0 24 24" className="absolute inset-0 h-full w-full fill-none stroke-input" strokeWidth={1.5} aria-hidden="true"><path d={STAR} strokeLinejoin="round" /></svg>
              {fill > 0 ? (
                <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill}%` }}>
                  <svg viewBox="0 0 24 24" className="h-full fill-star stroke-star" style={{ width: px }} strokeWidth={1.5} aria-hidden="true"><path d={STAR} strokeLinejoin="round" /></svg>
                </span>
              ) : null}
            </span>
          );
        })}
      </span>
      {summary ? <span>
        <span className="font-semibold tabular-nums text-foreground">{rating.toFixed(1)}</span>
        <span aria-hidden="true"> · </span>
        <span className="tabular-nums">{reviews}</span> {reviews === 1 ? "review" : "reviews"}
      </span> : null}
    </div>
  );
};
