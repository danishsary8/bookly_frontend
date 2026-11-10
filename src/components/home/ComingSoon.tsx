import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BellRing, CalendarClock } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { catalogApi } from "@/api/endpoints/catalog";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

/*
 * Home "Coming soon" (pages/home.md), from GET /catalog/upcoming, drawn as a release timeline: a hairline with one
 * node per book (the nearest release pulses), and under it a ticket per book — a tear-off calendar stub (month, day)
 * on the left, then the cover, title, author and a countdown ("In 12 days"). Pre-orders link to their page;
 * scheduled books that are not public yet show the same ticket without a link ("Announced").
 * With no upcoming books a calm placeholder panel stands in, so the section never looks broken.
 */

const ease = [0.2, 0.8, 0.2, 1] as const;
const DAY = 86_400_000;

export function ComingSoon() {
  const { dict, lang } = useT();
  const h = dict.homePage;
  const query = useQuery({ queryKey: ["catalog", "upcoming"], queryFn: catalogApi.upcoming, staleTime: 5 * 60_000 });
  const books = query.isError ? [] : (query.data ?? []).slice(0, 4);
  const locale = lang === "km" ? "km-KH" : "en-GB";
  const parts = (value?: string | null) => {
    if (!value) return null;
    const at = new Date(value);
    if (Number.isNaN(at.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      month: new Intl.DateTimeFormat(locale, { month: "short" }).format(at),
      day: new Intl.DateTimeFormat(locale, { day: "numeric" }).format(at),
      full: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(at),
      days: Math.max(0, Math.round((at.getTime() - today.getTime()) / DAY)),
    };
  };

  return (
    <section aria-labelledby="coming-soon-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.comingSoonEyebrow}
          </p>
          <h2 id="coming-soon-title" className="mt-2 font-display text-[1.953rem] leading-tight">{h.comingSoon}</h2>
        </div>
        {books.length ? (
          <Link to="/books?coming_soon=1&sort=release_soon" hidden={!books.some((b) => !b.announced)} className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
            {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.comingSoon} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-60 rounded-2xl" />)}
        </SkeletonGroup>
      ) : books.length === 0 ? (
        <div className="relative isolate grid items-center gap-6 overflow-hidden rounded-3xl border border-dashed border-input/70 bg-card/60 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
          {/* three blank "covers" waiting for their books */}
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
        <div className="relative">
          {/* the timeline: a hairline that draws in, with a node above each ticket */}
          <div className="relative mb-5 hidden h-3 lg:block" aria-hidden="true">
            <motion.span
              className="absolute inset-x-0 top-1/2 h-px origin-left bg-[linear-gradient(90deg,var(--primary),color-mix(in_srgb,var(--primary)_25%,transparent))]"
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 1.2, ease }}
            />
            <ul className={cn("relative grid h-full gap-4", books.length >= 4 ? "grid-cols-4" : books.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {books.map((book, i) => (
                <li key={book.id} className="relative">
                  <span className={cn("absolute left-[2.1rem] top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-primary bg-background", i === 0 && "timeline-now bg-primary")} />
                </li>
              ))}
            </ul>
          </div>
          <span className="sr-only">{h.releaseTimeline}</span>

          <ul className={cn("grid gap-4 sm:grid-cols-2", books.length >= 4 ? "lg:grid-cols-4" : books.length === 3 ? "lg:grid-cols-3" : "")}>
            {books.map((book, i) => {
              const when = parts(book.coming_on ?? book.publish_date);
              const body = (
                <>
                  {/* the stage: the cover stands on a soft wash of its own colours, with a mirror image below */}
                  <span className="relative isolate grid place-items-center overflow-hidden rounded-xl bg-muted/60 px-4 pb-1 pt-7">
                    {book.cover_image_url ? <img src={book.cover_image_url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full scale-150 object-cover opacity-25 blur-2xl saturate-150" /> : null}
                    {/* tear-off calendar stub */}
                    <span className="ticket-stub absolute left-3 top-3 grid w-12 justify-items-center rounded-l-md bg-primary py-1.5 text-primary-foreground shadow-sm">
                      {when ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-85">{when.month}</span>
                          <span className="font-display text-[1.45rem] leading-none tabular-nums">{when.day}</span>
                          <span className="sr-only">{h.releases(when.full)}</span>
                        </>
                      ) : (
                        <CalendarClock className="my-1 size-5 opacity-85" aria-hidden="true" />
                      )}
                    </span>
                    <span className="relative block w-[5.5rem] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:-translate-y-1.5 group-hover:-rotate-2 motion-reduce:group-hover:transform-none">
                      <BookCover src={book.cover_image_url} title={book.title} className="rounded-[4px] shadow-[0_18px_26px_-14px_rgb(20_16_10/0.65)]" />
                      {book.cover_image_url ? (
                        <span className="mirror-floor pointer-events-none absolute inset-x-0 top-full mt-[2px] block aspect-[2/3] overflow-hidden rounded-[4px]" aria-hidden="true">
                          <img src={book.cover_image_url} alt="" aria-hidden="true" className="size-full -scale-y-100 object-cover" />
                        </span>
                      ) : null}
                    </span>
                    <span className="block h-7" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col px-1 pt-3">
                    <span className="line-clamp-2 font-display text-lg leading-snug">{book.title}</span>
                    <span className="mt-0.5 truncate text-sm text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                    <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                      {when ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis-tint px-2.5 py-1 text-xs font-semibold text-primary">
                          <BellRing className="size-3.5" aria-hidden="true" /> {h.inDays(when.days)}
                        </span>
                      ) : <span />}
                      {book.announced ? (
                        <span className="text-[13px] font-medium text-muted-foreground">{h.announced}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          {dict.preorder.preorder} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                        </span>
                      )}
                    </span>
                  </span>
                </>
              );
              const card = "group flex h-full flex-col rounded-2xl border border-border bg-card p-3 pb-4";
              return (
                <motion.li
                  key={book.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, ease, delay: 0.1 * i }}
                >
                  {book.announced ? (
                    // Scheduled books are not public yet: a card without a link.
                    <div className={card}>{body}</div>
                  ) : (
                    <Link
                      to={`/books/${book.id}`}
                      className={`${card} outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-1 hover:border-input hover:shadow-[0_22px_36px_-26px_rgb(20_32_122/0.5)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0`}
                    >
                      {body}
                    </Link>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
