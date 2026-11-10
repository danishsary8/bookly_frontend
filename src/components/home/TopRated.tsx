import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { catalogQueries } from "@/api/endpoints/catalog";
import type { BookCard } from "@/api/types";
import { BookCover } from "@/components/catalog/BookCover";
import { authorNames, hasScore } from "@/components/catalog/bookMeta";
import { useAddToCart } from "@/components/catalog/useCatalogActions";
import { ReaderScore } from "@/components/ReaderScore";
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton";
import { formatMoney, useCurrency } from "@/stores/currency";
import { useT } from "@/i18n";

/*
 * Home "Top rated" (pages/home.md): a ranked chart, not another row of cards. No. 1 is a feature panel (large cover,
 * rating, price, add to cart); Nos. 2–5 are compact rows with a big numeral. Only books that have a rating
 * (customer reviews, or the shop's Reader rating) appear; with none, the section hides.
 */
export function TopRated() {
  const { dict } = useT();
  const h = dict.homePage;
  const currency = useCurrency();
  const cart = useAddToCart();
  const query = useQuery(catalogQueries.books({ sort: "rating", per_page: 10 }));
  const books = (query.data?.data ?? []).filter(hasScore).slice(0, 5);

  if (query.isError || (!query.isPending && books.length === 0)) return null;
  const price = (b: BookCard) => formatMoney(b.price_from_usd, b.price_from_khr, currency);
  const [first, ...rest] = books;

  return (
    <section aria-labelledby="top-rated-title" className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px w-12 bg-current" aria-hidden="true" />
            {h.topRatedEyebrow}
          </p>
          <h2 id="top-rated-title" className="mt-2 font-display text-[1.953rem] leading-tight">{h.topRatedTitle}</h2>
        </div>
        <Link to="/books?sort=rating" className="inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-[15px] font-semibold text-primary underline-offset-4 hover:underline">
          {dict.cards.seeAll} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {query.isPending ? (
        <SkeletonGroup label={h.topRatedTitle} className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Skeleton className="h-72 rounded-2xl" />
          <div className="grid gap-3">
            {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[4.25rem] rounded-xl" />)}
          </div>
        </SkeletonGroup>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* No. 1 */}
          <article className="group relative isolate flex gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6">
            {first.cover_image_url ? <img src={first.cover_image_url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-15 blur-3xl" /> : null}
            <Link to={`/books/${first.id}`} tabIndex={-1} aria-hidden="true" className="w-32 shrink-0 self-center transition-transform duration-300 group-hover:-translate-y-1 sm:w-40">
              <BookCover src={first.cover_image_url} title={first.title} eager className="rounded-md shadow-[0_24px_40px_-22px_rgb(20_16_10/0.6)]" />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-display text-5xl leading-none text-primary/25" aria-hidden="true">01</span>
              <h3 className="mt-2 font-display text-2xl leading-tight">
                <Link to={`/books/${first.id}`} className="line-clamp-2 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">{first.title}</Link>
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{h.by(authorNames(first.authors) || h.unknownAuthor)}</p>
              <ReaderScore book={first} className="mt-3" />
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                <span className="text-lg font-semibold tabular-nums">{price(first)}</span>
                {first.in_stock === false ? null : (
                  <button
                    type="button"
                    onClick={() => cart.add(first)}
                    disabled={cart.pendingBookId === first.id}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
                  >
                    <ShoppingBag className="size-4" aria-hidden="true" /> {h.addToCart}
                  </button>
                )}
              </div>
            </div>
          </article>

          {/* Nos. 2–5 */}
          <ol start={2} className="grid content-start">
            {rest.map((book, i) => (
              <li key={book.id}>
                <Link
                  to={`/books/${book.id}`}
                  className="group relative flex items-center gap-4 border-b border-border py-3 outline-none first:border-t focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="w-10 shrink-0 font-display text-3xl leading-none text-primary/25 transition-colors duration-300 group-hover:text-primary" aria-hidden="true">{String(i + 2).padStart(2, "0")}</span>
                  <span className="w-11 shrink-0"><BookCover src={book.cover_image_url} title={book.title} className="shadow-[0_8px_14px_-10px_rgb(20_16_10/0.6)]" /></span>
                  <span className="min-w-0 flex-1 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0">
                    <span className="block truncate font-display text-[17px] leading-snug">{book.title}</span>
                    <span className="block truncate text-[13px] text-muted-foreground">{authorNames(book.authors) || h.unknownAuthor}</span>
                  </span>
                  <ReaderScore book={book} className="hidden shrink-0 sm:inline-flex" />
                  <span className="w-16 shrink-0 text-right text-[15px] font-semibold tabular-nums">{price(book)}</span>
                  <span className="absolute inset-x-0 -bottom-px h-px origin-left scale-x-0 bg-primary transition-transform duration-500 ease-out group-hover:scale-x-100" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
