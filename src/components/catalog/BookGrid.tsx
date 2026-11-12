import type { ReactNode } from "react";
import type { BookCard as Book } from "@/api/types";
import { BookCardSkeletonFrameless } from "@/components/BookCardSkeleton";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BookCard } from "./BookCard";
import { useAddToCart, useWishlist } from "./useCatalogActions";
import { useT } from "@/i18n";

/*
 * Catalogue grid: 2 / 3 / 4 columns (MASTER §4), staggered entrance, wired to
 * add-to-cart (which opens the cart drawer) and wishlist. `loading` shows card
 * skeletons in the same grid so nothing shifts when results arrive. Series,
 * collection and reading-list pages use the same grid: `ordered` makes it a
 * numbered list, `above` / `below` add a line over or under a card (the volume
 * number, a list owner's note).
 */

/*
 * Column counts keep covers about 180–200px wide on laptops, so a full row (cover, title, price) fits the first
 * screen at 1366×768 (pages/catalogue-v2.md §2, a deviation from MASTER §4's 4 columns). "sidebar": beside the
 * filter card; "full": the whole container width (series, collection, reading list).
 */
const columns = {
  sidebar: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
  full: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
} as const;
const gridBase = "grid gap-x-3 gap-y-8 sm:gap-x-5";

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
  /** A reading order (series volumes): rendered as <ol>. */
  ordered?: boolean;
  layout?: keyof typeof columns;
  above?: (book: Book, index: number) => ReactNode;
  below?: (book: Book, index: number) => ReactNode;
  className?: string;
};

export function BookGrid({ books, loading = false, skeletonCount = 8, empty, headingLevel = "h3", instancePrefix = "grid", stale = false, ordered = false, layout = "full", above, below, className }: BookGridProps) {
  const gridClass = cn(gridBase, columns[layout]);
  const { dict } = useT();
  const cart = useAddToCart({ openDrawer: true });
  const wishlist = useWishlist();

  if (loading) {
    return (
      <SkeletonGroup label={dict.cards.loadingBooks} className={cn(gridClass, className)}>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <BookCardSkeletonFrameless key={i} />
        ))}
      </SkeletonGroup>
    );
  }

  if (books.length === 0) return <>{empty}</>;

  return (
    <Stagger
      as={ordered ? "ol" : "ul"}
      key={books.map((b) => b.id).join(",")}
      className={cn(gridClass, "transition-opacity duration-150", stale && "opacity-60", className)}
    >
      {books.map((book, index) => (
        <StaggerItem as="li" key={book.id} index={index} className="grid min-w-0 content-start gap-3 [&>*]:min-w-0">
          {above?.(book, index)}
          <BookCard
            book={book}
            instanceKey={`${instancePrefix}-${book.id}`}
            headingLevel={headingLevel}
            eager={index < 4}
            showAvailability
            saved={wishlist.isSaved(book.id)}
            adding={cart.pendingBookId === book.id}
            onAddToCart={cart.add}
            onToggleWishlist={wishlist.toggle}
          />
          {below?.(book, index)}
        </StaggerItem>
      ))}
    </Stagger>
  );
}
