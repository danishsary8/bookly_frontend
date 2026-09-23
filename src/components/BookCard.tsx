import { useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { Button } from "./ui/button";
import BookDetailModal from "./BookDetailModal";
import BookCoverImage from "./BookCoverImage";
import type { Book } from "../types/book.types";

interface BookCardProps extends Book {
  onAddToCart?: (book: Book) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const BookCard = ({
  id,
  title,
  author_name,
  price,
  book_img,
  category_name,
  description,
  published_date,
  average_rating,
  review_count,
  onAddToCart,
  isFavorite,
  onToggleFavorite
}: BookCardProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFavoriteInternal, setIsFavoriteInternal] = useState(false);
  const favoriteActive = typeof isFavorite === "boolean" ? isFavorite : isFavoriteInternal;

  return (
    <>
      <div
        onClick={() => setIsModalOpen(true)}
        className="group relative overflow-hidden rounded-2xl p-4 border border-border/50 bg-card hover:border-border/80 shadow-sm hover:shadow-sm-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      >
        {/* Subtle gradient accents */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-20 h-44 w-44 rounded-full bg-accent/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="mb-4 relative flex items-center justify-center h-48 overflow-hidden rounded-xl bg-card border border-border/60 group-hover:border-border/80">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) {
                onToggleFavorite();
              } else {
                setIsFavoriteInternal((prev) => !prev);
              }
            }}
            className={`absolute top-3 left-3 z-10 h-8 w-8 rounded-full border shadow-sm grid place-items-center transition-all duration-200 ${
              favoriteActive
                ? "bg-accent text-accent-foreground border-accent shadow-sm-lg"
                : "bg-card/90 backdrop-blur border-border/60 text-foreground/60 hover:text-accent hover:bg-card hover:border-border/80"
            }`}
            aria-label={favoriteActive ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`h-4 w-4 ${favoriteActive ? "fill-current" : ""}`} />
          </button>
          <span className="absolute right-3 top-3 rounded-lg bg-foreground/80 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-background opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Quick view
          </span>
          <BookCoverImage
            src={book_img}
            alt={title}
            author={author_name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            iconClassName="h-8 w-8"
          />
        </div>

        <div className="space-y-2.5 relative">
          <p className="inline-flex text-[10px] font-semibold py-1.5 px-2.5 rounded-full bg-primary/10 text-primary uppercase tracking-[0.1em]">
            {category_name}
          </p>
          <h1 className="mt-1 text-lg md:text-base lg:text-sm font-bold leading-tight text-foreground line-clamp-2 min-h-[2.8rem]">
            {title}
          </h1>
          <p className="text-sm text-foreground/70 line-clamp-1">by {author_name}</p>
          <div className="flex items-center gap-2 text-xs text-foreground/60">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {Number(average_rating ?? 0) > 0 ? Number(average_rating).toFixed(1) : "New"}
            </span>
            <span>{Number(review_count ?? 0)} review(s)</span>
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-border/50 flex items-end justify-between">
            <span className="text-[11px] text-foreground/60 uppercase tracking-[0.1em] font-medium">Price</span>
            <span className="text-lg font-bold text-accent">${Number(price).toFixed(2)}</span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.({ id, title, author_name, price, book_img, category_name, description: description || "", published_date });
          }}
          className="w-full mt-4 h-10 rounded-lg font-medium flex items-center justify-center gap-2 transition-all duration-200"
        >
          <ShoppingCart className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>

      <BookDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        book={{ id, title, author_name, price, book_img, category_name, description: description || "", published_date, average_rating, review_count }}
        onAddToCart={onAddToCart}
      />
    </>
  );
};

export default BookCard;
