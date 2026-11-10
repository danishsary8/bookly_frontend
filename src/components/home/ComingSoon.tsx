import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { m } from "motion/react";
import { Link } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useT } from "@/i18n";

/*
 * Home "Coming soon" (pages/home.md), from GET /catalog/upcoming: a sideways-scrolling row of "premiere posters".
 * Each card is a dark lapis stage lit by its own cover's colours, the cover standing in the middle (a light sweeps
 * across it on hover), a big day countdown with the date, and underneath the title, author and Pre-order (or
 * "Announced" for scheduled books that are not public yet; those cards don't link). Arrows scroll the row; the
 * far edge fades. With no upcoming books a calm placeholder panel stands in.
 */

const ease = [0.2, 0.8, 0.2, 1] as const;
const DAY = 86_400_000;

export function ComingSoon() {
  const { dict, lang } = useT();
  const h = dict.homePage;
  const track = useRef<HTMLUListElement>(null);
  const query = useQuery({ queryKey: ["catalog", "upcoming"], queryFn: catalogApi.upcoming, staleTime: 5 * 60_000 });
  const books = query.isError ? [] : (query.data ?? []).slice(0, 12);
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
  const scroll = (dir: number) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  const arrow = "grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition-[background-color,border-color] hover:border-input hover:bg-muted";

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
              <Link to="/books?coming_soon=1&sort=release_soon" className="mr-2 inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
                {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            {books.length > 4 ? (
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
        ) : null}
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.comingSoon} className="flex gap-5 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[30rem] w-[17rem] shrink-0 rounded-3xl" />)}
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
        <ul ref={track} className="shelf-row-more no-scrollbar -mx-2 flex snap-x gap-5 overflow-x-auto px-2 pb-4 pt-1">
          {books.map((book, i) => {
            const at = when(book.coming_on ?? book.publish_date);
            const body = (
              <>
                {/* the stage */}
                <span className="premiere-stage relative isolate grid h-[19.5rem] items-start justify-items-center overflow-hidden rounded-[1.25rem] pt-12">
                  {book.cover_image_url ? <img src={book.cover_image_url} alt="" aria-hidden="true" loading="lazy" className="pointer-events-none absolute inset-0 -z-10 size-full scale-150 object-cover opacity-55 blur-2xl saturate-150" /> : null}
                  <span className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_50%_35%,transparent,rgb(10_16_60/0.85))]" aria-hidden="true" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold backdrop-blur-sm">
                    <Sparkles className="size-3" aria-hidden="true" /> {book.announced ? h.announcedShort : dict.preorder.preorder}
                  </span>
                  <span className="premiere-cover relative block w-[6.6rem] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-2 group-hover:-rotate-2 motion-reduce:transform-none">
                    <BookCover src={book.cover_image_url} title={book.title} className="rounded-[4px] shadow-[0_26px_40px_-18px_rgb(0_0_0/0.8)]" />
                    <span className="premiere-shine pointer-events-none absolute inset-0 overflow-hidden rounded-[4px]" aria-hidden="true" />
                  </span>
                  {/* the countdown */}
                  {at ? (
                    <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 rounded-2xl bg-black/35 px-4 py-2.5 text-[#F6EFDF] backdrop-blur-md">
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-display text-[2.4rem] leading-none tabular-nums">{at.days}</span>
                        <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F6EFDF]/80">{h.daysToGo(at.days)}</span>
                      </span>
                      <span className="whitespace-nowrap pb-1 text-xs font-semibold text-gold">{at.date}</span>
                      <span className="sr-only">{h.releases(at.full)}</span>
                    </span>
                  ) : null}
                </span>
                <span className="flex flex-1 flex-col px-1.5 pt-3.5">
                  <span className="line-clamp-2 font-display text-[1.15rem] leading-snug">{book.title}</span>
                  <span className="mt-0.5 truncate text-sm text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                  {book.announced ? (
                    <span className="mt-auto pt-3 text-[13px] font-medium text-muted-foreground">{h.announced}</span>
                  ) : (
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-3 text-sm font-semibold text-primary">
                      {dict.preorder.preorder} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  )}
                </span>
              </>
            );
            const card = "group flex h-full flex-col rounded-[1.6rem] border border-border bg-card p-2.5 pb-4";
            return (
              <m.li
                key={book.id}
                className="w-[17rem] shrink-0 snap-start"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.6, ease, delay: 0.08 * Math.min(i, 5) }}
              >
                {book.announced ? (
                  <div className={card}>{body}</div>
                ) : (
                  <Link
                    to={`/books/${book.id}`}
                    className={`${card} outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_26px_44px_-28px_rgb(20_32_122/0.6)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0`}
                  >
                    {body}
                  </Link>
                )}
              </m.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
