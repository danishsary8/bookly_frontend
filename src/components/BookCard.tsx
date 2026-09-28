import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Heart, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import BookDetailModal from "./BookDetailModal";
import BookCoverImage from "./BookCoverImage";
import SpotlightCard from "./SpotlightCard";
import { MorphCover } from "./MorphCover";
import { StarRating } from "./StarRating";
import { useCoverMorphNavigate, useMorphLayoutId } from "../lib/coverMorph";
import { formatPrice } from "../lib/format";
import type { Book } from "../types/book.types";
import { cn } from "@/lib/utils";

/*
 * MASTER §6.12 book card. Cover and title link to /books/:id (with the shared cover
 * morph); "Quick view" is an explicit button (shown on hover or keyboard focus) that
 * opens the existing quick-view modal. Heart and cart are 44×44 icon buttons.
 */

interface BookCardProps extends Book {
  onAddToCart?: (book: Book) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const BookCard = (props: BookCardProps) => {
  const { id, title, author_name, price, book_img, category_name, description, published_date, average_rating, review_count, onAddToCart, isFavorite, onToggleFavorite } = props;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFavoriteInternal, setIsFavoriteInternal] = useState(false);
  const favoriteActive = typeof isFavorite === "boolean" ? isFavorite : isFavoriteInternal;
  const instanceKey = `card-${id}`;
  const layoutId = useMorphLayoutId(id, instanceKey);
  const morphTo = useCoverMorphNavigate();
  const book: Book = { id, title, author_name, price, book_img, category_name, description: description || "", published_date, average_rating, review_count };
  const href = `/books/${id}`;

  return (
    <>
      <SpotlightCard className="group flex h-full flex-col rounded-xl border-border bg-card p-3 transition-[box-shadow,translate] duration-200 hover:-translate-y-1 hover:shadow-lift motion-reduce:hover:translate-y-0">
        <div className="relative">
          <Link to={href} onClick={(e) => morphTo(e, book, instanceKey)} tabIndex={-1} aria-hidden="true" className="block">
            <MorphCover layoutId={layoutId} className="aspect-[2/3] overflow-hidden rounded-sm bg-surface-2">
              <BookCoverImage src={book_img} alt="" className="h-full w-full object-cover" iconClassName="h-8 w-8" />
            </MorphCover>
          </Link>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => (onToggleFavorite ? onToggleFavorite() : setIsFavoriteInternal((prev) => !prev))}
            aria-pressed={favoriteActive}
            aria-label={favoriteActive ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
            className={cn("absolute right-2 top-2 z-10 rounded-full border-transparent bg-card/95 shadow-sm", favoriteActive ? "text-accent-text" : "text-foreground hover:text-accent-text")}
          >
            <Heart className={cn(favoriteActive && "fill-current")} aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="absolute inset-x-2 bottom-2 z-10 bg-card/95 opacity-0 shadow-sm transition-opacity duration-150 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:hidden"
            aria-label={`Quick view: ${title}`}
          >
            <Eye aria-hidden="true" />
            Quick view
          </Button>
        </div>

        <div className="mt-3 flex flex-1 flex-col">
          {category_name ? <p className="line-clamp-1 text-xs font-semibold uppercase tracking-[0.16em] text-accent-text">{category_name}</p> : null}
          <h2 className="mt-1 font-display text-[1.125rem] leading-snug">
            <Link to={href} onClick={(e) => morphTo(e, book, instanceKey)} className="line-clamp-2 min-h-[2.75em] text-foreground underline-offset-4 hover:underline">
              {title}
            </Link>
          </h2>
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">by {author_name}</p>
          <StarRating value={average_rating} count={review_count} className="mt-2" />

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-lg font-semibold tabular-nums text-foreground">{formatPrice(price)}</p>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onAddToCart?.(book)}
              aria-label={`Add ${title} to cart`}
              className="rounded-full"
            >
              <ShoppingCart aria-hidden="true" />
            </Button>
          </div>
        </div>
      </SpotlightCard>

      <BookDetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} book={book} onAddToCart={onAddToCart} />
    </>
  );
};

export default BookCard;
