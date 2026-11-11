import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Pause, Play, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { Link } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Home "Coming soon" (pages/home.md; marquee since owner 2026-11-11), from GET /catalog/upcoming: premiere tickets
 * gliding past in an endless row. Each ticket has a stub (the cover on a stage lit by its own colours) torn off along
 * a perforation from the body (Pre-order or Announced, the date, title, author and a big day countdown).
 * The row pauses on hover, on keyboard focus and with the pause button (WCAG 2.2.2); the edges fade. Reduced motion:
 * no movement, the row scrolls sideways by hand. With no upcoming books a calm placeholder panel stands in.
 */

type Upcoming = BookCard & { coming_on?: string | null; announced?: boolean };

const DAY = 86_400_000;
/** At least this many tickets per loop, so one loop always covers a wide screen. */
const MIN_PER_LOOP = 8;
/** Seconds per ticket: a slow, readable glide. */
const SECONDS_PER_TICKET = 6;

export function ComingSoon() {
  const { dict, lang } = useT();
  const h = dict.homePage;
  const reduce = useReducedMotion() ?? false;
  const [paused, setPaused] = useState(false);
  const query = useQuery({ queryKey: ["catalog", "upcoming"], queryFn: catalogApi.upcoming, staleTime: 5 * 60_000 });
  const books: Upcoming[] = query.isError ? [] : (query.data ?? []).slice(0, 12);
  const locale = lang === "km" ? "km-KH" : "en-GB";
  const when = (value?: string | null) => {
    if (!value) return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      date: new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(at),
      full: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(at),
      days: Math.max(0, Math.round((at.getTime() - today.getTime()) / DAY)),
    };
  };

  // One loop = the list repeated until it is long enough; the track holds two loops and slides by one (-50%).
  const loop = books.length ? Array.from({ length: Math.ceil(MIN_PER_LOOP / books.length) }, () => books).flat() : [];
  const moving = !reduce && loop.length > 0;

  const ticket = (book: Upcoming, key: string, copy: boolean) => {
    const at = when(book.coming_on ?? book.publish_date);
    const body = (
      <>
        {/* the stub */}
        <span className="premiere-stage relative isolate grid w-[8.25rem] shrink-0 place-items-center overflow-hidden">
          {book.cover_image_url ? <img src={book.cover_image_url} alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute inset-0 -z-10 size-full scale-150 object-cover opacity-60 blur-2xl saturate-150" /> : null}
          <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_50%_40%,transparent,rgb(10_16_60/0.8))]" aria-hidden="true" />
          <span className="relative block w-[4.9rem] -rotate-3 transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1 group-hover:rotate-0 motion-reduce:transform-none">
            <BookCover src={book.cover_image_url} title={book.title} className="rounded-[3px] shadow-[0_18px_26px_-12px_rgb(0_0_0/0.85)]" />
            <span className="premiere-shine pointer-events-none absolute inset-0 overflow-hidden rounded-[3px]" aria-hidden="true" />
          </span>
        </span>
        {/* the body, past the perforation */}
        <span className="ticket-body flex min-w-0 flex-1 flex-col py-3.5 pl-5 pr-4">
          <span className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
            <span className="inline-flex items-center gap-1 text-primary">
              <Sparkles className="size-3" aria-hidden="true" /> {book.announced ? h.announcedShort : dict.preorder.preorder}
            </span>
            {at ? <span className="whitespace-nowrap normal-case tracking-normal text-muted-foreground">{at.date}</span> : null}
          </span>
          <span className="mt-1.5 line-clamp-2 font-display text-[1.08rem] leading-snug">{book.title}</span>
          <span className="mt-0.5 truncate text-[13px] text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
          <span className="mt-auto flex items-end justify-between gap-2 pt-2">
            {at ? (
              <span className="flex items-baseline gap-1.5">
                <span className="font-display text-[2rem] leading-none tabular-nums text-foreground">{at.days}</span>
                <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{h.daysToGo(at.days)}</span>
                <span className="sr-only">{h.releases(at.full)}</span>
              </span>
            ) : <span />}
            {book.announced ? null : <ArrowRight className="mb-1 size-4 text-primary transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />}
          </span>
        </span>
      </>
    );
    const shape = "ticket group flex h-[10.5rem] w-[23rem] overflow-hidden rounded-2xl";
    return (
      // The copy in the second loop is for the eye only: hidden from assistive tech and out of the tab order.
      <li key={key} className="ticket-wrap shrink-0 px-2.5" aria-hidden={copy || undefined}>
        {book.announced ? (
          <div className={shape}>{body}</div>
        ) : (
          <Link to={`/books/${book.id}`} tabIndex={copy ? -1 : undefined} className={cn(shape, "outline-none transition-[translate] duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0")}>
            {body}
          </Link>
        )}
      </li>
    );
  };

  return (
    <section aria-labelledby="coming-soon-title" className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.comingSoonEyebrow}
          </p>
          <h2 id="coming-soon-title" className="mt-2 font-display text-[1.953rem] leading-tight">{h.comingSoon}</h2>
        </div>
        {books.length ? (
          <div className="flex items-center gap-2">
            {books.some((b) => !b.announced) ? (
              <Link to="/books?coming_soon=1&sort=release_soon" className="mr-1 inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            {moving ? (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused} aria-label={paused ? h.playSlides : h.pauseSlides} className="grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,border-color] hover:border-input hover:bg-muted">
                {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.comingSoon} className="flex gap-5 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[10.5rem] w-[23rem] shrink-0 rounded-2xl" />)}
        </SkeletonGroup>
      ) : books.length === 0 ? (
        <div className="relative isolate grid items-center gap-6 overflow-hidden rounded-3xl border border-dashed border-input/70 bg-card/60 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          <div className="flex justify-center gap-3" aria-hidden="true">
            {[-6, 0, 6].map((turn, i) => (
              <span key={turn} className="coming-ghost grid h-28 w-[4.7rem] place-items-center rounded-md border border-border bg-muted/70 font-display text-2xl text-muted-foreground/50" style={{ rotate: `${turn}deg`, animationDelay: `${i * 300}ms` }}>
                ?
              </span>
            ))}
          </div>
          <div>
            <p className="flex items-center gap-2 font-display text-2xl leading-tight">
              <CalendarClock className="size-5 text-primary" aria-hidden="true" />
              {h.comingSoonEmptyTitle}
            </p>
            <p className="mt-2 max-w-prose text-[15px] text-muted-foreground">{h.comingSoonEmptyLead}</p>
            <Link to="/books?sort=newest" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted">
              {h.newArrivals} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        // Full-bleed inside the page column, so tickets glide in from the edges of the content area.
        <div className={cn("marquee -mx-2 -my-6 py-9", moving ? "overflow-hidden" : "no-scrollbar overflow-x-auto")} data-paused={paused || undefined}>
          <ul className={cn("flex w-max", moving && "marquee-track")} style={{ "--marquee-duration": `${loop.length * SECONDS_PER_TICKET}s` } as CSSProperties}>
            {/* repeats (to fill a loop) and the second loop are for the eye only */}
            {(moving ? loop : books).map((book, i) => ticket(book, `a-${book.id}-${i}`, i >= books.length))}
            {moving ? loop.map((book, i) => ticket(book, `b-${book.id}-${i}`, true)) : null}
          </ul>
        </div>
      )}
    </section>
  );
}
