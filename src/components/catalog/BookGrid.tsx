import type { ReactNode } from "react";
import type { BookCard as Book } from "@/api/types";
import { BookCardSkeleton } from "@/components/BookCardSkeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import { useAddToCart, useWishlist } from "./useCatalogActions";

/*
 * Catalogue grid: 2 / 3 / 4 columns (MASTER §4), staggered entrance, wired to
 * add-to-cart and wishlist. `loading` shows card skeletons in the same grid so
 * nothing shifts when results arrive.
 */

const gridClass = "grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4";

type BookGridProps = {
  books: Book[];
  loading?: boolean;
  skeletonCount?: number;
  /** Shown instead of the grid when there are no books and nothing is loading. */
  empty?: ReactNode;
  headingLevel?: "h2" | "h3";
  /** Prefix for cover-morph instance keys when the same book can appear in two grids. */
  instancePrefix?: string;
  /** Dims the grid while a new page or filter loads over the previous results. */
  stale?: boolean;
  className?: string;
};

export function BookGrid({ books, loading = false, skeletonCount = 8, empty, headingLevel = "h3", instancePrefix = "grid", stale = false, className }: BookGridProps) {
  const cart = useAddToCart();
  const wishlist = useWishlist();

  if (loading) {
    return (
      <SkeletonGroup label="Loading books…" className={cn(gridClass, className)}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <BookCardSkeleton key={i} />
        ))}
      </SkeletonGroup>
    );
  }

  if (books.length === 0) return <>{empty}</>;

  return (
    <Stagger
      as="ul"
      key={books.map((b) => b.id).join(",")}
      className={cn(gridClass, "transition-opacity duration-150", stale && "opacity-60", className)}
    >
      {books.map((book, index) => (
        <StaggerItem as="li" key={book.id} index={index}>
          <BookCard
            book={book}
            instanceKey={`${instancePrefix}-${book.id}`}
            headingLevel={headingLevel}
            eager={index < 4}
            saved={wishlist.isSaved(book.id)}
            adding={cart.pendingBookId === book.id}
            onAddToCart={cart.add}
            onToggleWishlist={wishlist.toggle}
          />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
