import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { Series } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { Skeleton } from "@/components/ui/skeleton";

/*
 * One series, shown as a fanned stack of its covers in reading order beside its
 * description. Picks the series with the most books.
 */
export function SeriesSpotlight({ series }: { series: Series[] | undefined }) {
  const pick = [...(series ?? [])].sort((a, b) => (b.books_count ?? 0) - (a.books_count ?? 0))[0];
  const detail = useQuery({ ...catalogQueries.series(pick?.id ?? 0), enabled: Boolean(pick?.id) });
  if (!pick) return null;
  const books = (detail.data?.books ?? []).slice(0, 4);

  return (
    <section aria-labelledby="series-spotlight-title" className="grid items-center gap-10 overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-accent-text">
          <span className="h-px w-12 bg-current" aria-hidden="true" />
          Series spotlight
        </p>
        <h2 id="series-spotlight-title" className="mt-3 font-display text-[2.441rem] leading-tight">
          {pick.name}
        </h2>
        {pick.description ? <p className="mt-3 text-lg leading-7 text-muted-foreground">{pick.description}</p> : null}
        <p className="mt-3 text-sm font-semibold text-muted-foreground">
          {pick.books_count ?? 0} books, best read in order
        </p>
        <Link to={`/series/${pick.id}`} className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground transition-[filter] duration-150 hover:brightness-110">
          Start the series <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="lg:col-span-7">
        {detail.isPending ? (
          <Skeleton className="mx-auto h-72 w-full max-w-md rounded-xl" />
        ) : (
          <ol className="flex items-end justify-center" aria-label={`${pick.name} in reading order`}>
            {books.map((book, i) => (
              <li
                key={book.id}
                className="w-[38%] max-w-44 shrink-0 transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-2 motion-reduce:hover:translate-y-0"
                style={{ marginLeft: i === 0 ? 0 : "-9%", rotate: `${(i - (books.length - 1) / 2) * 4}deg`, zIndex: books.length - i }}
              >
                <Link to={`/books/${book.id}`} className="block rounded-[2px] shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="sr-only">
                    Book {i + 1}: {book.title}
                  </span>
                  <BookCover src={book.cover_image_url} title={book.title} />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
