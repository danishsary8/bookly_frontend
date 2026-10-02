import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard as Book } from "@/api/types";
import { NewBadge, OutOfStockBadge } from "@/components/BookBadge";
import { MorphCover } from "@/components/MorphCover";
import SpotlightCard from "@/components/SpotlightCard";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { formatLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { BookCover } from "./BookCover";
import { useCoverMorphNavigate, useMorphLayoutId } from "./coverMorph";
import { isNewRelease } from "./bookMeta";

/*
 * MASTER §6.12: SpotlightCard shell → 2:3 cover (lift on hover) with up to two
 * badges and the wishlist heart → formats eyebrow → Gloock title → authors →
 * rating → price ("from" when formats differ) + add-to-cart. Title and cover
 * link to /books/:id with the cover morph. Out of stock: muted cover and price,
 * no cart button.
 */

type BookCardProps = {
  book: Book;
  /** Distinguishes two cards of the same book on one page (for the cover morph). */
  instanceKey?: string;
  saved?: boolean;
  adding?: boolean;
  onAddToCart?: (book: Book) => void;
  onToggleWishlist?: (book: Book) => void;
  /** Heading level of the title within the page outline. */
  headingLevel?: "h2" | "h3";
  eager?: boolean;
  className?: string;
};

export function BookCard({ book, instanceKey, saved = false, adding = false, onAddToCart, onToggleWishlist, headingLevel = "h3", eager, className }: BookCardProps) {
  const currency = useCurrency();
  const key = instanceKey ?? `card-${book.id}`;
  const layoutId = useMorphLayoutId(book.id, key);
  const morphTo = useCoverMorphNavigate();
  const href = `/books/${book.id}`;
  const outOfStock = book.in_stock === false;
  const authors = (book.authors ?? []).map((a) => a.name).filter(Boolean).join(", ");
  const formats = (book.formats ?? []).map(formatLabel).join(" · ");
  const Heading = headingLevel;
  const title = book.title ?? "Untitled";

  return (
    <SpotlightCard className={cn("group flex h-full flex-col rounded-xl border-border bg-card p-3", className)}>
      <div className="relative">
        <Link to={href} onClick={(e) => morphTo(e, book, key)} tabIndex={-1} aria-hidden="true" className="block">
          <MorphCover
            layoutId={layoutId}
            className={cn(
              "transition-[translate,box-shadow] duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lift motion-reduce:group-hover:translate-y-0",
              outOfStock && "saturate-50",
            )}
          >
            <BookCover src={book.cover_image_url} title={title} eager={eager} />
            {outOfStock ? <span className="absolute inset-0 bg-card/30" aria-hidden="true" /> : null}
          </MorphCover>
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {outOfStock ? <OutOfStockBadge className="bg-card/95" /> : isNewRelease(book.publish_date) ? <NewBadge /> : null}
        </div>

        {onToggleWishlist ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onToggleWishlist(book)}
            aria-pressed={saved}
            aria-label={`Save ${title} to your wishlist`}
            className={cn("absolute right-2 top-2 rounded-full border-transparent bg-card/95 shadow-sm hover:bg-card", saved ? "text-accent-text" : "text-foreground hover:text-accent-text")}
          >
            <Heart className={cn(saved && "fill-current")} aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        {formats ? <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.14em] text-accent-text">{formats}</p> : null}
        <Heading className="mt-1 font-display text-[1.125rem] leading-snug">
          <Link to={href} onClick={(e) => morphTo(e, book, key)} className="line-clamp-2 min-h-[2.75em] text-foreground underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
            {title}
          </Link>
        </Heading>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{authors ? `by ${authors}` : " "}</p>
        <StarRating value={book.rating_avg} count={book.review_count} className="mt-2" />

        <div className="mt-auto flex min-h-14 items-center justify-between gap-2 border-t border-border pt-3">
          <p className={cn("tabular-nums", outOfStock ? "text-muted-foreground" : "text-foreground")}>
            {(book.formats?.length ?? 0) > 1 ? <span className="mr-1 text-sm text-muted-foreground">from</span> : null}
            <span className="text-lg font-semibold">{formatMoney(book.price_from_usd, book.price_from_khr, currency)}</span>
          </p>
          {onAddToCart && !outOfStock ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onAddToCart(book)}
              disabled={adding}
              aria-busy={adding || undefined}
              aria-label={`Add ${title} to cart`}
              className="rounded-full"
            >
              {adding ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShoppingBag aria-hidden="true" />}
            </Button>
          ) : null}
        </div>
      </div>
    </SpotlightCard>
  );
}
