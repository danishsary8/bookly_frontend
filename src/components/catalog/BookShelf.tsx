import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard as Book } from "@/api/types";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { Button } from "@/components/ui/button";
import { InlineError } from "@/components/ui/error-state";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import { useAddToCart, useWishlist } from "./useCatalogActions";

/*
 * A titled row of book cards that scrolls sideways (scroll-snap) with Prev/Next
 * buttons, so several covers stay visible at once (MASTER §5, React Bits note).
 * Keyboard users tab through the cards (each link scrolls into view), so the
 * Prev/Next buttons are for pointer users and stay out of the tab order.
 */

type BookShelfProps = {
  id: string;
  title: string;
  eyebrow?: string;
  books: Book[] | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Rendered when loaded with no books; defaults to hiding the whole shelf. */
  empty?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function BookShelf({ id, title, eyebrow, books, loading, error, onRetry, seeAllHref, seeAllLabel = "See all", empty = null, action, className }: BookShelfProps) {
  const cart = useAddToCart();
  const wishlist = useWishlist();
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [books?.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: reduce ? "auto" : "smooth" });
  };

  if (!loading && !error && books && books.length === 0 && !empty) return null;

  const headingId = `${id}-heading`;
  const item = "w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-2.5rem)/3)] xl:w-[calc((100%-3.75rem)/4)]";

  return (
    <section aria-labelledby={headingId} className={cn("grid gap-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
              <span className="h-px w-12 bg-current" aria-hidden="true" />
              {eyebrow}
            </p>
          ) : null}
          <h2 id={headingId} className="mt-2 font-display text-[1.953rem] leading-tight">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {action}
          {seeAllHref ? (
            <Link to={seeAllHref} className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
              {seeAllLabel} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
          {books && books.length > 2 ? (
            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" size="icon" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label={`Scroll ${title} back`} tabIndex={-1}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scrollBy(1)} disabled={edges.end} aria-label={`Scroll ${title} forward`} tabIndex={-1}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <SkeletonGroup label={`Loading ${title.toLowerCase()}…`} className="flex gap-3 overflow-hidden sm:gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={item}>
              <BookCardSkeleton />
            </div>
          ))}
        </SkeletonGroup>
      ) : error ? (
        <InlineError error={error} onRetry={onRetry} />
      ) : books && books.length === 0 ? (
        empty
      ) : (
        <ul ref={scroller} className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-1 px-1 pb-2 pt-1 sm:gap-5">
          {(books ?? []).map((book, index) => (
            <li key={book.id} className={item}>
              <BookCard
                book={book}
                instanceKey={`${id}-${book.id}`}
                eager={index < 2}
                saved={wishlist.isSaved(book.id)}
                adding={cart.pendingBookId === book.id}
                onAddToCart={cart.add}
                onToggleWishlist={wishlist.toggle}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
