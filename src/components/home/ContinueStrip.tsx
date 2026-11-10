import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { clearRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";

/*
 * Home, for returning visitors only: "Continue where you left off", a compact strip of the books they looked at
 * last (small cover, title, author), one tap back to each. Hidden when there is no history. "Clear" forgets it.
 */
export function ContinueStrip({ books }: { books: BookCard[] }) {
  const { dict } = useT();
  const h = dict.homePage;
  if (books.length === 0) return null;
  return (
    <section aria-labelledby="continue-title" className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-text">{h.yourHistory}</p>
          <h2 id="continue-title" className="mt-1 font-display text-2xl leading-tight">{h.continueTitle}</h2>
        </div>
        <button type="button" onClick={clearRecentlyViewed} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" /> {h.clear}
        </button>
      </div>
      <ul className="chip-row no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {books.slice(0, 8).map((book) => (
          <li key={book.id} className="w-64 shrink-0 snap-start">
            <Link
              to={`/books/${book.id}`}
              className="group flex h-full items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="w-14 shrink-0 overflow-hidden rounded-[3px] shadow-[0_8px_16px_-10px_rgb(20_16_10/0.6)]">
                <BookCover src={book.cover_image_url} title={book.title} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-display text-[15px] leading-snug text-foreground">{book.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
