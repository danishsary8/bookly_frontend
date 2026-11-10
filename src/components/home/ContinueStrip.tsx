import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import { authorNames } from "@/components/catalog/bookMeta";
import { clearRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";

/*
 * Home, for returning visitors only: "Continue where you left off". A light heading row and a strip of equal
 * compact cards (small cover, title, author) that scrolls sideways; each card lifts and shows an arrow on hover.
 * Books without a cover get a cloth tile with their initial. Hidden when there is no history; "Clear" forgets it.
 */
const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#8A5A3B", "#4C5378", "#1E4E5C"];

function MiniCover({ book, index }: { book: BookCard; index: number }) {
  if (book.cover_image_url) {
    return <img src={book.cover_image_url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />;
  }
  return (
    <span className="grid size-full place-items-center font-display text-xl text-[#F6EFDF]" style={{ background: CLOTH[index % CLOTH.length] }}>
      {(book.title ?? "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ContinueStrip({ books }: { books: BookCard[] }) {
  const { dict } = useT();
  const h = dict.homePage;
  if (books.length === 0) return null;
  return (
    <section aria-labelledby="continue-title" className="grid min-w-0 gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.yourHistory}
          </p>
          <h2 id="continue-title" className="mt-2 font-display text-[1.6rem] leading-tight">{h.continueTitle}</h2>
        </div>
        <button type="button" onClick={clearRecentlyViewed} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <X className="size-4" aria-hidden="true" /> {h.clear}
        </button>
      </div>
      <ul className="shelf-row-more no-scrollbar -mx-1 flex snap-x gap-3 overflow-x-auto px-1 py-1">
        {books.slice(0, 10).map((book, index) => (
          <li key={book.id} className="w-[17rem] shrink-0 snap-start">
            <Link
              to={`/books/${book.id}`}
              className="group flex h-full items-center gap-3.5 rounded-xl border border-border bg-card p-3 outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-input hover:shadow-[0_14px_26px_-20px_rgb(20_32_122/0.5)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
            >
              <span className="aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-[3px] bg-muted shadow-[0_8px_14px_-10px_rgb(20_16_10/0.6)]">
                <MiniCover book={book} index={index} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 font-display text-[15px] leading-snug text-foreground">{book.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 -translate-x-1 text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
