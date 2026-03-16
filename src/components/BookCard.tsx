import { useState } from "react";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import BookDetailModal from "./BookDetailModal";
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
        className="group relative overflow-hidden rounded-[1.8rem] p-4 border border-orange-100/70 bg-gradient-to-b from-white via-amber-50/40 to-rose-50/35 shadow-[0_14px_30px_rgba(15,23,42,0.10)] hover:shadow-[0_24px_50px_rgba(249,115,22,0.24)] transition-all duration-300 hover:-translate-y-1 cursor-pointer"
      >
        <div className="absolute -top-20 -right-20 h-44 w-44 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-36 w-36 rounded-full bg-rose-200/30 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="mb-4 relative flex items-center justify-center h-48 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-white border border-orange-100/70">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleFavorite) {
                onToggleFavorite();
              } else {
                setIsFavoriteInternal((prev) => !prev);
              }
            }}
            className={`absolute top-3 left-3 z-10 h-9 w-9 rounded-full border shadow-sm grid place-items-center transition-all ${
              favoriteActive
                ? "bg-rose-500 border-rose-500 text-white shadow-[0_10px_22px_rgba(244,63,94,0.35)]"
                : "bg-white/90 backdrop-blur border-white text-slate-500 hover:text-rose-500 hover:bg-white hover:border-rose-200"
            }`}
            aria-label={favoriteActive ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`h-4 w-4 ${favoriteActive ? "fill-current" : ""}`} />
          </button>
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] text-white opacity-0 group-hover:opacity-100 transition-opacity">
            Quick view
          </span>
          <img
            src={book_img}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>

        <div className="space-y-2 relative">
          <p className="inline-flex text-[11px] font-bold py-1 px-3 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white uppercase tracking-[0.09em]">
            {category_name}
          </p>
          <h1 className="mt-1 text-[2rem] md:text-[1.9rem] lg:text-[1.6rem] font-extrabold leading-[1.1] text-slate-900 line-clamp-2 min-h-[3.6rem]">
            {title}
          </h1>
          <p className="text-[15px] text-slate-600 line-clamp-1">by {author_name}</p>

          <div className="pt-2.5 mt-2.5 border-t border-orange-100/90">
            <div className="flex items-end justify-between">
              <span className="text-[12px] text-slate-500 uppercase tracking-[0.12em]">Price</span>
              <span className="text-[1.8rem] leading-none text-orange-700 font-black">${Number(price).toFixed(2)}</span>
            </div>
          </div>
        </div>

        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.({ id, title, author_name, price, book_img, category_name, description: description || "", published_date });
          }}
          className="w-full mt-4 h-11 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 text-white hover:from-slate-800 hover:to-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.22)] font-semibold text-base tracking-wide flex items-center justify-center gap-2 transition-colors"
        >
          <ShoppingCart className="h-4 w-4 text-amber-300" />
          Add to Cart
        </Button>
      </div>

      <BookDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        book={{ id, title, author_name, price, book_img, category_name, description: description || "", published_date }}
        onAddToCart={onAddToCart}
      />
    </>
  );
};

export default BookCard;
