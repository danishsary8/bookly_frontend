import { useRef } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { BookCard } from "@/api/types";
import { authorNames } from "@/components/catalog/bookMeta";
import { ScrollProgress } from "@/components/ScrollProgress";
import { useScrollProgress } from "@/hooks/useScrollProgress";
import { formatMoney, useCurrency } from "@/stores/currency";
import { clearRecentlyViewed } from "@/stores/recentlyViewed";
import { useT } from "@/i18n";

/*
 * Home, for returning visitors only: "Continue where you left off". A heading row (with Clear and scroll arrows) and a
 * sideways strip of cards. Each card sits on a soft wash of its own cover's colours: the cover stands at the left,
 * tilted a little (it straightens and lifts on hover), then title, author, the price and a "Continue" pill.
 * Books without a cover get a cloth tile with their initial. Hidden when there is no history; "Clear" forgets it.
 */
const CLOTH = ["#14207A", "#7A2E2A", "#2F5D4A", "#8A5A3B", "#4C5378", "#1E4E5C"];

function MiniCover({ book, index }: { book: BookCard; index: number }) {
  if (book.cover_image_url) {
    return <img src={book.cover_image_url} alt="" loading="lazy" decoding="async" className="size-full object-cover" />;
  }
  return (
    <span className="grid size-full place-items-center font-display text-2xl text-[#F6EFDF]" style={{ background: CLOTH[index % CLOTH.length] }}>
      {(book.title ?? "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function ContinueStrip({ books }: { books: BookCard[] }) {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const track = useRef<HTMLUListElement>(null);
  const bar = useScrollProgress(track, [books.length]);
  if (books.length === 0) return null;
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = "grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,border-color] hover:border-input hover:bg-muted";

  return (
    <section aria-labelledby="continue-title" className="grid min-w-0 gap-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.yourHistory}
          </p>
          <h2 id="continue-title" className="mt-2 font-display text-[1.75rem] leading-tight">{h.continueTitle}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={clearRecentlyViewed} className="mr-1 inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-4" aria-hidden="true" /> {h.clear}
          </button>
          {books.length > 3 ? (
            <>
              <button type="button" onClick={() => scroll(-1)} className={arrow} aria-label={h.prevBook}>
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scroll(1)} className={arrow} aria-label={h.nextBook}>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <ul ref={track} className="shelf-row-more no-scrollbar -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-3 pt-4">
        {books.slice(0, 10).map((book, index) => (
          <li key={book.id} className="w-[19.5rem] shrink-0 snap-start">
            <Link
              to={`/books/${book.id}`}
              className="group relative isolate flex h-full items-center gap-4 overflow-hidden rounded-2xl border border-border bg-card p-4 pl-5 outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_22px_36px_-24px_rgb(20_32_122/0.5)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
            >
              {/* a soft wash of the cover's own colours behind the card */}
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute -left-6 top-1/2 -z-10 h-[180%] w-2/3 -translate-y-1/2 object-cover opacity-25 blur-2xl saturate-150" />
              ) : null}
              <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent,var(--card)_55%)]" aria-hidden="true" />
              <span className="relative aspect-[2/3] w-[4.25rem] shrink-0 -rotate-[4deg] overflow-hidden rounded-[4px] bg-muted shadow-[0_14px_22px_-12px_rgb(20_16_10/0.65)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 group-hover:rotate-0 motion-reduce:transform-none">
                <MiniCover book={book} index={index} />
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.22)_0_3%,rgb(255_255_255/0.16)_4%,transparent_10%)]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col self-stretch py-0.5">
                <span className="line-clamp-2 font-display text-[16px] leading-snug text-foreground">{book.title}</span>
                <span className="mt-0.5 truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                  <span className="text-sm font-semibold tabular-nums">{formatMoney(book.price_from_usd, book.price_from_khr, currency)}</span>
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-lapis-tint px-2.5 text-xs font-semibold text-primary transition-[background-color,color] duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    {h.continueCta} <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ScrollProgress bar={bar} />
    </section>
  );
}
