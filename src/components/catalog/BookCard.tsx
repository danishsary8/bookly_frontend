import { Heart, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard as Book } from "@/api/types";
import { LowStockBadge, NewBadge, OutOfStockBadge } from "@/components/BookBadge";
import { MorphCover } from "@/components/MorphCover";
import { OfferBadge } from "@/features/offers/offerText";
import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils";
import { formatMoney, useCurrency } from "@/stores/currency";
import { BookCover } from "./BookCover";
import { useCoverMorphNavigate, useMorphLayoutId } from "./coverMorph";
import { isNewRelease } from "./bookMeta";
import { formatName, useT } from "@/i18n";

/*
 * Book card (pages/home.md "Book card"): frameless and editorial. The 2:3 cover is the card, with a soft
 * shadow, spine hinge and gloss, and lifts on hover; the wishlist heart and an "Add" pill slide in on hover or
 * focus (always shown on touch screens) → formats eyebrow → title → authors → rating · price ("from" when formats differ). An automatic offer adds
 * a Sale-shaped tag ("Buy 2, save 15%") at the bottom-left of the cover (clear of the heart). Title and cover
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
  const { dict } = useT();
  const formats = (book.formats ?? []).map((f) => formatName(dict, f)).join(" · ");
  const audienceTag = book.level ? book.level : book.school_grade ? dict.catalogFilters.gradeN(book.school_grade) : null;
  const Heading = headingLevel;
  const title = book.title ?? dict.cards.untitled;

  const reveal = "opacity-0 transition-[opacity,translate] duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100";

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <div className="relative">
        <Link to={href} onClick={(e) => morphTo(e, book, key)} tabIndex={-1} aria-hidden="true" className="block">
          <MorphCover
            layoutId={layoutId}
            className={cn(
              "overflow-hidden rounded-lg shadow-[0_1px_2px_rgb(20_16_10/0.08),0_18px_30px_-20px_rgb(20_16_10/0.45)] transition-[translate,box-shadow] duration-300 ease-out",
              "group-hover:-translate-y-1.5 group-hover:shadow-[0_2px_4px_rgb(20_16_10/0.08),0_28px_44px_-22px_rgb(20_32_122/0.45)] motion-reduce:group-hover:translate-y-0",
              outOfStock && "saturate-50",
            )}
          >
            <BookCover src={book.cover_image_url} title={title} eager={eager} />
            {/* spine hinge + soft gloss, so every cover reads as a real book */}
            <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.18)_0_2%,rgb(255_255_255/0.16)_3%,transparent_8%),linear-gradient(120deg,rgb(255_255_255/0.12),transparent_45%)]" aria-hidden="true" />
            {outOfStock ? <span className="absolute inset-0 bg-card/30" aria-hidden="true" /> : null}
          </MorphCover>
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {outOfStock ? <OutOfStockBadge className="bg-card/95" /> : isNewRelease(book.publish_date) ? <NewBadge /> : null}
          {book.low_stock_remaining ? <LowStockBadge remaining={book.low_stock_remaining} /> : null}
        </div>
        {outOfStock ? null : (
          <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex transition-opacity duration-200 group-hover:opacity-0 [@media(hover:none)]:hidden">
            <OfferBadge offer={book.offer} className="max-w-full overflow-hidden text-ellipsis tracking-[0.06em]" />
          </div>
        )}

        {onToggleWishlist ? (
          <button
            type="button"
            onClick={() => onToggleWishlist(book)}
            aria-pressed={saved}
            aria-label={dict.cards.saveToWishlist(title)}
            className={cn(
              "absolute right-2 top-2 grid size-10 place-items-center rounded-full bg-card/95 shadow-sm backdrop-blur-sm transition-[opacity,color,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              saved ? "text-accent-text opacity-100" : cn("text-foreground hover:text-accent-text", reveal),
            )}
          >
            <Heart className={cn("size-[18px]", saved && "fill-current")} aria-hidden="true" />
          </button>
        ) : null}

        {onAddToCart && !outOfStock ? (
          <button
            type="button"
            onClick={() => onAddToCart(book)}
            disabled={adding}
            aria-busy={adding || undefined}
            aria-label={dict.cards.addToCart(title)}
            className={cn(
              "absolute bottom-2 right-2 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-md transition-[opacity,translate,filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-80",
              "translate-y-1 group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:size-10 [@media(hover:none)]:px-0",
              adding ? "opacity-100" : reveal,
            )}
          >
            {adding ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ShoppingBag className="size-4" aria-hidden="true" />}
            <span className="[@media(hover:none)]:hidden" aria-hidden="true">{dict.cards.add}</span>
          </button>
        ) : null}
      </div>

      <div className="mt-3.5 flex flex-1 flex-col px-0.5">
        {formats || audienceTag ? (
          <div className="flex items-center justify-between gap-1.5">
            {formats ? <p className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-text">{formats}</p> : <span />}
            {audienceTag ? <span className="shrink-0 rounded bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{audienceTag}</span> : null}
          </div>
        ) : null}
        <Heading className="mt-1 font-display text-[1.125rem] leading-snug">
          <Link to={href} onClick={(e) => morphTo(e, book, key)} className="line-clamp-2 text-foreground underline-offset-4 outline-none hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
            {title}
          </Link>
        </Heading>
        <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{authors ? dict.homePage.by(authors) : " "}</p>

        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div className="min-w-0">
            <StarRating value={book.rating_avg} count={book.review_count} compact />
            {book.sold_count ? <p className="mt-0.5 text-xs text-muted-foreground">{dict.shopExtras.sold(book.sold_count)}</p> : null}
          </div>
          <p className={cn("shrink-0 text-right tabular-nums", outOfStock ? "text-muted-foreground" : "text-foreground")}>
            {(book.formats?.length ?? 0) > 1 ? <span className="block text-[11px] leading-none text-muted-foreground">{dict.cards.from}</span> : null}
            <span className="text-base font-semibold leading-tight">{formatMoney(book.price_from_usd, book.price_from_khr, currency)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
