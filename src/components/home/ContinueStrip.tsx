import { useCallback, useEffect, useRef, useState } from "react";
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
 * Home, for returning visitors only: "Continue where you left off". A heading row (Clear and the scroll arrows in one pill; an arrow greys out at its end) and a
 * sideways strip of cards. Each card sits on a soft wash of its own cover's colours: the cover stands at the left,
 * standing straight (it lifts on hover), then title, author, the price and a round arrow that fills on hover.
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
  // Where the strip is scrolled: greys out the arrow that can't move and fades only the edge with more books.
  const [edges, setEdges] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 12, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 12 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, books.length]);
  if (books.length === 0) return null;
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow =
    "grid size-9 place-items-center rounded-full text-foreground transition-colors hover:bg-lapis-tint hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-35";
  const scrollable = !(edges.start && edges.end);
  const fade = `linear-gradient(90deg, ${edges.start ? "#000" : "transparent"} 0, #000 2.5rem, #000 calc(100% - 4rem), ${edges.end ? "#000" : "transparent"} 100%)`;

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
        {/* One quiet control group: forget the history, then the two scroll arrows. */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-card p-1 shadow-[0_6px_18px_-14px_rgb(20_32_122/0.5)]">
          <button
            type="button"
            onClick={clearRecentlyViewed}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-3.5" aria-hidden="true" /> {h.clear}
          </button>
          {scrollable ? (
            <>
              <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
              <button type="button" onClick={() => scroll(-1)} disabled={edges.start} className={arrow} aria-label={h.prevBook}>
                <ArrowLeft className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scroll(1)} disabled={edges.end} className={arrow} aria-label={h.nextBook}>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            </>
          ) : null}
        </div>
      </div>
      <ul
        ref={track}
        onScroll={measure}
        className="shelf-row-more no-scrollbar -mx-2 flex snap-x gap-4 overflow-x-auto px-2 pb-4 pt-2"
        style={{ maskImage: fade, WebkitMaskImage: fade }}
      >
        {books.slice(0, 10).map((book, index) => (
          <li key={book.id} className="w-[18.5rem] shrink-0 snap-start">
            <Link
              to={`/books/${book.id}`}
              className="group relative isolate flex h-full items-stretch gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card p-3.5 outline-none shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_10px_24px_-20px_rgb(20_32_122/0.35)] transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_20px_36px_-24px_rgb(20_32_122/0.5)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
            >
              {/* a faint wash of the cover's own colours, kept behind the cover side only */}
              {book.cover_image_url ? (
                <img src={book.cover_image_url} alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute -left-8 top-1/2 -z-10 h-[170%] w-1/2 -translate-y-1/2 object-cover opacity-20 blur-2xl saturate-150" />
              ) : null}
              <span className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent,var(--card)_45%)]" aria-hidden="true" />
              <span className="relative aspect-[2/3] w-[4.5rem] shrink-0 self-center overflow-hidden rounded-[3px] bg-muted shadow-[0_12px_20px_-12px_rgb(20_16_10/0.6),0_0_0_1px_rgb(20_16_10/0.06)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-0.5 motion-reduce:transform-none">
                <MiniCover book={book} index={index} />
                <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.22)_0_3%,rgb(255_255_255/0.16)_4%,transparent_10%)]" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col py-1">
                <span className="line-clamp-2 font-display text-[16px] leading-snug text-foreground transition-colors group-hover:text-primary">{book.title}</span>
                <span className="mt-1 truncate text-xs text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                <span className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-[15px] font-semibold tabular-nums">{formatMoney(book.price_from_usd, book.price_from_khr, currency)}</span>
                  <span className="grid size-8 place-items-center rounded-full bg-lapis-tint text-primary transition-[background-color,color] duration-300 group-hover:bg-primary group-hover:text-primary-foreground" aria-hidden="true">
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 motion-reduce:transition-none" />
                  </span>
                </span>
              </span>
              <span className="sr-only">{h.continueCta}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ScrollProgress bar={bar} />
    </section>
  );
}
