import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames } from "@/components/catalog/bookMeta";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { useT } from "@/i18n";

/*
 * Home "Coming soon" (pages/home.md): upcoming books as wide tickets (cover, release date, title, author, pre-order link).
 * With no upcoming books (the usual state until the shop adds some in admin) a calm placeholder panel stands in,
 * so the section never looks broken; real books replace it as soon as the API returns any.
 */
export function ComingSoon() {
  const { dict, lang } = useT();
  const h = dict.homePage;
  const query = useQuery(catalogQueries.books({ coming_soon: true, sort: "release_soon", per_page: 6 }));
  const books = query.isError ? [] : (query.data?.data ?? []);
  const date = (value?: string | null) => (value ? new Intl.DateTimeFormat(lang === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)) : null);

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
          <Link to="/books?coming_soon=1&sort=release_soon" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
            {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.comingSoon} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </SkeletonGroup>
      ) : books.length === 0 ? (
        <div className="relative isolate grid items-center gap-6 overflow-hidden rounded-2xl border border-dashed border-input/70 bg-card/60 p-6 sm:grid-cols-[auto_1fr] sm:p-8">
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                to={`/books/${book.id}`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-border bg-card p-4 outline-none transition-[border-color,box-shadow,translate] duration-300 hover:-translate-y-0.5 hover:border-input hover:shadow-[0_18px_30px_-22px_rgb(20_32_122/0.45)] focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:translate-y-0"
              >
                <span className="w-20 shrink-0"><BookCover src={book.cover_image_url} title={book.title} className="rounded-[4px] shadow-[0_14px_22px_-14px_rgb(20_16_10/0.6)]" /></span>
                <span className="min-w-0 flex-1">
                  {date(book.publish_date) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lapis-tint px-2.5 py-1 text-xs font-semibold text-primary">
                      <CalendarClock className="size-3.5" aria-hidden="true" /> {h.releases(date(book.publish_date)!)}
                    </span>
                  ) : null}
                  <span className="mt-2 line-clamp-2 block font-display text-lg leading-snug">{book.title}</span>
                  <span className="mt-0.5 block truncate text-sm text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {dict.preorder.preorder} <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
