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
import { ScrollProgress } from "@/components/ScrollProgress";
import { useT } from "@/i18n";

/*
 * A titled row of book cards that scrolls sideways (scroll-snap) with Prev/Next buttons. It shows it scrolls:
 * the next card peeks in, the far edge fades, and a thin track under the row follows the position.
 * rows={2} stacks two rows that page together (MASTER §5; pages/home.md).
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
  /** 2 = two rows of cards that page sideways together (home "New arrivals"). */
  rows?: 1 | 2;
  /** Open the cart drawer after Add (catalogue pages). */
  openCartDrawer?: boolean;
};

export function BookShelf({ id, title, eyebrow, books, loading, error, onRetry, seeAllHref, seeAllLabel, empty = null, action, className, rows = 1, openCartDrawer = false }: BookShelfProps) {
  const { dict } = useT();
  const cart = useAddToCart({ openDrawer: openCartDrawer });
  const wishlist = useWishlist();
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const [bar, setBar] = useState({ size: 1, at: 0 });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
      const room = el.scrollWidth - el.clientWidth;
      setBar({ size: Math.min(1, el.clientWidth / Math.max(el.scrollWidth, 1)), at: room > 0 ? el.scrollLeft / room : 0 });
    };
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
  // Card widths leave a sliver of the next card showing, so the row reads as scrollable: 2.2 / 3.2 / 4.3 / 5.3 across.
  const width = "calc((100% - var(--gap) * var(--n)) / var(--per))";
  const cols = "[--gap:0.75rem] [--n:2] [--per:2.2] sm:[--gap:1.25rem] sm:[--n:3] sm:[--per:3.2] lg:[--n:4] lg:[--per:4.3] xl:[--n:5] xl:[--per:5.3]";
  const item = "shrink-0 snap-start";
  const scrollable = bar.size < 0.995;

  return (
    <section aria-labelledby={headingId} className={cn("grid gap-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
              {seeAllLabel ?? dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          ) : null}
          {books && books.length > 2 ? (
            <div className="hidden gap-2 sm:flex">
              <Button variant="outline" size="icon" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label={dict.cards.scrollBack(title)} tabIndex={-1}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => scrollBy(1)} disabled={edges.end} aria-label={dict.cards.scrollForward(title)} tabIndex={-1}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <SkeletonGroup label={dict.cards.loadingShelf(title)} className="flex gap-3 overflow-hidden sm:gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="w-[calc((100%-0.75rem)/2)] shrink-0 sm:w-[calc((100%-2.5rem)/3)] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]">
              <BookCardSkeleton />
            </div>
          ))}
        </SkeletonGroup>
      ) : error ? (
        <InlineError error={error} onRetry={onRetry} />
      ) : books && books.length === 0 ? (
        empty
      ) : (
        <div className="grid gap-4">
          <ul
            ref={scroller}
            style={rows === 2 ? { gridAutoColumns: width } : undefined}
            className={cn(
              "shelf-row no-scrollbar -mx-1 snap-x snap-mandatory gap-(--gap) overflow-x-auto scroll-px-1 px-1 pb-2 pt-2",
              cols,
              rows === 2 ? "grid grid-flow-col grid-rows-2 gap-y-8" : "flex",
              scrollable && !edges.end && "shelf-row-more",
              scrollable && !edges.start && "shelf-row-less",
            )}
          >
            {(books ?? []).map((book, index) => (
              <li key={book.id} className={item} style={rows === 2 ? undefined : { width }}>
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
          {/* Where you are in the row: a thin track whose thumb follows the scroll. */}
          <ScrollProgress bar={bar} />
        </div>
      )}
    </section>
  );
}
